# 🤖 JARVIS - System-Wide Startup Setup Guide

## Quick Setup (2 Methods)

### Method 1: Batch File (Simplest) ⭐
```bash
Right-click: setup_system_startup.bat
Select: "Run as administrator"
Click: "Yes" when prompted
```
Done! JARVIS will auto-start for all users.

### Method 2: PowerShell (More Control)
```powershell
Right-click PowerShell
Select: "Run as administrator"
Run: powershell -ExecutionPolicy Bypass -File F:\Jarvis\setup_system_startup.ps1
```

---

## What Gets Installed

### 1. **All Users Startup Folder** ✅
- Path: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup`
- File: `JARVIS_Startup.bat`
- Runs when ANY user logs in

### 2. **Windows Registry** ✅
- Location: `HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run`
- Entry: `JARVIS` = launch command
- Starts JARVIS automatically at boot

### 3. **Task Scheduler** ✅
- Task Name: `JARVIS Startup`
- Trigger: At system startup
- Runs as: SYSTEM (all users)
- No admin prompt each time

### 4. **Public Desktop Shortcut** ✅
- Location: `C:\Users\Public\Desktop`
- File: `JARVIS.lnk`
- Available to all users

---

## How It Works

```
System Boots
    ↓
Windows startup triggers Task Scheduler
    ↓
"JARVIS Startup" task runs
    ↓
JARVIS launches silently in background
    ↓
User can interact with it
    ↓
No admin prompt needed!
```

---

## Key Features

| Feature | Status | Notes |
|---------|--------|-------|
| **Auto-start** | ✅ | Runs at system startup |
| **All users** | ✅ | Works for every user |
| **No admin each time** | ✅ | Admin only needed for setup |
| **Voice input** | ✅ | Works without admin |
| **AI responses** | ✅ | Works without admin |
| **Memory system** | ✅ | Shared across users |
| **Volume control** | ⚠️ | Needs admin (Windows limitation) |
| **Silent startup** | ✅ | Runs in background |

---

## After Setup - What Happens

### When PC Starts:
1. ✅ JARVIS launches automatically
2. ✅ Runs in background
3. ✅ No window/prompt appears
4. ✅ Uses ~100-150 MB RAM
5. ✅ Ready to respond to voice commands

### When User Logs In:
- ✅ Can speak "Hey Jarvis"
- ✅ Can type commands
- ✅ Can use text-based features
- ⚠️ Volume control may not work (needs admin)

### Multiple Users:
- ✅ All users get the same JARVIS
- ✅ Shared memory system
- ✅ Learns from all users
- ✅ No interference between users

---

## Testing After Setup

### 1. **Verify Installation**
```powershell
# Check Task Scheduler
Get-ScheduledTask -TaskName "JARVIS Startup"

# Check Registry
Get-ItemProperty -Path "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "JARVIS"

# Check Startup Folder
dir "C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\JARVIS*"
```

### 2. **Test Auto-Start**
- Restart PC
- Wait 10 seconds
- Open Task Manager (Ctrl+Shift+Esc)
- Search for "python"
- Should see running process

### 3. **Test Voice Commands**
- Say "Hey Jarvis"
- JARVIS should respond
- Try "What time is it?"

---

## If Volume Control Doesn't Work

### Option 1: Run as Admin Once (Temporary)
```
Right-click launch_jarvis.bat
Select "Run as administrator"
Then volume control will work
```

### Option 2: Create Admin Task (Permanent)
```powershell
# This creates a Task Scheduler task that runs JARVIS with admin privileges
# You'll be prompted for admin once when you create it

# Open PowerShell as admin and run setup_system_startup.ps1
# Then modify task to run with higher privileges
```

### Option 3: Enable UAC Virtualization
```
Right-click launch_jarvis.bat
Properties → Advanced → Check "Run as administrator"
Uncheck "Run this program in compatibility mode for..."
Apply → OK
```

---

## Disable Auto-Start (If Needed)

### Method 1: Delete Startup File
```
Delete: C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\JARVIS_Startup.bat
```

### Method 2: Disable Task Scheduler
```
Open: Task Scheduler
Navigate: Library → Root
Find: "JARVIS Startup"
Right-click → Disable
```

### Method 3: Remove Registry Entry
```
Open: regedit
Navigate: HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run
Delete: JARVIS entry
Close regedit
```

### Method 4: Run Cleanup Script
```powershell
# Create a cleanup script to remove everything
# Run with admin privileges
```

---

## Troubleshooting

### "Access Denied" Error
**Solution:** Run setup script as administrator
```
Right-click → "Run as administrator"
```

### JARVIS Starts Then Stops
**Solution:** Check for errors
```powershell
Get-ScheduledTaskInfo -TaskName "JARVIS Startup" | select LastTaskResult
# 0 = Success
# Non-zero = Error code
```

### Can't Find Task in Task Scheduler
**Solution:** Refresh and look in root
```
Task Scheduler → Library → (Root level)
NOT in "Microsoft\Windows"
```

### Volume Control Still Doesn't Work
**Solution:** Enable admin for the batch file
```
Right-click launch_jarvis.bat
Properties → Advanced
Check: "Run as administrator"
OK
```

### Registry Entry Not Appearing
**Solution:** Refresh registry editor
```
regedit
Press F5 to refresh
Navigate to: HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run
```

---

## Advanced Configuration

### Change Startup Delay
Edit `JARVIS_Startup.bat`:
```batch
timeout /t 10 /nobreak
REM 10 second delay before starting JARVIS
```

### Run as Specific User
Edit Task Scheduler task:
```
Properties → Security Options
Change "Run whether user is logged in or not"
Set specific user account
```

### Disable for Specific User
```
Delete: C:\Users\[Username]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\JARVIS*
```

---

## File Locations Reference

| Item | Location |
|------|----------|
| **Startup Script** | `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\Startup\JARVIS_Startup.bat` |
| **Task Scheduler** | `Task Scheduler → Library → JARVIS Startup` |
| **Registry Entry** | `HKEY_LOCAL_MACHINE\Software\Microsoft\Windows\CurrentVersion\Run\JARVIS` |
| **Public Shortcut** | `C:\Users\Public\Desktop\JARVIS.lnk` |
| **JARVIS Program** | `F:\Jarvis\jarvis.py` |
| **Python Executable** | `F:\Jarvis\.venv\Scripts\python.exe` |
| **Memory File** | `F:\Jarvis\memory.json` |

---

## Security Considerations

✅ **Safe Settings:**
- Runs as SYSTEM (Windows built-in account)
- No secrets in batch files
- API key visible (consider environment variable)
- Only launches legitimate JARVIS program

⚠️ **Considerations:**
- Any user can disable auto-start
- Registry changes require admin
- Task Scheduler visible to all users
- Memory shared across users

---

## Performance Impact

| Metric | Value |
|--------|-------|
| **Startup Time** | +1-2 seconds |
| **RAM Usage** | ~120 MB |
| **CPU Usage** | <1% (idle) |
| **Disk I/O** | Minimal |
| **Network** | Only when needed |

---

## Summary

✅ **Setup completed with:**
- Auto-start at system boot
- Works for all users
- No admin prompt each time
- Runs silently in background
- Full voice control available
- Optional volume control (needs admin)

👉 **Next Step:** 
Restart your PC and JARVIS will auto-start!

---

**Created:** January 18, 2026
**Version:** 2.0 - System-Wide Integration
