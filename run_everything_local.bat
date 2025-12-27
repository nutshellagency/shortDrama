@echo off
echo ============================================================
echo CLEANING UP STALE SERVICES...
echo ============================================================
taskkill /F /IM minio.exe /T >nul 2>&1
echo ============================================================
echo STARTING SHORT DRAMA LOCAL STACK (NATIVE)
echo ============================================================

:: 1. Start MinIO
echo [1/4] Starting MinIO Storage...
start "ShortDrama-MinIO" start_minio.bat

:: 2. Start API Server
echo [2/4] Starting API Server...
cd server
start "ShortDrama-API" cmd /c "npm run dev"
cd ..

:: 3. Start AI Worker
echo [3/4] Starting AI Worker...
cd worker
start "ShortDrama-Worker" cmd /c "python main.py"
cd ..

:: 4. Start Viewer
echo [4/4] Starting Viewer (Next.js)...
cd viewer
start "ShortDrama-Viewer" cmd /c "npx next dev -p 3001"
cd ..

echo ============================================================
echo ALL SERVICES STARTING
echo API: http://localhost:3000
echo Admin: http://localhost:3000/admin
echo Viewer: http://localhost:3001
echo MinIO Console: http://localhost:9001 (user: minioadmin / pass: minioadmin)
echo ============================================================
pause
