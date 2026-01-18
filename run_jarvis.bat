@echo off
REM JARVIS Runner Script
REM Usage: run_jarvis.bat [api-key] [--gui]

setlocal enabledelayedexpansion

REM Get the script directory
set "SCRIPT_DIR=%~dp0"

REM Use provided API key or ask for it
if "%1"=="" (
    echo.
    echo ===============================================
    echo   JARVIS - Advanced AI Voice Assistant
    echo ===============================================
    echo.
    set /p API_KEY="Enter your Gemini API Key: "
    if "!API_KEY!"=="" (
        echo Error: API Key is required!
        echo Get one at: https://aistudio.google.com/app/apikey
        pause
        exit /b 1
    )
) else (
    set "API_KEY=%1"
)

REM Check for GUI flag
set "GUI_FLAG="
if "%2"=="--gui" (
    set "GUI_FLAG=--gui"
)

REM Run JARVIS with virtual environment
echo.
echo Starting JARVIS...
echo.
cd /d "%SCRIPT_DIR%"
.venv\Scripts\python.exe jarvis.py --api-key "%API_KEY%" %GUI_FLAG%

pause
