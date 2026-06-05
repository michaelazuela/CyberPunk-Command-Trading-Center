$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $Root
try {
  npm run supervisor:stop
} finally {
  Pop-Location
}
