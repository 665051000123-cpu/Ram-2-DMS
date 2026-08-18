@echo off
title DMS Server - PM2 Manager
color 0B

echo =====================================================
echo          DMS SERVER - PM2 PRODUCTION MANAGER
echo =====================================================
echo.
echo [INFO] Checking and installing PM2 (if not exists)...
call npm install -g pm2

echo.
echo [INFO] Generating Prisma Client...
call npx prisma generate

echo.
echo [INFO] Building Next.js production app...
call npm run build

echo.
echo [INFO] Starting PM2 services...
call npx pm2 start ecosystem.config.js
call npx pm2 save

echo.
echo =====================================================
echo [SUCCESS] System is now running in the background!
echo =====================================================
echo.
echo Useful PM2 Commands:
echo - Check status: npx pm2 status
echo - View logs: npx pm2 logs
echo - Stop all services: npx pm2 stop all
echo - Restart all services: npx pm2 restart all
echo.
pause
