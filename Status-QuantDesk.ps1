$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $Root
try {
  Write-Host "Quant Desk Runtime Status"
  Write-Host "========================="
  Write-Host ""

  npm run supervisor:status

  Write-Host ""
  Write-Host "Runtime Ownership Summary"
  Write-Host "========================="

  $auditOutput = & npm.cmd run --silent supervisor:audit 2>&1
  $auditText = ($auditOutput | Out-String).Trim()
  if ([string]::IsNullOrWhiteSpace($auditText) -or -not $auditText.StartsWith('{')) {
    Write-Warning "Runtime audit did not return parseable JSON. Run npm run supervisor:audit for details."
    return
  }

  $audit = $auditText | ConvertFrom-Json
  Write-Host "Supervisor: $(if ($audit.supervisor.running) { 'running' } else { 'not running' }) PID=$($audit.supervisor.pid)"
  Write-Host "Startup task: $(if ($audit.startupTask.healthy) { 'healthy' } else { 'needs attention' }) state=$($audit.startupTask.state)"
  Write-Host "Bridge: $(if ($audit.summary.bridgeReachable) { 'reachable' } else { 'not reachable' })"
  Write-Host "Duplicate scanner/recorder processes: $(if ($audit.summary.duplicateProcessesDetected) { 'detected' } else { 'none detected' })"

  foreach ($service in @($audit.services)) {
    if (@('scanner', 'candle-recorder') -notcontains [string]$service.id) {
      continue
    }
    $external = @($service.externalPids)
    $ownedTree = @($service.processTreePids)
    Write-Host " - $($service.id): status=$($service.status), ownedPid=$($service.ownedPid), ownedTreePids=$($ownedTree.Count), externalDuplicatePids=$($external.Count)"
  }

  if ($audit.summary.duplicateProcessesDetected) {
    Write-Host ""
    Write-Warning "External duplicate scanner/recorder process detected. Preview cleanup with npm run supervisor:repair. Apply only after review: .\Repair-QuantDesk-Runtime.ps1 -Apply"
  }

  if ($audit.health.recorderHeartbeatStatus -and $audit.health.recorderHeartbeatStatus -ne 'ok') {
    Write-Host ""
    Write-Warning "Recorder heartbeat is $($audit.health.recorderHeartbeatStatus). This is data freshness/bridge health, not duplicate process ownership."
  }

  if ($audit.summary.status -eq 'ok') {
    Write-Host ""
    Write-Host "Runtime status: OK. No operator action needed."
  } else {
    Write-Host ""
    Write-Host "Runtime status: $($audit.summary.status). Recommended action: $($audit.summary.recommendedAction)"
  }
} finally {
  Pop-Location
}
