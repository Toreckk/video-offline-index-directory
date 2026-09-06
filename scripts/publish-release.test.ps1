# Offline integration tests: both network and gh are mocked; only disposable files are used.
$ErrorActionPreference = 'Stop'
$publisherPath = Join-Path $PSScriptRoot 'publish-release.ps1'
$testRoot = Join-Path ([IO.Path]::GetTempPath()) ('void-publisher-test-' + [guid]::NewGuid())
New-Item -ItemType Directory $testRoot | Out-Null
$savedEnvironment = @{}
foreach ($key in @('GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA')) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key) }

function Invoke-WebRequest {
    param($Uri, $Headers, [switch]$SkipHttpErrorCheck)
    if ($caseState.mode -eq 'lookup-error') { return @{ StatusCode = 403; Content = '{}' } }
    $value = if ($Uri -match '/releases/tags/') { $caseState.release } else { $caseState.tag }
    return @{ StatusCode = $(if ($null -eq $value) { 404 } else { 200 }); Content = ($value | ConvertTo-Json -Depth 10) }
}

function gh {
    $global:LASTEXITCODE = 0
    $caseState.calls.Add(($args -join ' '))
    switch ($args[1]) {
        'create' { $caseState.release = @{ draft = $true; target_commitish = 'abc123'; assets = @() } }
        'upload' {
            if ($caseState.mode -eq 'upload-error') { $global:LASTEXITCODE = 1; return }
            $file = Get-Item $args[3]
            $caseState.release.assets = @($caseState.release.assets | Where-Object name -NE $file.Name) + @(@{name = $file.Name; size = $file.Length})
        }
        'edit' {
            if ($caseState.mode -eq 'publish-error') { $global:LASTEXITCODE = 1; return }
            $caseState.release.draft = $false
            $caseState.tag = @{ object = @{type = 'commit'; sha = 'abc123'} }
        }
        default { throw 'Unexpected gh command in test' }
    }
}

try {
    $env:GH_TOKEN = 'offline-test-token'
    $env:GITHUB_REPOSITORY = 'test/void'
    $env:GITHUB_SHA = 'abc123'
    foreach ($mode in @('fresh', 'resume', 'published', 'wrong-draft', 'wrong-tag', 'lookup-error', 'tampered', 'wrong-provenance', 'upload-error', 'publish-error', 'extra-asset')) {
        $caseRoot = Join-Path $testRoot $mode
        New-Item -ItemType Directory (Join-Path $caseRoot 'release-assets') -Force | Out-Null
        Push-Location $caseRoot
        try {
            $caseState = @{mode = $mode; release = $null; tag = $null; calls = [Collections.Generic.List[string]]::new()}
            @{version = '1.2.3'; publish = $true; channel = 'stable'; notes = 'notes.md'} | ConvertTo-Json | Set-Content release-manifest.json
            '# VOID v1.2.3' | Set-Content notes.md
            Copy-Item notes.md release-assets/RELEASE_NOTES.md
            @{version = '1.2.3'; commit = $(if ($mode -eq 'wrong-provenance') {'other'} else {'abc123'}); repository = 'test/void'} | ConvertTo-Json | Set-Content release-assets/build-info.json
            foreach ($name in @('VOID_1.2.3_x64-setup.exe', 'VOID_1.2.3_x64_en-US.msi')) { 'synthetic installer bytes' | Set-Content (Join-Path release-assets $name) }
            Get-ChildItem release-assets -File | Where-Object Extension -In '.exe', '.msi' | ForEach-Object {
                "$((Get-FileHash $_.FullName).Hash.ToLowerInvariant())  $($_.Name)"
            } | Set-Content release-assets/SHA256SUMS.txt
            if ($mode -eq 'tampered') { 'changed' | Set-Content release-assets/VOID_1.2.3_x64-setup.exe }
            if ($mode -in 'resume', 'published', 'wrong-draft', 'wrong-tag', 'extra-asset') {
                $caseState.release = @{draft = ($mode -ne 'published'); target_commitish = $(if ($mode -eq 'wrong-draft') {'other'} else {'abc123'}); assets = @()}
            }
            if ($mode -eq 'wrong-tag') { $caseState.tag = @{object = @{type = 'commit'; sha = 'other'}} }
            if ($mode -eq 'extra-asset') { $caseState.release.assets = @(@{name = 'unexpected.exe'; size = 1}) }
            $caught = $null
            try { & $publisherPath | Out-Null } catch { $caught = $_.Exception.Message }
            if ($mode -in 'fresh', 'resume') {
                if ($caught) { throw "Case ${mode}: $caught" }
                if ($caseState.release.draft -or $caseState.release.assets.Count -ne 4) { throw "Case ${mode}: missing public assets" }
                if ($mode -eq 'resume' -and ($caseState.calls -match 'release create')) { throw 'Resume recreated the release' }
            } else {
                $expected = switch ($mode) {
                    'published' { 'Existing release' }
                    'wrong-draft' { 'Existing release' }
                    'wrong-tag' { 'Existing tag' }
                    'lookup-error' { 'GitHub lookup failed' }
                    'tampered' { 'Checksum mismatch' }
                    'wrong-provenance' { 'Artifact provenance' }
                    'upload-error' { 'Failed to upload' }
                    'publish-error' { 'Failed to publish' }
                    'extra-asset' { 'Unexpected draft asset' }
                }
                if (-not $caught -or $caught -notlike "*$expected*") { throw "Case ${mode}: expected '$expected', got '$caught'" }
                if ($mode -notin 'upload-error', 'publish-error' -and $caseState.calls.Count -ne 0) { throw "Case ${mode}: mutated release before rejecting" }
            }
            Write-Output "PASS publisher: $mode"
        } finally { Pop-Location }
    }
} finally {
    foreach ($key in $savedEnvironment.Keys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key]) }
    $resolvedTestRoot = [IO.Path]::GetFullPath($testRoot)
    $resolvedTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath()).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $resolvedTestRoot.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $resolvedTestRoot -Leaf) -notlike 'void-publisher-test-*') { throw 'Unexpected test cleanup path' }
    Remove-Item -LiteralPath $resolvedTestRoot -Recurse -Force
}
