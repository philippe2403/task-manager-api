@echo off
cd /d %~dp0

start "Backend" cmd /k "%~dp0start_backend.cmd"
start "Frontend" cmd /k "%~dp0start_frontend.cmd"

timeout /t 5 >nul
start http://127.0.0.1:5173
