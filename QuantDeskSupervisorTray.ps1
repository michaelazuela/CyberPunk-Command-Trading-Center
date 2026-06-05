param(
  [switch]$NoAutoStart
)

$ErrorActionPreference = 'Stop'

if ([Threading.Thread]::CurrentThread.GetApartmentState() -ne 'STA') {
  $arguments = @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-STA',
    '-File', "`"$PSCommandPath`""
  )
  if ($NoAutoStart) {
    $arguments += '-NoAutoStart'
  }
  Start-Process -FilePath 'powershell.exe' -ArgumentList $arguments -WindowStyle Hidden | Out-Null
  exit 0
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$StatusUri = 'http://127.0.0.1:8797/status'
$LogsDir = Join-Path $Root 'logs\supervisor'
$IconPath = Join-Path $Root 'assets\launcher\quant-desk-supervisor-launcher.ico'
$StartScript = Join-Path $Root 'Start-QuantDesk-Supervisor.ps1'
$StopScript = Join-Path $Root 'Stop-QuantDesk-Supervisor.ps1'
$SelfHealNotifyScript = 'npm run supervisor:notify-self-heal'
$TrayLogPath = Join-Path $LogsDir 'tray.log'
$SelfHealEnabled = $true
$SelfHealPausedByStop = $false
$SelfHealInProgress = $false
$EndpointMissCount = 0
$SelfHealThreshold = 2

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

[System.Windows.Forms.Application]::EnableVisualStyles()

function Write-TrayLog {
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

function Start-LocalScript {
  param(
    [Parameter(Mandatory = $true)]
    [string]$ScriptPath,
    [string]$Label = 'script'
  )

  Write-TrayLog -Message 'Tray action requested.' -Details @{ label = $Label; script = $ScriptPath }
  return Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$ScriptPath`"") `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -PassThru
}

function Start-RestartSequence {
  $command = @"
Set-Location '$($Root.Replace("'", "''"))'
& '$($StopScript.Replace("'", "''"))'
Start-Sleep -Milliseconds 750
& '$($StartScript.Replace("'", "''"))'
"@
  Write-TrayLog -Message 'Tray restart sequence requested.' -Details @{ stopScript = $StopScript; startScript = $StartScript }
  return Start-Process -FilePath 'powershell.exe' `
    -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -PassThru
}

function Start-NpmCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Command,
    [string]$Label = 'npm-command'
  )

  Write-TrayLog -Message 'Tray npm command requested.' -Details @{ label = $Label; command = $Command }
  return Start-Process -FilePath 'cmd.exe' `
    -ArgumentList @('/d', '/c', $Command) `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -PassThru
}

function Get-SupervisorPayload {
  try {
    return Invoke-RestMethod -Uri $StatusUri -Method Get -TimeoutSec 2
  } catch {
    return $null
  }
}

function Get-TrayState {
  $payload = Get-SupervisorPayload
  if (-not $payload) {
    return [pscustomobject]@{
      Level = 'red'
      Label = 'Stopped'
      Detail = if ($SelfHealPausedByStop) { 'Stopped by user; self-heal paused.' } else { 'Supervisor status endpoint is not reachable.' }
      Payload = $null
    }
  }

  $healthStatus = if ($payload.health -and $payload.health.status) { [string]$payload.health.status } else { 'warn' }
  $deliveryStatus = if ($payload.delivery -and $payload.delivery.status) { [string]$payload.delivery.status } else { 'unknown' }

  if ($payload.supervisor.status -ne 'ready' -or $healthStatus -eq 'fail') {
    return [pscustomobject]@{
      Level = 'red'
      Label = 'Needs Attention'
      Detail = "Supervisor=$($payload.supervisor.status); health=$healthStatus"
      Payload = $payload
    }
  }

  if ($healthStatus -eq 'warn') {
    return [pscustomobject]@{
      Level = 'yellow'
      Label = 'Warning'
      Detail = "Health=$healthStatus; delivery=$deliveryStatus"
      Payload = $payload
    }
  }

  return [pscustomobject]@{
    Level = 'green'
    Label = 'Healthy'
    Detail = "Supervisor is running; delivery=$deliveryStatus"
    Payload = $payload
  }
}

