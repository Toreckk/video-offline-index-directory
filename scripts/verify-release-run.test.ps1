# Offline preflight tests: no GitHub requests or writes.
$ErrorActionPreference = 'Stop'
$preflight = Join-Path $PSScriptRoot 'verify-release-run.ps1'
$keys = @('GH_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_SHA', 'GITHUB_REF', 'RELEASE_BUILD_RUN_ID', 'RELEASE_EXPECTED_SHA', 'GITHUB_OUTPUT')
$saved = @{}
foreach ($key in $keys) { $saved[$key] = [Environment]::GetEnvironmentVariable($key) }
function Invoke-WebRequest {
    param($Uri, $Headers, [switch]$SkipHttpErrorCheck)
    $body = if ($Uri -like '*/artifacts?*') { $case.artifacts } elseif ($Uri -like '*/ci.yml/runs?*') { $case.ci } else { $case.run }
    return @{StatusCode = $case.status; Content = ($body | ConvertTo-Json -Depth 10)}
}
try {
    $env:GH_TOKEN = 'offline'
    $env:GITHUB_REPOSITORY = 'test/void'
    $env:GITHUB_SHA = 'a' * 40
    $env:GITHUB_OUTPUT = ''
    foreach ($mode in @('valid', 'branch', 'sha', 'run-id', 'wrong-workflow', 'candidate', 'fork', 'wrong-sha', 'failed', 'running', 'ci-missing', 'ci-wrong-sha', 'newer-ci-failed', 'expired', 'missing-artifact', 'lookup-error')) {
        $env:GITHUB_REF = 'refs/heads/master'
        $env:RELEASE_EXPECTED_SHA = $env:GITHUB_SHA
        $env:RELEASE_BUILD_RUN_ID = '1234'
        $case = @{
            status = 200
            run = @{repository = @{full_name = 'test/void'}; head_repository = @{full_name = 'test/void'}; path = '.github/workflows/release.yml'; event = 'push'; head_branch = 'master'; head_sha = $env:GITHUB_SHA; status = 'completed'; conclusion = 'success'; run_attempt = 1}
            ci = @{workflow_runs = @(@{id = 1; head_branch = 'master'; head_sha = $env:GITHUB_SHA; status = 'completed'; conclusion = 'success'})}
            artifacts = @{artifacts = @(@{name = "windows-release-$env:GITHUB_SHA"; expired = $false})}
        }
        $expected = switch ($mode) {
            'branch' { $env:GITHUB_REF = 'refs/heads/release/v1.2.3'; 'exact approved SHA' }
            'sha' { $env:RELEASE_EXPECTED_SHA = 'b' * 40; 'exact approved SHA' }
            'run-id' { $env:RELEASE_BUILD_RUN_ID = '1234/../'; 'positive integer' }
            'wrong-workflow' { $case.run.path = '.github/workflows/other.yml'; 'Build must' }
            'candidate' { $case.run.head_branch = 'release/v1.2.3'; 'Build must' }
            'fork' { $case.run.head_repository.full_name = 'fork/void'; 'Build must' }
            'wrong-sha' { $case.run.head_sha = 'b' * 40; 'Build must' }
            'failed' { $case.run.conclusion = 'failure'; 'Build must' }
            'running' { $case.run.status = 'in_progress'; 'Build must' }
            'ci-missing' { $case.ci.workflow_runs = @(); 'CI has not passed' }
            'ci-wrong-sha' { $case.ci.workflow_runs[0].head_sha = 'b' * 40; 'CI has not passed' }
            'newer-ci-failed' { $case.ci.workflow_runs += @{id = 2; head_branch = 'master'; head_sha = $env:GITHUB_SHA; status = 'completed'; conclusion = 'failure'}; 'CI has not passed' }
            'expired' { $case.artifacts.artifacts[0].expired = $true; 'unexpired artifact' }
            'missing-artifact' { $case.artifacts.artifacts = @(); 'unexpired artifact' }
            'lookup-error' { $case.status = 403; 'lookup failed' }
        }
        $caught = $null
        try { & $preflight | Out-Null } catch { $caught = $_.Exception.Message }
        if ($mode -eq 'valid') {
            if ($caught) { throw "Case ${mode}: $caught" }
        } elseif (-not $caught -or $caught -notlike "*$expected*") { throw "Case ${mode}: expected '$expected', got '$caught'" }
        Write-Output "PASS release preflight: $mode"
    }
} finally {
    foreach ($key in $keys) { [Environment]::SetEnvironmentVariable($key, $saved[$key]) }
}
