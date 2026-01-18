# 🤖 JARVIS PC Integration Guide

## Quick Start

### Method 1: Direct Launch (Simplest)
```bash
.venv\Scripts\python.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940
```

### Method 2: Admin Batch Launcher
Run the admin launcher batch file in File Explorer:
```
launch_jarvis_admin.bat
```
This automatically requests admin privileges.

### Method 3: Desktop Shortcut
Run the setup script to create a desktop shortcut with admin privileges:
```bash
.venv\Scripts\python.exe create_desktop_shortcut.py
```

### Method 4: Windows Startup Integration
Run the PC integration setup:
```bash
setup_pc_integration.bat
```

---

## Voice Commands Reference

### System Control
- **"Hey Jarvis"** - Wake JARVIS (if always listening)
- **"Exit"** / **"Quit"** / **"Goodbye"** - Exit application
- **"Shutdown"** - Shutdown computer (5-second countdown)
- **"Restart"** - Restart computer (5-second countdown)

### Volume Control ⭐
- **"Increase the volume"** - Raise volume by 10%
- **"Decrease the volume"** - Lower volume by 10%
- **"Set volume to 50"** - Set volume to specific level (0-100%)
- **"Mute"** - Mute audio
- **"Unmute"** - Unmute audio
- **"Turn up the volume"** - Increase volume
- **"Turn down the volume"** - Decrease volume

### Information
- **"What time is it?"** - Tell current time
- **"What's the weather?"** - Weather in your location
- **"What's the weather in Mumbai?"** - Weather in specific location

### Entertainment
- **"Tell me a joke"** - Random joke
- **"Make me laugh"** - Random joke

### Applications
- **"Open Chrome"** - Launch Google Chrome
- **"Open Notepad"** - Open Notepad
- **"Open Calculator"** - Open Calculator
- **"Open VSCode"** - Open Visual Studio Code
- **"Open Spotify"** - Open Spotify website

### General Questions
- **"How are you?"** - AI response
- **"What can you do?"** - Capabilities
- **"Help me"** - AI assistance

---

## Features

✅ **Voice Input** - Sounddevice microphone integration (Python 3.14 compatible)
✅ **Volume Control** - Full Windows volume control with pycaw
✅ **AI Responses** - Gemini API integration for smart answers
✅ **Memory System** - 50-conversation history, user preferences
✅ **Intent Detection** - Keyword-based + AI-powered classification
✅ **Wake Word** - "Hey Jarvis" detection (framework ready)
✅ **Multi-modal** - Voice OR text input (with fallback)
⏳ **GUI** - PyQt5 interface available (optional)

---

## System Requirements

- **Python:** 3.14+
- **OS:** Windows 10/11
- **Microphone:** Required for voice input
- **Internet:** Required for AI responses & weather
- **API Key:** Already configured (AIzaSyAA...)

---

## Troubleshooting

### Volume Control Not Working
1. Run JARVIS with admin privileges
2. Ensure pycaw is installed: `.venv\Scripts\pip install pycaw comtypes`
3. Check Windows audio settings

### Microphone Not Detected
1. Verify microphone is connected and enabled in Windows settings
2. Test with: `.venv\Scripts\python.exe -c "import sounddevice as sd; print(sd.default)"`
3. Check for other applications using the mic

### API Key Issues
- Ensure API key is valid and has Generative AI API enabled
- Check internet connection
- Fallback to keyword detection (no API required)

### Text Input Not Working
- Press Enter after typing your command
- Don't include 'exit' command without quotes

---

## Advanced Configuration

### Change User Name
Edit `memory.json`:
```json
{
  "owner": "Your Name",
  "city": "Your City"
}
```

### Add Custom Applications
Edit jarvis.py, find `_open_application()` method and add to `app_paths`:
```python
'app_name': "C:\\Path\\To\\Application.exe"
```

### Adjust Microphone Sensitivity
Edit jarvis.py, in `listen_with_sounddevice()`:
```python
duration = 10  # Increase for longer listening period
```

---

## Audio System Integration

JARVIS uses:
- **Input:** sounddevice (microphone capture)
- **Output:** pyttsx3 (text-to-speech, optional)
- **Control:** pycaw (Windows volume control)

All with graceful fallbacks if not available.

---

## Performance

- **Startup Time:** ~2-3 seconds
- **Voice Recognition:** ~1-2 seconds per command
- **AI Response:** ~2-5 seconds (depends on API)
- **Memory:** ~100-150 MB RAM

---

## File Structure

```
F:\Jarvis\
├── jarvis.py                 # Main application
├── memory.py                 # Memory system
├── intent_detector.py        # Intent classification
├── wake_word.py             # Wake word detection
├── gui.py                   # PyQt5 interface (optional)
├── requirements.txt         # Python dependencies
├── memory.json             # User data & history
├── launch_jarvis_admin.bat # Admin launcher
├── setup_pc_integration.bat # Windows integration
└── README.md               # Documentation
```

---

## Legal Notice

- Google Generative AI API subject to Google's Terms of Service
- sounddevice & related libraries licensed under BSD/MIT
- User data stored locally in memory.json

---

**Last Updated:** January 18, 2026
**Version:** 2.0 (Sounddevice Edition)
