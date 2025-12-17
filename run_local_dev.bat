@echo off
cd /d "%~dp0"

echo ========================================================
echo  Checking Permissions...
echo ========================================================

NET SESSION >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] Access Denied.
    echo  Please Right-Click this file and "Run as Administrator".
    echo.
    pause
    exit /b
)

echo.
echo ========================================================
echo  Preparing Services (Port 3000=Viewer, 4000=Server)
echo ========================================================

:: 1. Minio Setup
echo  [1/4] Configuring Minio...
powershell -command "if (Test-Path .\minio.exe) { Unblock-File -Path .\minio.exe; Write-Host 'Unblocked minio.exe' }"
if not exist "minio_data" mkdir "minio_data"

:: Check if Minio can run at all
.\minio.exe --version >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo  [ERROR] Minio cannot run!
    echo  It is likely blocked by Windows Defender / Antivirus.
    echo  Please check "Virus & threat protection" -> "Protection history"
    echo  and Allow the blocked file.
    echo.
    pause
)

:: 2. Start Services
start "Minio Storage" /min cmd /k ".\minio.exe server .\minio_data --console-address :9001"
start "API Server (Port 4000)" cmd /k "cd server && set API_PORT=4000&& npm run dev"
start "App Viewer (Port 3000)" cmd /k "cd viewer && set PORT=3000&& npm run dev"
start "AI Worker" cmd /k "cd worker && set API_BASE_URL=http://localhost:4000&& python main.py"

echo.
echo ========================================================
echo  Ready!
echo     - Viewer: http://localhost:3000
echo     - Server: http://localhost:4000
echo     - Minio:  http://localhost:9001
echo ========================================================
echo.
pause
