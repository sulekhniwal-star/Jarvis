@echo off
REM JARVIS - Smart Launcher
REM Runs JARVIS with or without admin privileges
REM Admin is optional - only needed for volume control

title JARVIS - Advanced AI Voice Assistant

cd /d F:\Jarvis

echo.
echo ========================================================
echo          JARVIS - Advanced AI Voice Assistant
echo ========================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% equ 0 (
    echo ✅ Running with administrative privileges
    echo    Full features enabled (including volume control)
    echo.
) else (
    echo ⏱️  Running without admin privileges
    echo    Voice input and AI will work
    echo    Volume control will be disabled
    echo.
)

REM Run JARVIS (works with or without admin)
.venv\Scripts\python.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940

if %errorLevel% neq 0 (
    echo.
    echo ❌ JARVIS exited with error code: %errorLevel%
    pause
)
