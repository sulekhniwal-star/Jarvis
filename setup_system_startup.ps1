# JARVIS - System-Wide Startup Setup (PowerShell)
# Run this ONCE with admin privileges for all users
# After that, JARVIS runs automatically without admin prompt

param(
    [bool]$RequireAdmin = $true
)

# Check if running as admin
$isAdmin = [Security.Principal.WindowsIdentity]::GetCurrent().Groups -contains 'S-1-5-32-544'

if (-not $isAdmin -and $RequireAdmin) {
    Write-Host "⚠️  This script requires administrative privileges" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please run it as administrator:" -ForegroundColor Yellow
    Write-Host "  1. Right-click on PowerShell"
    Write-Host "  2. Select 'Run as administrator'"
    Write-Host "  3. Run: powershell -ExecutionPolicy Bypass -File setup_system_startup.ps1"
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "         JARVIS - System-Wide Startup Setup" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$jarvisDir = "F:\Jarvis"
$pythonExe = "$jarvisDir\.venv\Scripts\pythonw.exe"
$jarvisScript = "$jarvisDir\jarvis.py"
$apiKey = "AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"

# 1. Add to All Users Startup
Write-Host "📌 Setting up startup for ALL USERS..." -ForegroundColor Cyan
$allUsersStartup = "$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"

$startupBatch = @"
@echo off
REM JARVIS - Auto-start launcher for all users
cd /d "$jarvisDir"
start /B "" "$pythonExe" "$jarvisScript" --api-key $apiKey
"@

$startupBatch | Out-File -FilePath "$allUsersStartup\JARVIS_Startup.bat" -Encoding ASCII -Force
Write-Host "✅ Created: $allUsersStartup\JARVIS_Startup.bat" -ForegroundColor Green

# 2. Add to Registry (HKLM - for all users)
Write-Host ""
Write-Host "📌 Adding to Windows registry (all users)..." -ForegroundColor Cyan

$regPath = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run"
$command = "cmd /c start /B `"`" `"$pythonExe`" `"$jarvisScript`" --api-key $apiKey"

try {
    New-ItemProperty -Path $regPath -Name "JARVIS" -Value $command -PropertyType String -Force | Out-Null
    Write-Host "✅ Registry entry created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Registry entry failed: $_" -ForegroundColor Yellow
}

# 3. Create Task Scheduler task
Write-Host ""
Write-Host "📌 Creating Windows Task Scheduler task..." -ForegroundColor Cyan

# Stop JARVIS if running
Stop-Process -Name "python*" -Force -ErrorAction SilentlyContinue

# Delete old task
schtasks /delete /tn "JARVIS Startup" /f 2>$null

# Create new task
$action = New-ScheduledTaskAction -Execute $pythonExe -Argument "`"$jarvisScript`" --api-key $apiKey"
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

try {
    Register-ScheduledTask -TaskName "JARVIS Startup" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -RunLevel Highest `
        -Force | Out-Null
    Write-Host "✅ Task Scheduler task created" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Task Scheduler failed: $_" -ForegroundColor Yellow
}

# 4. Create desktop shortcut for all users
Write-Host ""
Write-Host "📌 Creating desktop shortcut for all users..." -ForegroundColor Cyan

$publicDesktop = "$env:PUBLIC\Desktop"
$shortcutPath = "$publicDesktop\JARVIS.lnk"

try {
    $shell = New-Object -ComObject WScript.Shell
    $link = $shell.CreateShortcut($shortcutPath)
    $link.TargetPath = "$jarvisDir\launch_jarvis.bat"
    $link.WorkingDirectory = $jarvisDir
    $link.Description = "JARVIS - Advanced AI Voice Assistant"
    $link.WindowStyle = 1
    $link.Save()
    Write-Host "✅ Created: $publicDesktop\JARVIS.lnk" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Desktop shortcut failed: $_" -ForegroundColor Yellow
}

# Summary
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "          ✅ Setup Complete!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

Write-Host "📋 What was configured:" -ForegroundColor Cyan
Write-Host "   1. All Users Startup Folder" -ForegroundColor White
Write-Host "      → $allUsersStartup\JARVIS_Startup.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Windows Registry (HKLM)" -ForegroundColor White
Write-Host "      → HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Task Scheduler" -ForegroundColor White
Write-Host "      → Task: 'JARVIS Startup'" -ForegroundColor Gray
Write-Host "      → Trigger: At system startup" -ForegroundColor Gray
Write-Host ""
Write-Host "   4. Public Desktop Shortcut" -ForegroundColor White
Write-Host "      → All users can see and use it" -ForegroundColor Gray
Write-Host ""

Write-Host "🎯 How it works:" -ForegroundColor Cyan
Write-Host "   • JARVIS starts automatically at system startup" -ForegroundColor White
Write-Host "   • Works for ALL users (anyone logging in)" -ForegroundColor White
Write-Host "   • NO admin prompt required each time" -ForegroundColor White
Write-Host "   • Runs silently in background" -ForegroundColor White
Write-Host "   • Memory system persists across users" -ForegroundColor White
Write-Host ""

Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   • Microphone features work without admin" -ForegroundColor White
Write-Host "   • Volume control requires admin (system limitation)" -ForegroundColor White
Write-Host "   • AI features need internet connection" -ForegroundColor White
Write-Host ""

Write-Host "🔄 To test:" -ForegroundColor Cyan
Write-Host "   1. Restart your PC" -ForegroundColor White
Write-Host "   2. JARVIS should start automatically" -ForegroundColor White
Write-Host "   3. Check: Ctrl+Shift+Esc → Search 'python'" -ForegroundColor White
Write-Host ""

Write-Host "🛑 To disable JARVIS auto-start:" -ForegroundColor Cyan
Write-Host "   Option 1: Delete from startup folder" -ForegroundColor White
Write-Host "      → $allUsersStartup\JARVIS_Startup.bat" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option 2: Disable Task Scheduler task" -ForegroundColor White
Write-Host "      → Open Task Scheduler" -ForegroundColor Gray
Write-Host "      → Find 'JARVIS Startup'" -ForegroundColor Gray
Write-Host "      → Right-click → Disable" -ForegroundColor Gray
Write-Host ""
Write-Host "   Option 3: Remove registry entry" -ForegroundColor White
Write-Host "      → regedit" -ForegroundColor Gray
Write-Host "      → HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run" -ForegroundColor Gray
Write-Host "      → Delete 'JARVIS'" -ForegroundColor Gray
Write-Host ""

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "✨ Next Step:" -ForegroundColor Green
Write-Host "   Restart your PC and JARVIS will start automatically!" -ForegroundColor Cyan
Write-Host ""
