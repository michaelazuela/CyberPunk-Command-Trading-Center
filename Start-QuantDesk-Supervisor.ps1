$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Logs = Join-Path $Root 'logs\supervisor'
New-Item -ItemType Directory -Force -Path $Logs | Out-Null

function Import-UserDiscordEnvironment {
  foreach ($key in @(
    'QUANT_DESK_SCANNER_WEBHOOK_URL',
    'SCANNER_DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL',
    'SUPERVISOR_DISCORD_WEBHOOK_URL',
    'QUANT_DESK_HEALTH_WEBHOOK_URL',
    'SYSTEM_ALERTS_DISCORD_WEBHOOK_URL',
    'QUANT_DESK_SYSTEM_ALERTS_WEBHOOK_URL'
  )) {
    if ([string]::IsNullOrWhiteSpace([Environment]::GetEnvironmentVariable($key, 'Process'))) {
      $userValue = [Environment]::GetEnvironmentVariable($key, 'User')
      if (-not [string]::IsNullOrWhiteSpace($userValue)) {
        [Environment]::SetEnvironmentVariable($key, $userValue, 'Process')
      }
    }
  }
}

Import-UserDiscordEnvironment

Push-Location $Root
try {
  $status = $null
  try {
    $status = Invoke-RestMethod -Uri 'http://127.0.0.1:8797/status' -Method Get -TimeoutSec 2
  } catch {
    $status = $null
  }

  if ($status) {
    Write-Host "Quant Desk Supervisor is already running on http://127.0.0.1:8797/status"
    exit 0
  }

  $stdout = Join-Path $Logs 'supervisor.stdout.log'
  $stderr = Join-Path $Logs 'supervisor.stderr.log'
  Start-Process -FilePath 'npm.cmd' `
    -ArgumentList @('run', 'supervisor:start') `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr | Out-Null

  Write-Host "Quant Desk Supervisor starting hidden."
  Write-Host "Status: http://127.0.0.1:8797/status"
  Write-Host "Logs: $Logs"
} finally {
  Pop-Location
}
