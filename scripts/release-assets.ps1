# Shared offline verification for QA and publication. Does not install or execute assets.
function Get-VerifiedReleaseAssets {
    param(
        [Parameter(Mandatory)][string] $Directory,
        [Parameter(Mandatory)][string] $Commit,
        [Parameter(Mandatory)][string] $Repository,
        [string] $Version
    )
    $info = Get-Content (Join-Path $Directory 'build-info.json') -Raw | ConvertFrom-Json
    if ($info.commit -cne $Commit -or $info.repository -cne $Repository -or
        ($Version -and $info.version -cne $Version) -or $info.version -cnotmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$') {
        throw 'Artifact provenance does not match this release commit, version, and repository'
    }
    $expectedNames = @("VOID_$($info.version)_x64-setup.exe", "VOID_$($info.version)_x64_en-US.msi")
    $checksums = @(Get-Content (Join-Path $Directory 'SHA256SUMS.txt'))
    if ($checksums.Count -ne 2) { throw 'Expected two installer checksums' }
    $verifiedNames = @()
    $installers = @()
    foreach ($line in $checksums) {
        if ($line -cnotmatch '^([a-f0-9]{64})  (.+)$') { throw 'Invalid checksum entry' }
        $hash = $Matches[1]
        $name = $Matches[2]
        if ($name -cnotin $expectedNames -or $name -cin $verifiedNames) { throw 'Unexpected or repeated installer name' }
        $path = Join-Path $Directory $name
        if ((Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant() -cne $hash) { throw "Checksum mismatch: $name" }
        $verifiedNames += $name
        $installers += [pscustomobject]@{name = $name; sha256 = $hash; bytes = (Get-Item $path).Length}
    }
    return [pscustomobject]@{info = $info; installers = $installers}
}
