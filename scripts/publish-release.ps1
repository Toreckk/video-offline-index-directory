# Runs only in the manually dispatched publication job, after reviewed artifacts exist.
# Requires PowerShell 7 and GitHub CLI. No signing keys or builds belong here.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'release-assets.ps1')

foreach ($name in @('GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'RELEASE_BUILD_RUN_ID', 'RELEASE_BUILD_RUN_ATTEMPT')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name" }
}

$manifest = Get-Content release-manifest.json | ConvertFrom-Json
if (-not $manifest.publish -or $manifest.channel -ne 'stable') { throw 'Publication is not authorized' }
$tag = "v$($manifest.version)"
$verified = Get-VerifiedReleaseAssets -Directory release-assets -Commit $env:GITHUB_SHA -Repository $env:GITHUB_REPOSITORY -Version $manifest.version
$info = $verified.info
if ([string]$info.runId -cne $env:RELEASE_BUILD_RUN_ID -or [string]$info.runAttempt -cne $env:RELEASE_BUILD_RUN_ATTEMPT) {
    throw 'Artifact provenance does not match the approved build run and attempt'
}
if ((Get-FileHash $manifest.notes).Hash -ne (Get-FileHash release-assets/RELEASE_NOTES.md).Hash) {
    throw 'Packaged release notes differ from the reviewed commit'
}
if ((Get-FileHash THIRD_PARTY_NOTICES.txt).Hash -ne (Get-FileHash release-assets/THIRD_PARTY_NOTICES.txt).Hash) {
    throw 'Packaged third-party notices differ from the reviewed commit'
}

$expectedInstallers = @($verified.installers.name)

function Read-GitHubResource([string] $resource) {
    $response = Invoke-WebRequest -Uri "https://api.github.com/repos/$env:GITHUB_REPOSITORY/$resource" -Headers @{
        Authorization = "Bearer $env:GH_TOKEN"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
    } -SkipHttpErrorCheck
    if ($response.StatusCode -eq 404) { return $null }
    if ($response.StatusCode -ne 200) { throw "GitHub lookup failed ($($response.StatusCode)): $resource" }
    return $response.Content | ConvertFrom-Json
}

function Test-DownloadedAssets([switch] $Public) {
    $downloadRoot = Join-Path ([IO.Path]::GetTempPath()) ('void-release-download-' + [guid]::NewGuid())
    New-Item -ItemType Directory $downloadRoot | Out-Null
    try {
        if ($Public) {
            # Deliberately unauthenticated: prove the published URLs serve the approved bytes.
            foreach ($name in $assetNames) {
                $url = "https://github.com/$env:GITHUB_REPOSITORY/releases/download/$tag/$name"
                Invoke-WebRequest -Uri $url -OutFile (Join-Path $downloadRoot $name) -MaximumRetryCount 3 -RetryIntervalSec 2 | Out-Null
            }
        } else {
            gh release download $tag --repo $env:GITHUB_REPOSITORY --dir $downloadRoot
            if ($LASTEXITCODE -ne 0) { throw 'Could not download the uploaded draft assets' }
        }
        foreach ($name in $assetNames) {
            if ((Get-FileHash (Join-Path $downloadRoot $name)).Hash -cne (Get-FileHash (Join-Path release-assets $name)).Hash) {
                throw "Downloaded asset hash mismatch: $name"
            }
        }
    } finally {
        $resolved = [IO.Path]::GetFullPath($downloadRoot)
        $tempPrefix = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
        if (-not $resolved.StartsWith($tempPrefix, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolved -Leaf) -notlike 'void-release-download-*') {
            throw 'Unexpected release download cleanup path'
        }
        Remove-Item -LiteralPath $resolved -Recurse -Force
    }
}

$release = Read-GitHubResource "releases/tags/$tag"
if ($release -and (-not $release.draft -or $release.target_commitish -ne $env:GITHUB_SHA)) {
    throw 'Existing release is published or its draft targets another commit'
}
$tagRef = Read-GitHubResource "git/ref/tags/$tag"
if ($tagRef) {
    # Unexpected annotated tags require investigation, never replacement.
    if (-not $release -or $tagRef.object.type -ne 'commit' -or $tagRef.object.sha -ne $env:GITHUB_SHA) {
        throw 'Existing tag is not part of a resumable draft at this exact commit'
    }
}
if (-not $release) {
    gh release create $tag --repo $env:GITHUB_REPOSITORY --target $env:GITHUB_SHA --title "VOID $tag" --notes-file release-assets/RELEASE_NOTES.md --draft
    if ($LASTEXITCODE -ne 0) { throw 'Failed to create draft release' }
}
# Refuse stale extras in a partially uploaded draft; do not silently delete them.
$assetNames = @($expectedInstallers) + @('SHA256SUMS.txt', 'build-info.json', 'THIRD_PARTY_NOTICES.txt')
$draft = Read-GitHubResource "releases/tags/$tag"
if (-not $draft -or -not $draft.draft) { throw 'Expected an unpublished draft' }
foreach ($asset in $draft.assets) {
    if ($asset.name -cnotin $assetNames) { throw "Unexpected draft asset: $($asset.name)" }
}
foreach ($name in $assetNames) {
    gh release upload $tag (Join-Path release-assets $name) --repo $env:GITHUB_REPOSITORY --clobber
    if ($LASTEXITCODE -ne 0) { throw "Failed to upload $name" }
}
$draft = Read-GitHubResource "releases/tags/$tag"
if (-not $draft -or -not $draft.draft -or $draft.target_commitish -ne $env:GITHUB_SHA -or @($draft.assets).Count -ne $assetNames.Count) {
    throw 'Draft verification failed before publication'
}
foreach ($name in $assetNames) {
    $asset = @($draft.assets | Where-Object name -CEQ $name)
    if ($asset.Count -ne 1 -or $asset[0].size -ne (Get-Item (Join-Path release-assets $name)).Length) {
        throw "Uploaded asset verification failed: $name"
    }
}
Test-DownloadedAssets
gh release edit $tag --repo $env:GITHUB_REPOSITORY --draft=false
if ($LASTEXITCODE -ne 0) { throw 'Failed to publish release' }
$published = Read-GitHubResource "releases/tags/$tag"
$publishedTag = Read-GitHubResource "git/ref/tags/$tag"
if (-not $published -or $published.draft -or -not $publishedTag -or $publishedTag.object.sha -ne $env:GITHUB_SHA) {
    throw 'Post-publication release/tag verification failed; investigate without replacing public assets'
}
Test-DownloadedAssets -Public
Write-Output "Published $tag from $env:GITHUB_SHA"
if ($env:GITHUB_STEP_SUMMARY) {
    "### Published and download-verified $tag" >> $env:GITHUB_STEP_SUMMARY
    "Commit: $env:GITHUB_SHA. Build: $env:RELEASE_BUILD_RUN_ID, attempt $env:RELEASE_BUILD_RUN_ATTEMPT." >> $env:GITHUB_STEP_SUMMARY
    "Both installers, checksums, provenance and third-party notices matched independent draft and public downloads." >> $env:GITHUB_STEP_SUMMARY
    Get-Content release-assets/SHA256SUMS.txt >> $env:GITHUB_STEP_SUMMARY
}
