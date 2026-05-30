@echo off
setlocal

cd /d "%~dp0"

REM Primary daily launcher for the Quant Desk / 6K Trading workflow.
REM Dashboard-managed Cloudflare Tunnel connector settings.
REM The connector should be installed once with:
REM cloudflared.exe service install <token>
REM Do not paste the token into this file.
set "DEFAULT_SYMBOL=MES"
set "DEFAULT_CONTRACT=MES 06-26"
set "BRIDGE_URL=http://127.0.0.1:8765"
set "DISCORD_ENDPOINT=https://discord-bridge.urmomshouse.net/interactions"

echo ========================================
echo  Quant Desk / 6K Trading Service Launcher
echo ========================================
echo Project root: %CD%
echo Default symbol: %DEFAULT_SYMBOL%
echo Default contract: %DEFAULT_CONTRACT%
echo Bridge URL: %BRIDGE_URL%
echo Bar data contract: %DEFAULT_CONTRACT%
echo Bar data bridge URL: %BRIDGE_URL%
echo Scanner contract: %DEFAULT_CONTRACT%
echo Scanner bridge URL: %BRIDGE_URL%
echo Discord endpoint: %DISCORD_ENDPOINT%
echo.

if not exist "package.json" (
  echo ERROR: package.json was not found.
  echo Make sure this file is in the project root folder.
  echo.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ERROR: npm was not found in PATH.
  echo Install Node.js or open this from a terminal where npm is available.
  echo.
  pause
  exit /b 1
)

echo Checking whether port 8787 is already in use...
netstat -ano | findstr /R /C:":8787 .*LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo.
  echo Port 8787 is already in use.
  echo The Discord research interaction service may already be running.
  echo Close the existing service window or stop the process before starting another copy.
  echo.
  echo Matching port/PID information:
  netstat -ano | findstr :8787
  echo.
  echo Interaction receiver: already running. Skipping duplicate startup.
) else (
  echo Interaction receiver: starting...
  start "6K Discord Research Interactions" cmd /k "cd /d ""%CD%"" && npm run research:discord-interactions"
  echo Interaction receiver: started in a separate window.
)

echo.
echo Checking NinjaTrader bridge service...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $response = Invoke-RestMethod -Uri '%BRIDGE_URL%/health' -TimeoutSec 3; if ($response.ok -eq $true) { Write-Host 'Bridge service: running'; if ($response.defaultInstrument) { Write-Host ('Bridge default instrument: ' + $response.defaultInstrument) } } else { Write-Host 'Bridge service: reachable but reported not OK.' } } catch { Write-Host 'Bridge service: not reachable. Start NinjaTrader and confirm the QuantDeskBridge AddOn is compiled/running.' }"

echo.
echo Checking Quant Desk bar data / market cache service...
set "BAR_DATA_PIDS="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'nt:candle-recorder') } | Select-Object -ExpandProperty ProcessId"`) do (
  set "BAR_DATA_PIDS=%%P"
)

if defined BAR_DATA_PIDS (
  echo Bar data service: already running.
  echo Bar data contract: %DEFAULT_CONTRACT%
  echo Bar data bridge URL: %BRIDGE_URL%
  echo Matching bar data process IDs:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'nt:candle-recorder') } | Select-Object -ExpandProperty ProcessId"
) else (
  echo Bar data service: starting for %DEFAULT_CONTRACT%...
  echo Bar data contract: %DEFAULT_CONTRACT%
  echo Bar data bridge URL: %BRIDGE_URL%
  start "Quant Desk Bar Data - %DEFAULT_CONTRACT%" cmd /k "cd /d ""%CD%"" && npm run nt:candle-recorder -- --instrument %DEFAULT_SYMBOL% --bridge-instrument ""%DEFAULT_CONTRACT%"" --bridge-url %BRIDGE_URL% --poll-seconds 60 --bar-time-zone eastern"
)

echo.
echo Checking Quant Desk live scanner/watchlist service...
set "SCANNER_PIDS="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'nt:scanner') } | Select-Object -ExpandProperty ProcessId"`) do (
  set "SCANNER_PIDS=%%P"
)

