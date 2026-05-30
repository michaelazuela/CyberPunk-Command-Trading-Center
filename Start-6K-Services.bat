@echo off
setlocal

cd /d "%~dp0"

REM Primary daily launcher for the Quant Desk / 6K Trading workflow.
REM Dashboard-managed Cloudflare Tunnel connector settings.
REM The connector should be installed once with:
REM cloudflared.exe service install <token>
REM Do not paste the token into this file.
set "DISCORD_ENDPOINT=https://discord-bridge.urmomshouse.net/interactions"

echo ========================================
echo  Quant Desk / 6K Trading Service Launcher
echo ========================================
echo Project root: %CD%
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
  echo Skipping duplicate Discord research interaction service startup.
) else (
  echo Starting Discord research interaction service...
  start "6K Discord Research Interactions" cmd /k "cd /d ""%CD%"" && npm run research:discord-interactions"
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
    echo Cloudflare Tunnel service is already running.
  ) else (
    echo Cloudflare Tunnel service is not running. Attempting to start it...
    net start "%CF_SERVICE_NAME%"
    if errorlevel 1 (
      echo.
      echo WARNING: Could not start the Cloudflare Tunnel service.
      echo If Windows reports access denied, run this launcher as Administrator
      echo or start the service manually from Windows Services.
    ) else (
      echo Cloudflare Tunnel service started.
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
  echo Quant Desk Discord scheduler may already be running.
  echo Matching scheduler process IDs:
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { ($_.Name -match 'node|npm') -and ($_.CommandLine -match 'quant-desk:discord-scheduler') } | Select-Object -ExpandProperty ProcessId"
  echo Skipping duplicate scheduler startup.
) else (
  echo Starting Quant Desk Discord scheduler...
  start "Quant Desk Discord Scheduler" cmd /k "cd /d ""%CD%"" && npm run quant-desk:discord-scheduler"
)

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
