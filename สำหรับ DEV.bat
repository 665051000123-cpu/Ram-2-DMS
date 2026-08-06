@echo off
title DMS Server - Auto Reload (Dev Mode)
color 0E

echo =====================================================
echo             DMS SERVER - DEV MODE (HOT RELOAD)
echo =====================================================
echo.
echo [INFO] Starting Auto-Scanner Sync Service...
start "DMS Scanner Sync" cmd /c "title DMS Scanner Sync && node scanner-watcher.js"

echo [INFO] Starting Next.js Dev Server with Auto-Reload...
echo [INFO] Any code changes will automatically refresh the page.
echo -----------------------------------------------------

call npm run dev

pause
