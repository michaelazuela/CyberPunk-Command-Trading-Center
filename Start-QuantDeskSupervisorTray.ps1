param(
  [switch]$NoAutoStart
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TrayScript = Join-Path $Root 'QuantDeskSupervisorTray.ps1'
$LogsDir = Join-Path $Root 'logs\supervisor'
$TrayLogPath = Join-Path $LogsDir 'tray.log'

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

function Write-TrayLauncherLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [hashtable]$Details = @{}
  )

  New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
  $entry = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    message = $Message
    details = $Details
  }
  Add-Content -Path $TrayLogPath -Value ($entry | ConvertTo-Json -Compress -Depth 4)
}

Import-UserDiscordEnvironment

$existingTrayProcesses = @(Get-CimInstance Win32_Process | Where-Object {
  $_.Name -ieq 'powershell.exe' -and
  $_.ProcessId -ne $PID -and
  $_.CommandLine -like "*$TrayScript*"
})

foreach ($process in $existingTrayProcesses) {
  Stop-Process -Id $process.ProcessId -Force
}

if ($existingTrayProcesses.Count -gt 0) {
  Write-TrayLauncherLog -Message 'Existing supervisor tray process replaced before launch.' -Details @{
    replacedPids = @($existingTrayProcesses | ForEach-Object { $_.ProcessId })
  }
}

$arguments = @(
  '-NoProfile',
  '-ExecutionPolicy', 'Bypass',
  '-STA',
  '-WindowStyle', 'Hidden',
  '-File', "`"$TrayScript`""
)

if ($NoAutoStart) {
  $arguments += '-NoAutoStart'
}

Start-Process -FilePath 'powershell.exe' `
  -ArgumentList $arguments `
  -WorkingDirectory $Root `
  -WindowStyle Hidden | Out-Null

Write-TrayLauncherLog -Message 'Supervisor tray launch requested.' -Details @{
  trayScript = $TrayScript
  noAutoStart = [bool]$NoAutoStart
}
