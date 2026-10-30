@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.11 or newer is required. Install Python, then try again.
  pause
  exit /b 1
)
python launcher.py
if errorlevel 1 pause
