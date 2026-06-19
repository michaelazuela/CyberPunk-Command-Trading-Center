$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Timestamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$BundleDir = Join-Path $Root "logs\supervisor\health-bundles\$Timestamp"

New-Item -ItemType Directory -Path $BundleDir -Force | Out-Null

function Save-CommandOutput {
  param(
    [string]$Name,
    [scriptblock]$Command
  )

  $FilePath = Join-Path $BundleDir $Name
  Push-Location $Root
  try {
    & $Command 2>&1 | Out-File -FilePath $FilePath -Encoding utf8
    $ExitCode = if ($null -eq $global:LASTEXITCODE) { 0 } else { $global:LASTEXITCODE }
    return [ordered]@{
      name = $Name
      path = $FilePath
      exitCode = $ExitCode
    }
  } catch {
    "Command failed: $($_.Exception.Message)" | Out-File -FilePath $FilePath -Encoding utf8
    return [ordered]@{
      name = $Name
      path = $FilePath
      exitCode = 1
      error = $_.Exception.Message
    }
  } finally {
    Pop-Location
  }
}

$Results = @()
$Results += Save-CommandOutput -Name 'supervisor-status.txt' -Command { npm.cmd run supervisor:status }
$Results += Save-CommandOutput -Name 'supervisor-audit.json' -Command { npm.cmd run --silent supervisor:audit }
$Results += Save-CommandOutput -Name 'supervisor-repair-preview.txt' -Command { npm.cmd run supervisor:repair }
$Results += Save-CommandOutput -Name 'runtime-json-cleanup-preview.json' -Command { npm.cmd run --silent supervisor:cleanup-json }
$Results += Save-CommandOutput -Name 'status-quantdesk.txt' -Command { powershell.exe -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Root 'Status-QuantDesk.ps1') }

$Manifest = [ordered]@{
  generatedAt = (Get-Date).ToString('o')
  root = $Root
  bundleDir = $BundleDir
  boundaries = [ordered]@{
    readOnly = $true
    cleanupPreviewOnly = $true
    stopsProcesses = $false
    startsProcesses = $false
    postsDiscord = $false
    changesTradingLogic = $false
    changesScannerBehavior = $false
    changesCanExecute = $false
  }
  files = $Results
}

$ManifestPath = Join-Path $BundleDir 'manifest.json'
$Manifest | ConvertTo-Json -Depth 8 | Out-File -FilePath $ManifestPath -Encoding utf8

Write-Host "Quant Desk health bundle saved:"
Write-Host $BundleDir
Write-Host "Manifest:"
Write-Host $ManifestPath
