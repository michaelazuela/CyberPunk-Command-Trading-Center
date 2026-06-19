param(
  [string]$TaskName = 'Quant Desk Local Supervisor',
  [switch]$NoAutoStart,
  [switch]$StartNow
)

$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Launcher = Join-Path $Root 'Launch-QuantDeskSupervisorTray.vbs'
$StatusScript = Join-Path $Root 'Status-QuantDesk.ps1'

if (-not (Test-Path $Launcher)) {
  throw "Missing launcher: $Launcher"
}

$wscript = Join-Path $env:SystemRoot 'System32\wscript.exe'
if (-not (Test-Path $wscript)) {
  throw "Missing Windows Script Host executable: $wscript"
}

$argument = "`"$Launcher`""
if ($NoAutoStart) {
  $trayScript = Join-Path $Root 'Start-QuantDeskSupervisorTray.ps1'
  $powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
  $argument = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$trayScript`" -NoAutoStart"
  $action = New-ScheduledTaskAction -Execute $powershell -Argument $argument -WorkingDirectory $Root
} else {
  $action = New-ScheduledTaskAction -Execute $wscript -Argument $argument -WorkingDirectory $Root
}

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -MultipleInstances IgnoreNew `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$task = New-ScheduledTask -Action $action -Trigger $trigger -Settings $settings -Principal $principal `
  -Description 'Starts the Quant Desk local supervisor tray at Windows logon. The supervisor owns scanner and candle-recorder child processes.'

Register-ScheduledTask -TaskName $TaskName -InputObject $task -Force | Out-Null

Write-Host "Installed startup task: $TaskName"
Write-Host "Launcher: $Launcher"
Write-Host "Working directory: $Root"
Write-Host "Status command: powershell -NoProfile -ExecutionPolicy Bypass -File `"$StatusScript`""

if ($StartNow) {
  Start-ScheduledTask -TaskName $TaskName
  Write-Host "Startup task launched now. Give it a few seconds, then run Status-QuantDesk.ps1."
}
