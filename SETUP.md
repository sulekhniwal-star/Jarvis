# 📦 JARVIS Installation & Setup Guide

## Prerequisites

- Python 3.8 or higher
- Microphone
- Internet connection (for Gemini API and speech recognition)
- 200MB free disk space

---

## Step 1: Install Python Dependencies

### Windows
```bash
cd f:\Jarvis
pip install -r requirements.txt
```

### If you encounter issues with PyAudio:

JARVIS includes a pre-built wheel for Windows Python 3.14:
```bash
pip install pyaudio-0.2.14-cp314-cp314-win_amd64.whl
```

Or install from pip:
```bash
pip install pyaudio
```

---

## Step 2: Get Gemini API Key

1. **Go to Google AI Studio**
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API Key**
   - Click "Create API Key"
   - Copy the generated key

3. **Save It Somewhere Safe**
   - You'll need this for running JARVIS

---

## Step 3: Configure JARVIS

### Option A: Environment Variable (Recommended)
```bash
# Windows - Set environment variable
setx GEMINI_API_KEY "your-api-key-here"

# Then run
python jarvis.py
```

### Option B: Command Line Argument
```bash
python jarvis.py --api-key "your-api-key-here"
```

### Option C: Edit Code
Edit `jarvis.py` line 315:
```python
parser.add_argument('--api-key', type=str, default="YOUR_API_KEY_HERE",
```

Replace `YOUR_API_KEY_HERE` with your actual API key.

---

## Step 4: Update Memory (Optional)

Edit `memory.json` to customize:

```json
{
    "owner": "Your Name",
    "city": "Your City",
    "preferences": {
        "news": "technology",
        "music": "lofi",
        "language": "en-in",
        "units": "celsius"
    }
}
```

---

## Step 5: Run JARVIS

### Terminal Mode (Default)
```bash
python jarvis.py --api-key "your-api-key"
```

### GUI Mode
```bash
python jarvis.py --api-key "your-api-key" --gui
```

---

## ✅ Testing Microphone

Before running JARVIS, test your microphone:

```bash
python -c "
import speech_recognition as sr
r = sr.Recognizer()
with sr.Microphone() as source:
    print('Say something...')
    audio = r.listen(source, timeout=5)
    try:
        text = r.recognize_google(audio)
        print(f'You said: {text}')
    except:
        print('Could not understand audio')
"
```

---

## 🎤 Using JARVIS

### Voice Commands

1. **Say "Hey Jarvis"** - Activates assistant
2. **After activation**, give your command:
   - "What time is it?"
   - "Tell me a joke"
   - "Open Chrome"
   - "Set volume to 50"
   - "What's the weather?"
   - "Shutdown"

### GUI Controls

When running with `--gui`:
- 🎤 **Start Listening** - Begin voice input
- 🔊 **Speak** - Read response aloud
- ❌ **Exit** - Close JARVIS
- Watch conversation history in real-time

---

## 🔧 Troubleshooting

### Microphone Not Working

1. **Check if microphone is enabled**
   ```bash
   python -m speech_recognition
   ```

2. **List available microphones**
   ```bash
   python -c "import speech_recognition as sr; print([sr.Microphone.list_microphone_indexes()])"
   ```

3. **Adjust noise threshold** in `jarvis.py`:
   ```python
   self.recognizer.pause_threshold = 0.8  # Default is 1
   ```

### API Key Not Working

1. Verify key at: https://aistudio.google.com/app/apikey
2. Check internet connection
3. Ensure API key has no extra spaces
4. Check if API is enabled for your Google account

### PyQt5 GUI Issues

If GUI doesn't work, system falls back to terminal mode automatically.

To install PyQt5:
```bash
pip install PyQt5
```

### Speech Recognition Timeout

Increase timeout in `jarvis.py`:
```python
def listen(self, timeout: int = 10):  # Changed from 5 to 10
```

---

## 📊 File Structure

```
f:\Jarvis\
├── jarvis.py                    # Main assistant
├── memory.py                    # Memory system
├── intent_detector.py           # AI intent detection
├── wake_word.py                 # Wake word detector
├── gui.py                       # PyQt5 GUI
├── memory.json                  # User data (persistent)
├── requirements.txt             # Python packages
├── pyaudio-0.2.14-cp314-cp314-win_amd64.whl  # Pre-built wheel
└── README.md                    # Documentation
```

---

## 🚀 Quick Start Commands

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set your API key (choose one method)
# Method A: Environment variable
setx GEMINI_API_KEY "your-key"

# Method B: Direct command
python jarvis.py --api-key "your-key"

# 3. Run JARVIS
python jarvis.py --api-key "your-key"

# 4. Or with GUI
python jarvis.py --api-key "your-key" --gui

# 5. Say "Hey Jarvis" and give commands!
```

---

## 📱 System Requirements

| Component | Requirement |
|-----------|-----------|
| OS | Windows 10+ |
| Python | 3.8+ |
| RAM | 512MB minimum |
| Disk | 200MB |
| Internet | Required for API |
| Microphone | USB or built-in |

---

## 🔐 Security Notes

- Never share your API key
- Keep it in environment variables, not in code
- Rotate keys periodically if exposed
- API key usage is free under Google's free tier (but has quotas)

---

## 📞 Support & Help

If you encounter issues:

1. Check the troubleshooting section above
2. Verify microphone is working: `python -m speech_recognition`
3. Test API key at: https://aistudio.google.com/app/apikey
4. Check internet connection
5. Review error messages in console

---

## 🎯 Next Steps

After successful installation:

1. **Customize memory.json** - Add your preferences
2. **Add your contacts** - Store phone numbers and emails
3. **Train JARVIS** - Let it learn your habits
4. **Explore features** - Try different commands
5. **Extend functionality** - Add custom commands

---

**You're all set! Say "Hey Jarvis" and let the AI assistant take over!** 🤖✨
