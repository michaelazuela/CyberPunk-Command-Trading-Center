@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%..\.."

echo Starting Quant Desk live workflow...
echo.
echo 1. NinjaTrader candle recorder -> Supabase market_bars cache
echo 2. Local deterministic scanner -> Session plans, Discord alerts, and outcome buttons
echo.
echo Keep NinjaTrader Desktop running while the market is live.
echo Closing either launched window stops that process.
echo.

set "BRIDGE_INSTRUMENT="
set /p "BRIDGE_INSTRUMENT=Enter NinjaTrader instrument [MES 06-26]: "
if "%BRIDGE_INSTRUMENT%"=="" set "BRIDGE_INSTRUMENT=MES 06-26"

echo.
echo Using NinjaTrader instrument: %BRIDGE_INSTRUMENT%
echo.

start "Quant Desk Market Cache" /D "%PROJECT_ROOT%" cmd /k "npm run nt:candle-recorder -- --instrument MES --bridge-instrument ^"%BRIDGE_INSTRUMENT%^" --bridge-url http://127.0.0.1:8765 --poll-seconds 60 --bar-time-zone central"

start "Quant Desk Live Scanner" /D "%PROJECT_ROOT%" powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_DIR%start-discord-alerts.ps1" -NoRecorder -BridgeInstrument "%BRIDGE_INSTRUMENT%"

endlocal
