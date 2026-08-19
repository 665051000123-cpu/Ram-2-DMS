@echo off
cd /d "%~dp0"
title DMS Scanner Agent
color 0B
echo ===================================================
echo    DMS Scanner Agent (Local Background Service)    
echo ===================================================
echo.
echo Starting agent...
node server.js
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ----------------------------------------------------
    echo [ERROR] ไม่พบโปรแกรม Node.js ในเครื่องของคุณ!
    echo.
    echo โปรดดาวน์โหลดและติดตั้ง Node.js จาก https://nodejs.org
    echo (เลือกเวอร์ชัน LTS แล้วกด Next จนติดตั้งเสร็จ)
    echo ----------------------------------------------------
    pause
)
