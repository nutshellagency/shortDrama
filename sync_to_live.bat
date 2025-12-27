@echo off
echo ============================================================
echo 🚀 SYNCING LOCAL TO LIVE (SUPABASE + GIT)
echo ============================================================

:: 1. Push Code to Git
echo [1/3] Pushing Code Changes to Git...
git add .
git commit -m "chore: sync local changes to live"
git push
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Git push failed. Please check your internet or merge conflicts.
    pause
    exit /b
)

:: 2. Push Database Schema
echo [2/3] Updating Supabase Database Schema...
cd server
:: Using the Supabase URL from your env
set DATABASE_URL="postgresql://postgres.sqnqbdyqqiizyktfkwwq:bbBySjRz5ykA2vP2@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
call npx prisma db push --accept-data-loss
cd ..

:: 3. Push Data and Media
echo [3/3] Uploading Data and Media to Supabase...
python scripts/push_to_live.py

echo ============================================================
echo ✅ SYNC COMPLETE! Your changes are now LIVE.
echo ============================================================
pause