function New-StatusIcon {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Level
  )

  $bitmap = New-Object System.Drawing.Bitmap 64, 64
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::FromArgb(16, 18, 24))

  $accent = switch ($Level) {
    'green' { [System.Drawing.Color]::FromArgb(20, 184, 116) }
    'yellow' { [System.Drawing.Color]::FromArgb(245, 158, 11) }
    default { [System.Drawing.Color]::FromArgb(239, 68, 68) }
  }

  $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(230, 238, 246)), 2
  $accentBrush = New-Object System.Drawing.SolidBrush $accent
  $textBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(230, 238, 246))
  $font = New-Object System.Drawing.Font 'Segoe UI', 27, ([System.Drawing.FontStyle]::Bold), ([System.Drawing.GraphicsUnit]::Pixel)

  $graphics.DrawEllipse($borderPen, 5, 5, 54, 54)
  $graphics.FillEllipse($accentBrush, 40, 40, 16, 16)
  $graphics.DrawString('Q', $font, $textBrush, 18, 13)

  $handle = $bitmap.GetHicon()
  $icon = ([System.Drawing.Icon]::FromHandle($handle)).Clone()

  $graphics.Dispose()
  $borderPen.Dispose()
  $accentBrush.Dispose()
  $textBrush.Dispose()
  $font.Dispose()
  $bitmap.Dispose()

  return $icon
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null

$notifyIcon = New-Object System.Windows.Forms.NotifyIcon
$notifyIcon.Text = 'Quant Desk Supervisor'
$notifyIcon.Visible = $true

$icons = @{
  green = New-StatusIcon -Level 'green'
  yellow = New-StatusIcon -Level 'yellow'
  red = New-StatusIcon -Level 'red'
}

if (Test-Path $IconPath) {
  $notifyIcon.Icon = $icons.red
} else {
  $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
}

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$statusItem = $menu.Items.Add('Status: Checking...')
$statusItem.Enabled = $false
$menu.Items.Add('-') | Out-Null
$startItem = $menu.Items.Add('Start Supervisor')
$restartItem = $menu.Items.Add('Restart Supervisor Services')
$stopItem = $menu.Items.Add('Stop All')
$menu.Items.Add('-') | Out-Null
$openStatusItem = $menu.Items.Add('Open Status')
$openLogsItem = $menu.Items.Add('Open Logs')
$refreshItem = $menu.Items.Add('Refresh')
$selfHealItem = $menu.Items.Add('Self-Heal Enabled')
$selfHealItem.Checked = $true
$menu.Items.Add('-') | Out-Null
$exitItem = $menu.Items.Add('Exit Tray')
$notifyIcon.ContextMenuStrip = $menu

function Invoke-SelfHealIfNeeded {
  param(
    [AllowNull()]
    $Payload
  )

  if ($Payload) {
    $script:EndpointMissCount = 0
    $script:SelfHealInProgress = $false
    return
  }
  if (-not $script:SelfHealEnabled -or $script:SelfHealPausedByStop -or $script:SelfHealInProgress -or $NoAutoStart) {
    return
  }

  $script:EndpointMissCount += 1
  if ($script:EndpointMissCount -lt $SelfHealThreshold) {
    return
  }

  Write-TrayLog -Message 'Supervisor endpoint unreachable; self-heal start requested.' -Details @{
    misses = $script:EndpointMissCount
    threshold = $SelfHealThreshold
  }
  $script:SelfHealInProgress = $true
  Start-LocalScript -ScriptPath $StartScript -Label 'self-heal-start' | Out-Null
  Start-NpmCommand -Command $SelfHealNotifyScript -Label 'self-heal-notify' | Out-Null
  $script:EndpointMissCount = 0
}

