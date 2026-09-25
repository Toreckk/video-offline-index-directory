# Read-only publication preflight. Inputs are environment variables, never shell code.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

foreach ($name in @('GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'RELEASE_BUILD_RUN_ID', 'RELEASE_EXPECTED_SHA')) {
    if (-not [Environment]::GetEnvironmentVariable($name)) { throw "Missing $name" }
}
if ($env:GITHUB_REF -ne 'refs/heads/master' -or $env:RELEASE_EXPECTED_SHA -cnotmatch '^[a-f0-9]{40}$' -or $env:RELEASE_EXPECTED_SHA -cne $env:GITHUB_SHA) {
    throw 'Publication must be dispatched on master at the exact approved SHA'
}
if ($env:RELEASE_BUILD_RUN_ID -notmatch '^[1-9][0-9]*$') { throw 'Build run ID must be a positive integer' }

function Read-ReleaseApi([string] $resource) {
    $response = Invoke-WebRequest -Uri "https://api.github.com/repos/$env:GITHUB_REPOSITORY/$resource" -Headers @{
        Authorization = "Bearer $env:GH_TOKEN"
        Accept = 'application/vnd.github+json'
        'X-GitHub-Api-Version' = '2022-11-28'
    } -SkipHttpErrorCheck
    if ($response.StatusCode -ne 200) { throw "Release preflight lookup failed ($($response.StatusCode)): $resource" }
    return $response.Content | ConvertFrom-Json
}

$run = Read-ReleaseApi "actions/runs/$env:RELEASE_BUILD_RUN_ID"
if ($run.repository.full_name -cne $env:GITHUB_REPOSITORY -or $run.head_repository.full_name -cne $env:GITHUB_REPOSITORY -or
    $run.path -cne '.github/workflows/release.yml' -or $run.event -cne 'push' -or $run.head_branch -cne 'master' -or
    $run.head_sha -cne $env:GITHUB_SHA -or $run.status -cne 'completed' -or $run.conclusion -cne 'success') {
    throw 'Build must be a successful completed release.yml push on master at the approved SHA'
}

# Packaging and ordinary CI run independently after merge. Both must be green.
$ci = Read-ReleaseApi "actions/workflows/ci.yml/runs?head_sha=$env:GITHUB_SHA&event=push&per_page=100"
$latestCi = @($ci.workflow_runs | Where-Object {
    $_.head_sha -ceq $env:GITHUB_SHA -and $_.head_branch -ceq 'master'
} | Sort-Object -Property id -Descending | Select-Object -First 1)
if ($latestCi.Count -eq 0 -or $latestCi[0].status -cne 'completed' -or $latestCi[0].conclusion -cne 'success') {
    throw 'CI has not passed on the approved master SHA'
}

$artifacts = Read-ReleaseApi "actions/runs/$env:RELEASE_BUILD_RUN_ID/artifacts?per_page=100"
$artifact = @($artifacts.artifacts | Where-Object { $_.name -ceq "windows-release-$env:GITHUB_SHA" })
if ($artifact.Count -ne 1 -or $artifact[0].expired) { throw 'Expected one unexpired artifact for the approved SHA' }
if ($env:GITHUB_OUTPUT) { "run_attempt=$($run.run_attempt)" >> $env:GITHUB_OUTPUT }
Write-Output "Verified build $env:RELEASE_BUILD_RUN_ID (attempt $($run.run_attempt)) and CI at $env:GITHUB_SHA"
