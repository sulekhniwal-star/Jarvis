@echo off
REM JARVIS - Standard Launcher (No Admin Required)
REM This version runs JARVIS without requesting admin privileges
REM Admin is only needed for volume control; other features work without it

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
    echo ✅ Running with administrative privileges (volume control enabled)
) else (
    echo ⚠️  Running without admin (voice input & AI will work, volume control disabled)
)

echo.

REM Run JARVIS without requesting admin
.venv\Scripts\pythonw.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940

if %errorLevel% neq 0 (
    REM If pythonw fails, try python with window
    .venv\Scripts\python.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940
)
