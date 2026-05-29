@echo off
setlocal

cd /d "%~dp0"

echo ========================================
echo  6K Trading Service Launcher
echo ========================================
echo Project root: %CD%
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
  pause
  exit /b 1
)

echo Starting Discord research interaction service...
start "6K Discord Research Interactions" cmd /k "cd /d ""%CD%"" && npm run research:discord-interactions"

REM Optional: uncomment if needed.
REM start "6K Dev Server" cmd /k "cd /d ""%CD%"" && npm run dev"

REM Optional Cloudflare Tunnel placeholder:
REM Replace YOUR_TUNNEL_NAME_OR_COMMAND before enabling.
REM start "6K Cloudflare Tunnel" cmd /k "cd /d ""%CD%"" && cloudflared tunnel run YOUR_TUNNEL_NAME_OR_COMMAND"

echo.
echo Required service launched in a separate window.
echo You can close this launcher window.
echo.
pause
endlocal
