# Runs only in the protected publication job, after candidate artifacts exist.
# Requires PowerShell 7 and GitHub CLI. No signing keys or builds belong here.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

foreach ($name in @('GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name" }
}

$manifest = Get-Content release-manifest.json | ConvertFrom-Json
if (-not $manifest.publish -or $manifest.channel -ne 'stable') { throw 'Publication is not authorized' }
$tag = "v$($manifest.version)"
$info = Get-Content release-assets/build-info.json | ConvertFrom-Json
if ($info.commit -ne $env:GITHUB_SHA -or $info.version -ne $manifest.version -or $info.repository -ne $env:GITHUB_REPOSITORY) {
    throw 'Artifact provenance does not match this release commit, version, and repository'
}
if ((Get-FileHash $manifest.notes).Hash -ne (Get-FileHash release-assets/RELEASE_NOTES.md).Hash) {
    throw 'Packaged release notes differ from the reviewed commit'
}

$expectedInstallers = @("VOID_$($manifest.version)_x64-setup.exe", "VOID_$($manifest.version)_x64_en-US.msi")
$checksums = @(Get-Content release-assets/SHA256SUMS.txt)
if ($checksums.Count -ne 2) { throw 'Expected two installer checksums' }
$verifiedNames = @()
foreach ($line in $checksums) {
    if ($line -notmatch '^([a-f0-9]{64})  (.+)$') { throw 'Invalid checksum entry' }
    $expectedHash = $Matches[1]
    $fileName = $Matches[2]
    if ($fileName -cnotin $expectedInstallers -or $fileName -cin $verifiedNames) { throw 'Unexpected or repeated installer name' }
    if ((Get-FileHash (Join-Path release-assets $fileName) -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expectedHash) {
        throw "Checksum mismatch: $fileName"
    }
    $verifiedNames += $fileName
}

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
$assetNames = @($expectedInstallers) + @('SHA256SUMS.txt', 'build-info.json')
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
gh release edit $tag --repo $env:GITHUB_REPOSITORY --draft=false
if ($LASTEXITCODE -ne 0) { throw 'Failed to publish release' }
$published = Read-GitHubResource "releases/tags/$tag"
$publishedTag = Read-GitHubResource "git/ref/tags/$tag"
if (-not $published -or $published.draft -or -not $publishedTag -or $publishedTag.object.sha -ne $env:GITHUB_SHA) {
    throw 'Post-publication release/tag verification failed; investigate without replacing public assets'
}
Write-Output "Published $tag from $env:GITHUB_SHA"
