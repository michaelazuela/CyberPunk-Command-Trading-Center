param(
  [switch]$NoAutoStart
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TrayScript = Join-Path $Root 'QuantDeskSupervisorTray.ps1'
$LogsDir = Join-Path $Root 'logs\supervisor'
$TrayLogPath = Join-Path $LogsDir 'tray.log'

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
