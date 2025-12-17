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
<<<<<<< HEAD
echo  Preparing Services (Port 3000=Viewer, 4000=Server)
=======
echo  Preparing Services (Port 3000=Viewer, 3001=Server)
>>>>>>> 111e9cbfd29a7d331f4186991ccdb7d778375ab8
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
<<<<<<< HEAD
start "Minio Storage" /min /D "%~dp0" cmd /k ".\minio.exe server .\minio_data --console-address :9001"
start "API Server (Port 4000)" /D "%~dp0server" cmd /k "set API_PORT=4000&& echo Pushing DB Schema... && npm run db:push && npm run dev"
start "App Viewer (Port 3000)" /D "%~dp0viewer" cmd /k "set PORT=3000&& npm run dev"
start "AI Worker" /D "%~dp0worker" cmd /k "set API_BASE_URL=http://localhost:4000&& python main.py"
=======
start "Minio Storage" /min cmd /k ".\minio.exe server .\minio_data --console-address :9001"
start "API Server (Port 3001)" cmd /k "cd server && set API_PORT=3001&& npm run dev"
start "App Viewer (Port 3000)" cmd /k "cd viewer && npm run dev"
start "AI Worker" cmd /k "cd worker && set API_BASE_URL=http://localhost:3001&& python main.py"
>>>>>>> 111e9cbfd29a7d331f4186991ccdb7d778375ab8

echo.
echo ========================================================
echo  Ready!
echo     - Viewer: http://localhost:3000
<<<<<<< HEAD
echo     - Server: http://localhost:4000
=======
echo     - Server: http://localhost:3001
>>>>>>> 111e9cbfd29a7d331f4186991ccdb7d778375ab8
echo     - Minio:  http://localhost:9001
echo ========================================================
echo.
pause