if defined SCANNER_PIDS (
  echo Scanner/watchlist service: already running.
  echo Scanner contract: %DEFAULT_CONTRACT%
  echo Scanner bridge URL: %BRIDGE_URL%
  echo Matching scanner process IDs:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'nt:scanner') } | Select-Object -ExpandProperty ProcessId"
) else (
  echo Scanner/watchlist service: starting for %DEFAULT_CONTRACT%...
  echo Scanner contract: %DEFAULT_CONTRACT%
  echo Scanner bridge URL: %BRIDGE_URL%
  start "Quant Desk Live Scanner - %DEFAULT_CONTRACT%" cmd /k "cd /d ""%CD%"" && npm run nt:scanner -- --instrument %DEFAULT_SYMBOL% --bridge-instrument ""%DEFAULT_CONTRACT%"" --bridge-url %BRIDGE_URL% --poll-seconds 60 --bar-time-zone eastern"
)

echo.
echo Checking Cloudflare Tunnel Windows service...
set "CF_SERVICE_NAME="
for %%S in (cloudflared Cloudflared "Cloudflare Tunnel") do (
  sc query "%%~S" >nul 2>nul
  if not errorlevel 1 if not defined CF_SERVICE_NAME set "CF_SERVICE_NAME=%%~S"
)

if not defined CF_SERVICE_NAME (
  echo.
  echo No Cloudflare Tunnel service was found.
  echo Install the connector from Cloudflare dashboard using:
  echo cloudflared.exe service install ^<token^>
  echo Do not paste the token into this file.
  echo.
  echo The local Discord interaction server can still run, but Discord will only reach it
  echo after the dashboard-managed Cloudflare Tunnel connector is installed and healthy.
) else (
  echo Found Cloudflare Tunnel service: %CF_SERVICE_NAME%
  sc query "%CF_SERVICE_NAME%"
  sc query "%CF_SERVICE_NAME%" | findstr /I /C:"RUNNING" >nul 2>nul
  if not errorlevel 1 (
    echo Cloudflare tunnel service: running.
  ) else (
    echo Cloudflare Tunnel service is not running. Attempting to start it...
    net start "%CF_SERVICE_NAME%"
    if errorlevel 1 (
      echo.
      echo WARNING: Could not start the Cloudflare Tunnel service.
      echo If Windows reports access denied, run this launcher as Administrator
      echo or start the service manually from Windows Services.
    ) else (
      echo Cloudflare tunnel service: started.
    )
  )
)

echo.
echo Expected Discord Interactions Endpoint:
echo %DISCORD_ENDPOINT%
echo.
echo Configure the stable Cloudflare hostname once in Cloudflare,
echo then save the endpoint URL once in the Discord Developer Portal.
echo This launcher does not edit Discord settings.

echo.
echo Checking Quant Desk Discord report scheduler...
set "SCHEDULER_PIDS="
for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'quant-desk:discord-scheduler') } | Select-Object -ExpandProperty ProcessId"`) do (
  set "SCHEDULER_PIDS=%%P"
)

if defined SCHEDULER_PIDS (
  echo Scheduler: already running.
  echo Matching scheduler process IDs:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'quant-desk:discord-scheduler') } | Select-Object -ExpandProperty ProcessId"
  echo Skipping duplicate scheduler startup.
) else (
  echo Scheduler: starting...
  start "Quant Desk Discord Scheduler" cmd /k "cd /d ""%CD%"" && npm run quant-desk:discord-scheduler"
  echo Scheduler: started in a separate window.
)

echo.
echo Daily research review posting: handled by Quant Desk Discord scheduler startup check when applicable.
echo Bridge service: checked at %BRIDGE_URL%/health. Start NinjaTrader manually if the bridge is not reachable.

REM Optional: uncomment if needed.
REM start "6K Dev Server" cmd /k "cd /d ""%CD%"" && npm run dev"

REM Optional locally-managed tunnel fallback only.
REM Not the default for dashboard-managed Cloudflare Tunnel connectors.
REM Requires local cert.pem/config credentials.
REM set "LOCAL_TUNNEL_NAME=6k-trading-discord"
REM start "6K Cloudflare Named Tunnel" cmd /k "cd /d ""%CD%"" && cloudflared tunnel run %LOCAL_TUNNEL_NAME%"

echo.
echo Required local services were launched or already detected.
echo You can close this launcher window.
echo.
pause
endlocal
