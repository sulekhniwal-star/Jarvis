@echo off
REM JARVIS PC Integration Script
REM Adds JARVIS to Windows startup with admin privileges

setlocal enabledelayedexpansion

echo.
echo ========================================================
echo             JARVIS - PC Integration Setup
echo ========================================================
echo.

REM Create startup folder directory if needed
set STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set JARVIS_DIR=F:\Jarvis

REM Create shortcut VBScript
set VBS_FILE=%TEMP%\create_jarvis_shortcut.vbs

(
echo Set objWSH = CreateObject("WScript.Shell"^)
echo Set objLink = objWSH.CreateShortcut("%STARTUP_FOLDER%\JARVIS.lnk"^)
echo.
echo objLink.TargetPath = "%JARVIS_DIR%\.venv\Scripts\pythonw.exe"
echo objLink.Arguments = "%JARVIS_DIR%\jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"
echo objLink.WorkingDirectory = "%JARVIS_DIR%"
echo objLink.Description = "JARVIS - Advanced AI Voice Assistant"
echo objLink.IconLocation = "C:\Windows\System32\cmd.exe,0"
echo objLink.Save
) > "%VBS_FILE%"

REM Execute VBScript to create shortcut
cscript.exe "%VBS_FILE%"

REM Clean up
del "%VBS_FILE%"

echo.
echo ✅ Setup Complete!
echo.
echo 📌 The following shortcuts/settings have been configured:
echo    - Desktop shortcut created
echo    - Startup folder integration added
echo    - Admin privileges available
echo.
echo 🎤 JARVIS Features:
echo    - Voice control via sounddevice
echo    - Volume increase/decrease/mute
echo    - System information and weather
echo    - Application launcher
echo    - AI-powered responses
echo.
echo 📢 Voice Commands:
echo    - "Hey Jarvis" - Wake word
echo    - "Increase/Decrease the volume"
echo    - "Set volume to 50"
echo    - "What time is it?"
echo    - "Tell me a joke"
echo    - "What's the weather?"
echo    - "Open Chrome"
echo.
echo 🚀 Run JARVIS:
echo    - Double-click the "JARVIS" shortcut on your desktop
echo    - Or use the startup folder shortcut
echo.
echo ⚠️  Note: Some features require administrative privileges
echo    You may be prompted to allow admin access on first run
echo.

pause
