$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$ResearchReportDir = Join-Path $Root 'tools\automation\research-reports'
$LogsDir = Join-Path $Root 'logs\supervisor'
$LogPath = Join-Path $LogsDir 'research-review-launch.log'

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
New-Item -ItemType Directory -Force -Path $ResearchReportDir | Out-Null

function Write-ResearchReviewLog {
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
    }
  }
  Add-Content -Path $LogPath -Value ($entry | ConvertTo-Json -Compress -Depth 5)
}

Write-ResearchReviewLog -Message 'Research inventory requested from operator helper.'

$command = 'npm run research:desk-review -- --json'
$output = & cmd.exe /d /c $command 2>&1
$exitCode = $LASTEXITCODE

if ($exitCode -ne 0) {
  Write-ResearchReviewLog -Message 'Research inventory failed.' -Details @{
    exitCode = $exitCode
    output = ($output | Out-String)
  }
  throw "Research inventory failed with exit code $exitCode."
}

$latestReport = Get-ChildItem -Path $ResearchReportDir -Filter 'desk-research-inventory-*.md' |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $latestReport) {
  Write-ResearchReviewLog -Message 'Research inventory completed but no Markdown report was found.'
  throw 'Research inventory completed but no Markdown report was found.'
}

Write-ResearchReviewLog -Message 'Research inventory completed and opened.' -Details @{
  report = $latestReport.FullName
}

Start-Process -FilePath $latestReport.FullName | Out-Null
