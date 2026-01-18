@echo off
REM JARVIS Advanced AI Assistant - Admin Launcher
REM This script runs JARVIS with administrative privileges

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0

REM Change to the script directory
cd /d "%SCRIPT_DIR%"

REM API Key (replace with your own if needed)
set API_KEY=AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Requesting administrative privileges...
    REM Re-run the script with admin privileges
    powershell -Command "Start-Process cmd -ArgumentList '/c cd /d \"%SCRIPT_DIR%\" && .venv\Scripts\python.exe jarvis.py --api-key %API_KEY%' -Verb RunAs"
    exit /b
)

REM If we get here, we have admin privileges
echo.
echo ========================================================
echo             JARVIS - Running with Admin Privileges
echo ========================================================
echo.

REM Run JARVIS
.venv\Scripts\python.exe jarvis.py --api-key %API_KEY%

pause
