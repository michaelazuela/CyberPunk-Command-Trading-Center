param(
  [switch]$Apply
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetServices = @('scanner', 'candle-recorder')

function Write-Info {
  param([string]$Message)
  Write-Host "[quant-desk-runtime] $Message"
}

function Invoke-RuntimeAudit {
  Push-Location $Root
  try {
    $auditOutput = & npm.cmd run --silent supervisor:audit 2>&1
    $auditText = ($auditOutput | Out-String).Trim()
    if ([string]::IsNullOrWhiteSpace($auditText)) {
      throw 'Runtime audit returned no output.'
    }
    if (-not $auditText.StartsWith('{')) {
      throw "Runtime audit did not return JSON. Output: $auditText"
    }
    return $auditText | ConvertFrom-Json
  } finally {
    Pop-Location
  }
}

function Get-ProcessIdList {
  param($Value)
  if ($null -eq $Value) {
    return @()
  }
  return @($Value) |
    Where-Object { $null -ne $_ -and "$_".Trim() -ne '' } |
    ForEach-Object { [int]$_ }
}

$Mode = if ($Apply) { 'APPLY' } else { 'PREVIEW' }
Write-Info "Mode: $Mode"
Write-Info 'Boundary: scanner/recorder external duplicate cleanup only. No startup, no restart, no Discord, no trading logic changes.'

$audit = Invoke-RuntimeAudit

$ownedPids = [System.Collections.Generic.HashSet[int]]::new()
foreach ($service in @($audit.services)) {
  foreach ($processId in Get-ProcessIdList $service.processTreePids) {
    [void]$ownedPids.Add($processId)
  }
}

$targets = @()
foreach ($service in @($audit.services)) {
  if ($TargetServices -notcontains [string]$service.id) {
    continue
  }

  foreach ($processId in Get-ProcessIdList $service.externalPids) {
    if ($ownedPids.Contains($processId)) {
      Write-Info "Skipping PID $processId for $($service.id); it is inside the supervisor-owned process tree."
      continue
    }
    $targets += [pscustomobject]@{
      Service = [string]$service.id
      Pid = $processId
    }
  }
}

$targets = @($targets | Sort-Object Service, Pid -Unique)

if ($targets.Count -eq 0) {
  Write-Info 'No external duplicate scanner/recorder processes found.'
  Write-Info "Audit status: $($audit.summary.status); duplicateProcessesDetected=$($audit.summary.duplicateProcessesDetected)"
  exit 0
}

Write-Info 'External duplicate scanner/recorder processes detected:'
foreach ($target in $targets) {
  Write-Info "  service=$($target.Service) pid=$($target.Pid)"
}

if (-not $Apply) {
  Write-Info 'Preview only. No processes were stopped.'
  Write-Info 'Re-run with -Apply to stop only the listed external duplicate scanner/recorder PIDs.'
  exit 0
}

foreach ($target in $targets) {
  $process = Get-Process -Id $target.Pid -ErrorAction SilentlyContinue
  if ($null -eq $process) {
    Write-Info "PID $($target.Pid) for $($target.Service) is no longer running; skipped."
    continue
  }
  Write-Info "Stopping external duplicate $($target.Service) PID $($target.Pid)."
  Stop-Process -Id $target.Pid -Force
}

$after = Invoke-RuntimeAudit
Write-Info "Post-cleanup audit status: $($after.summary.status); duplicateProcessesDetected=$($after.summary.duplicateProcessesDetected)"

if ($after.summary.duplicateProcessesDetected) {
  Write-Info 'Cleanup completed, but duplicate risk is still reported. Review supervisor audit before taking more action.'
  exit 1
}

Write-Info 'Duplicate cleanup completed cleanly.'
