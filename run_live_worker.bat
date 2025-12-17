@echo off
:: FIX: Switch to the script's directory
cd /d "%~dp0"

echo Starting ShortDrama LIVE WORKER...
echo.
echo WARNING: This worker connects to the LIVE API (Vercel).
echo It will process real jobs from the production database.
echo.

start "AI Worker (LIVE)" cmd /k "npm run worker:prod"

echo.
echo Worker started! Monitor the new window for activity.
echo.
pause
