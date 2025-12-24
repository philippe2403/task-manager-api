@echo off
cd /d %~dp0

REM --- Activate venv ---
call "%~dp0.venv\Scripts\activate.bat"

REM --- Run using venv python explicitly ---
"%~dp0.venv\Scripts\python.exe" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

pause
