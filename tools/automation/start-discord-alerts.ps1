param(
  [switch]$DryRun,
  [ValidateSet("premarket", "morning", "lunch")]
  [string]$Once,
  [string]$BridgeUrl = "http://127.0.0.1:8765",
  [string]$Instrument = "MES",
  [string]$BridgeInstrument = "MES",
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

function Import-UserDiscordEnvironment {
  foreach ($key in @(
    'QUANT_DESK_SCANNER_WEBHOOK_URL',
    'SCANNER_DISCORD_WEBHOOK_URL',
    'DISCORD_WEBHOOK_URL'
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

if (-not $DryRun -and [string]::IsNullOrWhiteSpace($env:QUANT_DESK_SCANNER_WEBHOOK_URL) -and [string]::IsNullOrWhiteSpace($env:SCANNER_DISCORD_WEBHOOK_URL) -and [string]::IsNullOrWhiteSpace($env:DISCORD_WEBHOOK_URL)) {
  $secret = Read-Host "Paste Quant Desk scanner Discord webhook URL for this session" -AsSecureString
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try {
    $env:QUANT_DESK_SCANNER_WEBHOOK_URL = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
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

if (-not $DryRun) {
  Write-Host "Checking durable ActiveCampaign Supabase ledger..." -ForegroundColor Cyan
  & npm run nt:scanner -- --preflight-active-campaign-ledger
  if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ActiveCampaign ledger preflight failed. Discord scanner was not started." -ForegroundColor Red
    Write-Host "Confirm SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DISCORD_RAG_USER_ID, and the scanner_active_campaign_alerts migration." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to close"
    exit 1
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
