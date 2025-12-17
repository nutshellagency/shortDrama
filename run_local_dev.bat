@echo off
setlocal EnableDelayedExpansion

:: Store script directory
set "SCRIPT_DIR=%~dp0"
:: Remove trailing backslash for clean paths
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

echo ========================================================
echo  ShortDrama Local Development
echo ========================================================

:: Check for admin rights
NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] Access Denied.
    echo  Please Right-Click and "Run as Administrator".
    echo.
    pause
    exit /b
)

echo.
echo  Ports: Viewer=3000, Server=4000, Minio=9001
echo.

:: 1. Minio Setup
echo  [1/4] Configuring Minio...
cd /d "%SCRIPT_DIR%"
powershell -command "if (Test-Path .\minio.exe) { Unblock-File -Path .\minio.exe }" >nul 2>&1
if not exist "minio_data" mkdir "minio_data"

:: 2. Start Minio
echo  [2/4] Starting Minio Storage...
start "Minio Storage" /min cmd /k "cd /d %SCRIPT_DIR% && .\minio.exe server .\minio_data --console-address :9001"

:: 3. Start Server
echo  [3/4] Starting API Server (Port 4000)...
start "API Server (Port 4000)" cmd /k "cd /d %SCRIPT_DIR%\server && set API_PORT=4000 && npm run db:push && npm run dev"

:: 4. Start Viewer and Worker
echo  [4/4] Starting Viewer and Worker...
start "App Viewer (Port 3000)" cmd /k "cd /d %SCRIPT_DIR%\viewer && set PORT=3000 && npm run dev"
start "AI Worker" cmd /k "cd /d %SCRIPT_DIR%\worker && set API_BASE_URL=http://localhost:4000 && python main.py"

echo.
echo ========================================================
echo  Ready!
echo     - Viewer: http://localhost:3000
echo     - Server: http://localhost:4000
echo     - Minio:  http://localhost:9001
echo ========================================================
echo.
pause
