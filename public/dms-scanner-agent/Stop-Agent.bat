@echo off
title Stop DMS Scanner Agent
echo Stopping DMS Scanner Agent...

:: This will hit the /shutdown endpoint on all possible ports
powershell -Command "for ($p=35555; $p -le 35565; $p++) { try { Invoke-RestMethod -Uri ('http://localhost:' + $p + '/shutdown') -Method GET -TimeoutSec 1 -ErrorAction SilentlyContinue | Out-Null } catch {} }"

echo Agent stopped successfully!
timeout /t 2 >nul
