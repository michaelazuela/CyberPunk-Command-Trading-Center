param(
  [switch]$DryRun,
  [ValidateSet("premarket", "morning", "lunch")]
  [string]$Once,
  [string]$BridgeUrl = "http://127.0.0.1:8765",
  [string]$Instrument = "MES",
  [string]$BridgeInstrument = "MES 06-26"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $projectRoot

Write-Host ""
Write-Host "Quant Desk Discord Alerts" -ForegroundColor Cyan
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

$argsList = @(
  "run",
  "nt:discord-alerts",
  "--",
  "--instrument",
  $Instrument,
  "--bridge-instrument",
  $BridgeInstrument,
  "--bridge-url",
  $BridgeUrl
)

if ($DryRun) {
  $argsList += "--dry-run"
}

if (-not [string]::IsNullOrWhiteSpace($Once)) {
  $argsList += @("--once", $Once)
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