function Update-Tray {
  try {
    $state = Get-TrayState
    Invoke-SelfHealIfNeeded -Payload $state.Payload
    if (-not $state.Payload -and -not $SelfHealPausedByStop -and $SelfHealEnabled -and -not $NoAutoStart) {
      $state = Get-TrayState
    }
    $notifyIcon.Icon = $icons[$state.Level]
    $notifyIcon.Text = "Quant Desk Supervisor - $($state.Label)"
    $statusItem.Text = "Status: $($state.Label) - $($state.Detail)"

    $isRunning = $null -ne $state.Payload
    $startItem.Enabled = -not $isRunning
    $restartItem.Enabled = $true
    $stopItem.Enabled = $isRunning
    $openStatusItem.Enabled = $isRunning
    $openLogsItem.Enabled = $true
    $selfHealItem.Checked = $SelfHealEnabled
  } catch {
    $notifyIcon.Icon = $icons.red
    $notifyIcon.Text = 'Quant Desk Supervisor - Error'
    $statusItem.Text = "Status: Error - $($_.Exception.Message)"
    $startItem.Enabled = $true
    $restartItem.Enabled = $true
    $stopItem.Enabled = $true
    $openStatusItem.Enabled = $false
    $openLogsItem.Enabled = $true
  }
}

$startItem.Add_Click({
  $script:SelfHealPausedByStop = $false
  $script:SelfHealInProgress = $false
  $script:EndpointMissCount = 0
  $statusItem.Text = 'Status: Start requested...'
  Start-LocalScript -ScriptPath $StartScript -Label 'start' | Out-Null
  Update-Tray
})

$restartItem.Add_Click({
  $script:SelfHealPausedByStop = $false
  $script:SelfHealInProgress = $true
  $script:EndpointMissCount = 0
  $statusItem.Text = 'Status: Restart requested...'
  Start-RestartSequence | Out-Null
  Update-Tray
})

$stopItem.Add_Click({
  $script:SelfHealPausedByStop = $true
  $script:SelfHealInProgress = $false
  $script:EndpointMissCount = 0
  $statusItem.Text = 'Status: Stop requested...'
  Start-LocalScript -ScriptPath $StopScript -Label 'stop' | Out-Null
  Update-Tray
})

$openStatusItem.Add_Click({
  Start-Process $StatusUri | Out-Null
})

$openLogsItem.Add_Click({
  New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
  Start-Process explorer.exe -ArgumentList "`"$LogsDir`"" | Out-Null
})

$refreshItem.Add_Click({
  Update-Tray
})

$selfHealItem.Add_Click({
  $script:SelfHealEnabled = -not $script:SelfHealEnabled
  $selfHealItem.Checked = $script:SelfHealEnabled
  Write-TrayLog -Message 'Tray self-heal setting changed.' -Details @{ enabled = $script:SelfHealEnabled }
  if ($script:SelfHealEnabled) {
    $script:SelfHealPausedByStop = $false
    $script:SelfHealInProgress = $false
  }
  Update-Tray
})

$exitItem.Add_Click({
  $notifyIcon.Visible = $false
  [System.Windows.Forms.Application]::Exit()
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 30000
$timer.Add_Tick({
  Update-Tray
})
$timer.Start()

if (-not $NoAutoStart -and -not (Get-SupervisorPayload)) {
  Write-TrayLog -Message 'Supervisor endpoint unavailable on tray startup; initial start requested.'
  $script:SelfHealInProgress = $true
  Start-LocalScript -ScriptPath $StartScript -Label 'initial-start' | Out-Null
}

Update-Tray
$notifyIcon.ShowBalloonTip(2500, 'Quant Desk Supervisor', 'Supervisor tray is running. Use the tray menu for status, logs, restart, or stop.', [System.Windows.Forms.ToolTipIcon]::Info)

try {
  [System.Windows.Forms.Application]::Run()
} finally {
  $timer.Stop()
  $timer.Dispose()
  $notifyIcon.Visible = $false
  $notifyIcon.Dispose()
  foreach ($icon in $icons.Values) {
    $icon.Dispose()
  }
}
