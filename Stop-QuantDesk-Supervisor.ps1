$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $Root
try {
  npm run quant-desk:stop-all
} finally {
  Pop-Location
}
