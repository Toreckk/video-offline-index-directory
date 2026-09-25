param(
    [Parameter(Mandatory, Position = 0)][string] $AssetsDirectory,
    [Parameter(Mandatory, Position = 1)][ValidatePattern('^[a-f0-9]{40}$')][string] $ExpectedCommit
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
. (Join-Path $PSScriptRoot 'release-assets.ps1')
$repository = 'Toreckk/video-offline-index-directory'
$verified = Get-VerifiedReleaseAssets -Directory $AssetsDirectory -Commit $ExpectedCommit -Repository $repository
$windows = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'
$webView = @(
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients',
    'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients',
    'HKCU:\SOFTWARE\Microsoft\EdgeUpdate\Clients'
) | ForEach-Object {
    Get-ChildItem $_ -ErrorAction SilentlyContinue | Get-ItemProperty -ErrorAction SilentlyContinue |
        Where-Object { $_.PSObject.Properties['name'] -and $_.name -like '*WebView2*' } |
        Select-Object -ExpandProperty pv
} | Sort-Object -Unique
$record = [ordered]@{
    version = $verified.info.version
    commit = $ExpectedCommit
    buildRun = "https://github.com/$repository/actions/runs/$($verified.info.runId)"
    runAttempt = $verified.info.runAttempt
    recordedAt = [DateTime]::UtcNow.ToString('o')
    windowsBuild = "$($windows.CurrentBuild).$($windows.UBR)"
    windowsDisplayVersion = $windows.DisplayVersion
    webView2 = @($webView)
    checksums = 'passed'
    installers = @($verified.installers | ForEach-Object {
        [ordered]@{name = $_.name; sha256 = $_.sha256; bytes = $_.bytes; installedSmoke = 'pending'; notes = ''}
    })
    tester = ''
    scope = 'License notice, install, launch/playback, saved organization after restart, close; repeat wider QA only for relevant changes.'
}
$directory = Join-Path $PSScriptRoot '../artifacts/release-qa'
New-Item -ItemType Directory -Force $directory | Out-Null
$path = Join-Path $directory ("v$($verified.info.version)-$($ExpectedCommit.Substring(0, 7))-" + [guid]::NewGuid().ToString('N') + '.json')
$record | ConvertTo-Json -Depth 6 | Set-Content $path -Encoding utf8
Write-Output "Installer checksums verified. QA record: $([IO.Path]::GetFullPath($path))"
Write-Output 'Fill tester, installedSmoke and notes after testing each format. No installer was executed and no runtime result was assumed.'
