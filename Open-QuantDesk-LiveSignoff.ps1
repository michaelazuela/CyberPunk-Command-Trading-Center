$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogsDir = Join-Path $Root 'logs\supervisor'
$ReportDir = Join-Path $LogsDir 'live-signoff'
$LogPath = Join-Path $LogsDir 'live-signoff-launch.log'

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Write-LiveSignoffLog {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Message,
    [hashtable]$Details = @{}
  )

  $entry = [ordered]@{
    timestamp = (Get-Date).ToUniversalTime().ToString('o')
    message = $Message
    details = $Details
    authority = @{
      readOnly = $true
      postsDiscord = $false
      writesSupabase = $false
      changesScannerState = $false
      changesTradingLogic = $false
      changesCanExecute = $false
      startsChildProcesses = $false
    }
  }
  Add-Content -Path $LogPath -Value ($entry | ConvertTo-Json -Compress -Depth 5)
}

Write-LiveSignoffLog -Message 'Live-format supervisor signoff requested from operator helper.'

$command = 'npm run supervisor:signoff-manifest -- --json'
$output = & cmd.exe /d /c $command 2>&1
$exitCode = $LASTEXITCODE
$timestamp = (Get-Date).ToUniversalTime().ToString('yyyyMMdd-HHmmss')
$reportPath = Join-Path $ReportDir "supervisor-phase6-signoff-$timestamp.json"
$textPath = Join-Path $ReportDir "supervisor-phase6-signoff-$timestamp.txt"

$outputText = ($output | Out-String)
Set-Content -Path $textPath -Value $outputText

$jsonStart = $outputText.IndexOf('{')
if ($jsonStart -ge 0) {
  $jsonText = $outputText.Substring($jsonStart)
  try {
    $parsed = $jsonText | ConvertFrom-Json
    $parsed | ConvertTo-Json -Depth 20 | Set-Content -Path $reportPath
  } catch {
    Write-LiveSignoffLog -Message 'Live-format signoff output was not valid JSON.' -Details @{
      exitCode = $exitCode
      textReport = $textPath
      error = $_.Exception.Message
    }
  }
}

if ($exitCode -ne 0) {
  Write-LiveSignoffLog -Message 'Live-format supervisor signoff did not pass.' -Details @{
    exitCode = $exitCode
    textReport = $textPath
    jsonReport = if (Test-Path $reportPath) { $reportPath } else { $null }
  }
  Start-Process -FilePath $textPath | Out-Null
  throw "Live-format supervisor signoff manifest did not pass. See $textPath."
}

Write-LiveSignoffLog -Message 'Live-format supervisor signoff completed and opened.' -Details @{
  textReport = $textPath
  jsonReport = if (Test-Path $reportPath) { $reportPath } else { $null }
}

if (Test-Path $reportPath) {
  Start-Process -FilePath $reportPath | Out-Null
} else {
  Start-Process -FilePath $textPath | Out-Null
}
