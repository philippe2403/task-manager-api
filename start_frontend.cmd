@echo off
cd /d %~dp0frontend

REM Force Vite to bind to IPv4 on a fixed port
npm run dev -- --host 127.0.0.1 --port 5173

pause
