param(
  [switch]$DryRun,
  [ValidateSet("premarket", "morning", "lunch")]
  [string]$Once,
  [string]$BridgeUrl = "http://127.0.0.1:8765",
  [string]$Instrument = "MES",
  [string]$BridgeInstrument = "MES 06-26",
  [switch]$NoRecorder
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $projectRoot

Write-Host ""
Write-Host "Quant Desk Live Scanner" -ForegroundColor Cyan
Write-Host "Project: $projectRoot"
Write-Host "Bridge:  $BridgeUrl"
Write-Host "Symbol:  $BridgeInstrument"
Write-Host ""
Write-Host "Keep this window open during market hours. Close it to stop alerts." -ForegroundColor Yellow
Write-Host ""

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($env:DISCORD_WEBHOOK_URL)) {
  $secret = Read-Host "Paste Discord webhook URL for this session" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    $env:DISCORD_WEBHOOK_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

$env:NINJATRADER_BRIDGE_URL = $BridgeUrl

if (-not $NoRecorder) {
  $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
  if ($null -eq $npmCommand) {
    $npmCommand = Get-Command npm
  }
  $npmCmd = $npmCommand.Source
  $recorderArgs = @(
    "run",
    "nt:candle-recorder",
    "--",
    "--instrument",
    $Instrument,
    "--bridge-instrument",
    $BridgeInstrument,
    "--bridge-url",
    $BridgeUrl,
    "--poll-seconds",
    "60",
    "--bar-time-zone",
    "eastern"
  )

  try {
    Start-Process -FilePath $npmCmd -ArgumentList $recorderArgs -WorkingDirectory $projectRoot -WindowStyle Hidden
    Write-Host "Started hidden NinjaTrader candle recorder. Use -NoRecorder to skip it." -ForegroundColor Green
  } catch {
    Write-Host "Could not auto-start candle recorder. Alerts will still run." -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Yellow
  }
}

$argsList = @(
  "run",
  "nt:scanner",
  "--",
  "--instrument",
  $Instrument,
  "--bridge-instrument",
  $BridgeInstrument,
  "--bridge-url",
  $BridgeUrl,
  "--poll-seconds",
  "60",
  "--bar-time-zone",
  "eastern"
)

if ($DryRun) {
  $argsList += "--dry-run"
}

if (-not [string]::IsNullOrWhiteSpace($Once)) {
  $argsList += "--once"
}

try {
  & npm @argsList
} catch {
  Write-Host ""
  Write-Host "Discord alert launcher stopped with an error:" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}
