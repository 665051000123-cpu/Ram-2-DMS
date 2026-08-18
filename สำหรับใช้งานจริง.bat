@echo off
chcp 65001 >nul
title DMS Server - Auto Restart
color 0B

echo [INFO] Starting Auto-Scanner Sync Service...
start "DMS Scanner Sync" cmd /c "title DMS Scanner Sync && node scanner-watcher.js"

:loop
cls
echo =====================================================
echo             DMS SERVER - AUTO RESTART
echo =====================================================
echo.
echo [INFO] System initializing...
echo [TIME] %date% %time%
echo -----------------------------------------------------
echo [INFO] Current directory: %cd%
echo -----------------------------------------------------
echo [INFO] Starting Next.js server on PORT 5175...
echo -----------------------------------------------------

:: Set port to 5175 for Next.js
set PORT=5175

:: Check if build exists, if not build it
if not exist ".next" (
    echo [INFO] Production build not found. Building the app first...
    call npm run build
    echo -----------------------------------------------------
)

:: Start the production server. If it stops or crashes, it will proceed to the next lines.
call npm start

echo.
echo -----------------------------------------------------
echo [WARNING] Server stopped or crashed!
echo [TIME] %date% %time%
echo [INFO] Restarting automatically in 5 seconds...
echo -----------------------------------------------------
timeout /t 5 /nobreak >nul
goto loop
