@echo off
REM JARVIS - System-Wide Startup Setup
REM This script sets up JARVIS to run for ALL USERS at system startup
REM Run this ONCE with admin privileges

cls
echo.
echo ========================================================
echo         JARVIS - System-Wide Startup Setup
echo ========================================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ⚠️  This script requires administrative privileges
    echo.
    echo Please follow these steps:
    echo 1. Right-click this file: setup_system_startup.bat
    echo 2. Select "Run as administrator"
    echo 3. Click "Yes" when prompted
    echo.
    pause
    exit /b 1
)

echo ✅ Running with administrative privileges
echo.

set JARVIS_DIR=F:\Jarvis
set JARVIS_SCRIPT=%JARVIS_DIR%\jarvis.py
set PYTHON_EXE=%JARVIS_DIR%\.venv\Scripts\pythonw.exe
set API_KEY=AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940

REM Option 1: Add to All Users Startup Folder
echo 📌 Setting up startup for ALL USERS...
echo.

set ALL_USERS_STARTUP=%ProgramData%\Microsoft\Windows\Start Menu\Programs\Startup

REM Create the startup batch file
echo Creating startup launcher...
(
    echo @echo off
    echo REM JARVIS - Auto-start launcher for all users
    echo REM This file runs JARVIS without admin prompt
    echo.
    echo cd /d "%JARVIS_DIR%"
    echo start /B "" "%PYTHON_EXE%" "%JARVIS_SCRIPT%" --api-key %API_KEY%
) > "%ALL_USERS_STARTUP%\JARVIS_Startup.bat"

echo ✅ Created: %ALL_USERS_STARTUP%\JARVIS_Startup.bat

REM Option 2: Add to Registry (HKLM - runs for all users)
echo.
echo 📌 Adding to Windows registry (all users)...

REM Create a temporary registry script
set REG_SCRIPT=%TEMP%\jarvis_registry.reg

(
    echo Windows Registry Editor Version 5.00
    echo.
    echo [HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run]
    echo "JARVIS"="cmd /c start /B \"\" \"%PYTHON_EXE%\" \"%JARVIS_SCRIPT%\" --api-key %API_KEY%"
) > "%REG_SCRIPT%"

REM Import registry
reg import "%REG_SCRIPT%"

if %errorLevel% equ 0 (
    echo ✅ Registry entry created
) else (
    echo ⚠️  Registry entry failed
)

REM Clean up
del "%REG_SCRIPT%"

REM Option 3: Create Task Scheduler task for all users
echo.
echo 📌 Creating Windows Task Scheduler task...

taskkill /F /IM jarvis.py >nul 2>&1

REM Delete old task if exists
schtasks /delete /tn "JARVIS Startup" /f >nul 2>&1

REM Create new task that runs at system startup for all users
schtasks /create /tn "JARVIS Startup" ^
    /tr "cmd /c start /B \"\" \"%PYTHON_EXE%\" \"%JARVIS_SCRIPT%\" --api-key %API_KEY%" ^
    /sc onstart ^
    /ru SYSTEM ^
    /f

if %errorLevel% equ 0 (
    echo ✅ Task Scheduler task created
) else (
    echo ⚠️  Task Scheduler failed
)

REM Create desktop shortcut for all users
echo.
echo 📌 Creating desktop shortcut for all users...

set PUBLIC_DESKTOP=%PUBLIC%\Desktop
set SHORTCUT_PATH=%PUBLIC_DESKTOP%\JARVIS.lnk

REM VBS script to create shortcut
set VBS_FILE=%TEMP%\create_jarvis_shortcut.vbs

(
    echo Set objWSH = CreateObject("WScript.Shell"^)
    echo Set objLink = objWSH.CreateShortcut("%SHORTCUT_PATH%"^)
    echo.
    echo objLink.TargetPath = "%JARVIS_DIR%\launch_jarvis.bat"
    echo objLink.WorkingDirectory = "%JARVIS_DIR%"
    echo objLink.Description = "JARVIS - Advanced AI Voice Assistant"
    echo objLink.WindowStyle = 1
    echo objLink.Save
) > "%VBS_FILE%"

cscript.exe "%VBS_FILE%"

if exist "%SHORTCUT_PATH%" (
    echo ✅ Created: %PUBLIC_DESKTOP%\JARVIS.lnk
) else (
    echo ⚠️  Desktop shortcut creation failed
)

del "%VBS_FILE%"

REM Summary
echo.
echo ========================================================
echo          ✅ Setup Complete!
echo ========================================================
echo.
echo 📋 What was configured:
echo    1. All Users Startup Folder
echo       → %ALL_USERS_STARTUP%\JARVIS_Startup.bat
echo.
echo    2. Windows Registry (HKLM)
echo       → HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run
echo.
echo    3. Task Scheduler
echo       → Task: "JARVIS Startup"
echo       → Trigger: At system startup
echo       → User: SYSTEM (all users)
echo.
echo    4. Public Desktop Shortcut
echo       → All users can see it
echo.
echo 🎯 How it works:
echo    • JARVIS will now start automatically when ANY user logs in
echo    • NO admin prompt required each time
echo    • Runs in background
echo    • Memory system persists across users
echo.
echo ⚠️  Important:
echo    • Microphone/Volume features may require user interaction
echo    • First time each user logs in, Windows may ask for permissions
echo    • API calls require internet connection
echo.
echo 🔄 To test:
echo    • Restart your PC
echo    • JARVIS should start automatically
echo    • Check running processes: Ctrl+Shift+Esc → Search "python"
echo.
echo 🛑 To disable:
echo    • Delete: %ALL_USERS_STARTUP%\JARVIS_Startup.bat
echo    • Or: Control Panel → Task Scheduler → Delete "JARVIS Startup" task
echo    • Or: Registry Editor → Delete JARVIS entry from Run
echo.
echo ========================================================
echo.

pause
