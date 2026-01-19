# Advanced Jarvis AI Assistant

A next-generation voice-activated AI assistant with modular architecture, multi-AI integration, and advanced capabilities.

## 🚀 ADVANCED FEATURES

### 🧠 **Multi-AI Intelligence**
- **Gemini Pro**: Primary AI with vision capabilities
- **OpenAI GPT**: Fallback AI for enhanced responses
- **Modular Skills**: Extensible skill system (math, trivia, coding help)
- **Learning Mode**: Interactive fact learning and recall

### 🎤 **Enhanced Voice & Interaction**
- **Wake Word Detection**: "Hey Jarvis" or "Jarvis"
- **Emotion Control**: Cheerful, serious, excited, calm voices
- **Multilingual Support**: Auto-detect and translate languages
- **Custom Commands**: Create personalized voice commands

### 🖥️ **System Integration**
- **Cross-Platform**: Windows, macOS, Linux support
- **GUI Dashboard**: Visual interface with command history
- **REST API**: Mobile app integration endpoints
- **Authentication**: PIN-based security for sensitive commands

### 🌐 **Advanced Capabilities**
- **Vision Analysis**: Screen and webcam analysis
- **Image Generation**: AI-powered image creation
- **News & Information**: Real-time headlines and data
- **Smart Memory**: Long-term conversation memory
- **Work Mode**: Auto-launch development environment

## 🔧 SETUP

1. **Install Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure API Keys** (edit `.env` file):
   - Gemini API (required): https://makersuite.google.com/app/apikey
   - OpenAI API (optional): https://platform.openai.com/api-keys
   - News API (optional): https://newsapi.org/register
   - Hugging Face (optional): https://huggingface.co/settings/tokens

## 🎯 USAGE

### Basic Mode:
```bash
python jarvis.py
```

### With GUI Dashboard:
```bash
python jarvis.py --gui
```

### With REST API:
```bash
python jarvis.py --api
```

### With Authentication:
```bash
python jarvis.py --auth pin
```

## 💬 EXAMPLE COMMANDS

### 🎨 **Creative & Visual**
- "Jarvis, what am I looking at?" (screen analysis)
- "Jarvis, generate image of a sunset over mountains"
- "Jarvis, look at me" (webcam analysis)

### 🧠 **Learning & Memory**
- "Jarvis, teach me that Python was created in 1991"
- "Jarvis, what did you learn about Python?"
- "Jarvis, remember I prefer coffee over tea"

### 🌍 **Information & Services**
- "Jarvis, tell me the news"
- "Jarvis, weather in Tokyo"
- "Jarvis, calculate 15 * 24"
- "Jarvis, play trivia game"

### 🔧 **System & Automation**
- "Jarvis, start work mode" (launches VS Code, Spotify, browser)
- "Jarvis, open Discord"
- "Jarvis, volume up"
- "Jarvis, take screenshot"

### 🎛️ **Customization**
- "Jarvis, create command hello response Hello there!"
- "Jarvis, change voice to british"
- "Jarvis, switch to spanish language"

## 🔌 API ENDPOINTS

When running with `--api` flag:

- `POST /api/command` - Send voice commands
- `GET /api/status` - Check system status

## 🛡️ SECURITY

- **PIN Authentication**: Protect sensitive commands
- **Secure API Keys**: Environment variable storage
- **Command Validation**: Input sanitization

## 🔧 REQUIREMENTS

- Python 3.7+
- Microphone access
- Internet connection (for AI services)
- Cross-platform compatibility

## 📱 MOBILE INTEGRATION

Use the REST API endpoints to build mobile apps that can:
- Send commands to Jarvis
- Receive responses
- Monitor system status

## 🎮 SKILL DEVELOPMENT

Extend Jarvis with custom skills:

```python
def my_custom_skill(query):
    return "Custom response"

jarvis.skill_manager.register_skill(
    'custom', my_custom_skill, ['keyword1', 'keyword2']
)
```

Your advanced Jarvis is now ready with enterprise-level capabilities!