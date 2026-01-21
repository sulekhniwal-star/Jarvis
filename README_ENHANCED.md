# 🤖 JARVIS-X ENHANCED

### *Your Personal AI Operating System with 15+ Free APIs*

[![Python](https://img.shields.io/badge/Python-3.12+-blue.svg)](https://python.org)
[![Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-orange.svg)](https://ai.google.dev/)
[![APIs](https://img.shields.io/badge/Free%20APIs-15+-green.svg)](#free-apis-integrated)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

*The most advanced open-source AI assistant with extensive free API integration — Entertainment, Information, Productivity, and System Control in one powerful package*

---

## 🌟 What's New in Enhanced Version?

### 🆕 **15+ Free APIs Integrated**
- **Entertainment**: Jokes, Quotes, Facts, Advice, Cat Facts, Dog Images, NASA Pictures
- **Information**: Weather, News, Cryptocurrency, Exchange Rates, Definitions, IP Info, GitHub
- **Productivity**: Task Management, Reminders, Scheduling, Time Blocking, Focus Sessions
- **Communication**: Email, Telegram, SMS (Twilio), Social Media Integration

### 🚀 **Enhanced Features**

| 🎭 **Entertainment** | 📰 **Information** | 📋 **Productivity** | 🛠 **System Control** |
|:---:|:---:|:---:|:---:|
| Random jokes & quotes | Live weather data | Smart task management | PC automation |
| Interesting facts | Latest news headlines | Intelligent reminders | Voice file search |
| Daily advice | Crypto prices | Calendar scheduling | Email integration |
| NASA space pictures | Currency exchange | Focus time blocking | Web intelligence |

---

## 🎯 Voice Commands Examples

### 🎭 Entertainment & Fun
```
"Tell me a joke"
"Give me an inspiring quote"
"Share a random fact"
"Show me a cute dog picture"
"What's NASA's picture of the day?"
"Give me some advice"
"Cat fact please"
```

### 📰 Information & Research
```
"Weather in New York"
"Latest technology news"
"Bitcoin price"
"Exchange rates"
"Define artificial intelligence"
"My IP address"
"GitHub user octocat"
"Crypto market update"
```

### 📋 Productivity & Organization
```
"Add task: Buy groceries"
"List my tasks"
"Complete task 1"
"Remind me to call mom in 2 hours"
"Schedule meeting tomorrow at 2pm"
"Time block 25 minutes for coding"
"Productivity tips"
"What should I do today?"
```

### 🛠 System & Automation
```
"Open Chrome"
"What time is it?"
"Take a screenshot"
"Close all applications"
"System information"
"Help"
```

---

## 🔧 Free APIs Integrated

### 🎭 Entertainment APIs (No Key Required)
- **Quotable API** - Inspirational quotes
- **JokeAPI** - Random jokes and puns
- **Useless Facts API** - Interesting random facts
- **Advice Slip API** - Daily advice and tips
- **Cat Facts API** - Fun feline facts
- **Dog CEO API** - Cute dog pictures
- **NASA APOD API** - Astronomy pictures

### 📰 Information APIs
- **OpenWeatherMap** - Weather data (1000 calls/day free)
- **NewsAPI** - Latest headlines (1000 requests/day free)
- **CoinGecko** - Cryptocurrency prices (free, no key)
- **ExchangeRate-API** - Currency conversion (free, no key)
- **Dictionary API** - Word definitions (free, no key)
- **IPapi** - IP geolocation (free tier available)
- **GitHub API** - Repository and user data (free, no key)

### 🔧 Utility APIs
- **QR Server** - QR code generation (free, no key)
- **Alpha Vantage** - Stock market data (free tier)
- **Telegram Bot API** - Chat integration (completely free)

---

## ⚡ Quick Setup (3 Steps)

### 1. **Clone & Setup**
```bash
git clone https://github.com/your-username/JARVIS-X.git
cd JARVIS-X
python setup.py  # Automated setup script
```

### 2. **Configure APIs** (Optional)
```bash
# Copy template and add your free API keys
cp .env.template .env
# Edit .env file - most features work without keys!
```

### 3. **Launch JARVIS**
```bash
# Activate virtual environment
.venv\Scripts\activate  # Windows
source .venv/bin/activate  # macOS/Linux

# Run JARVIS
python main.py
```

---

## 🔑 API Keys Setup (All Free!)

### Required (Core Functionality)
- **Google Gemini AI**: [Get Free Key](https://makersuite.google.com/app/apikey) - Completely free!

### Optional (Enhanced Features)
- **News API**: [Get Free Key](https://newsapi.org/) - 1000 requests/day
- **OpenWeatherMap**: [Get Free Key](https://openweathermap.org/api) - 1000 calls/day
- **Telegram Bot**: [Create Bot](https://t.me/BotFather) - Completely free

### No Key Required (Works Out of Box)
- Jokes, Quotes, Facts, Advice
- Cryptocurrency prices
- Currency exchange rates
- Word definitions
- Dog/Cat pictures
- NASA space images
- GitHub user data

---

## 🏗 Enhanced Architecture

```
🎤 Voice Input → 🎯 Wake Word → 🧠 Intent Classification
                                        ↓
🎭 Entertainment ← 🔄 Enhanced Router ← 🤖 Gemini Brain → 💾 Memory System
📰 Information                           ↓
📋 Productivity                   🤖 Agent Mode → 📋 Task Execution
🛠 System Control                        ↓
                                 🌐 API Manager → 15+ Free APIs
                                        ↓
                                 🏠 Life-OS → 🎯 Goals & Planning
```

---

## 📊 Feature Comparison

| Feature | Basic JARVIS | Enhanced JARVIS-X |
|---------|:------------:|:-----------------:|
| Voice Recognition | ✅ | ✅ |
| Basic Chat | ✅ | ✅ |
| System Control | ✅ | ✅ |
| **Entertainment APIs** | ❌ | ✅ (7 APIs) |
| **Information APIs** | ❌ | ✅ (8 APIs) |
| **Productivity Suite** | ❌ | ✅ (Full Suite) |
| **Task Management** | ❌ | ✅ |
| **Smart Reminders** | ❌ | ✅ |
| **Weather & News** | ❌ | ✅ |
| **Crypto & Finance** | ❌ | ✅ |
| **NASA Integration** | ❌ | ✅ |
| **GitHub Integration** | ❌ | ✅ |

---

## 🎮 Interactive Demo

Try these commands after starting JARVIS:

```bash
# Entertainment
"Jarvis, tell me a joke"
"Give me a motivational quote"
"Show me today's NASA picture"

# Information
"What's the weather in Tokyo?"
"Latest AI news"
"Bitcoin price right now"

# Productivity
"Add task: Learn Python"
"Remind me to exercise in 30 minutes"
"What are my tasks for today?"

# System
"Open calculator"
"What time is it?"
"Help me with available commands"
```

---

## 🔧 Advanced Configuration

### Environment Variables
```env
# Core (Required)
GEMINI_API_KEY=your_key_here

# Information APIs (Optional)
NEWS_API_KEY=your_news_key
WEATHER_API_KEY=your_weather_key

# Communication (Optional)
EMAIL_ADDRESS=your_email@gmail.com
TELEGRAM_BOT_TOKEN=your_bot_token

# Assistant Settings
ASSISTANT_NAME=Jarvis
WAKE_WORD=jarvis
ENABLE_FACE_AUTH=false  # Set to true for face recognition
ENABLE_VOICE_AUTH=false # Set to true for voice authentication
```

### Skill Customization
```python
# Add custom skills in skills/ directory
from skills.custom_skill import CustomSkill

class MyCustomSkill:
    def can_handle(self, text):
        return "my command" in text.lower()
    
    def execute(self, text):
        return "Custom response!"
```

---

## 📈 Performance & Limits

### API Rate Limits (Free Tiers)
- **News API**: 1,000 requests/day
- **Weather API**: 1,000 calls/day
- **Gemini AI**: Generous free tier
- **Most others**: Unlimited or very high limits

### System Requirements
- **Python**: 3.12+
- **RAM**: 2GB minimum, 4GB recommended
- **Storage**: 1GB for dependencies
- **Internet**: Required for API features
- **Microphone**: For voice input
- **Webcam**: Optional, for face authentication

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🆕 Add New APIs
1. Create API integration in `core/api_manager.py`
2. Add corresponding skill in `skills/`
3. Update skill router
4. Add documentation

### 🐛 Bug Reports
- Use GitHub Issues
- Include error logs
- Describe reproduction steps

### 💡 Feature Requests
- Entertainment APIs
- Productivity tools
- System integrations
- Voice improvements

---

## 🔒 Privacy & Security

- **Local Processing**: Voice recognition runs locally
- **API Security**: Keys stored in environment variables
- **Data Privacy**: No personal data sent to APIs unnecessarily
- **Optional Auth**: Face and voice authentication can be disabled
- **Safe Mode**: Dangerous commands require confirmation

---

## 📚 Documentation

### Quick Links
- [Setup Guide](docs/setup.md)
- [API Integration Guide](docs/apis.md)
- [Voice Commands Reference](docs/commands.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Contributing Guide](CONTRIBUTING.md)

### Video Tutorials
- [Installation & Setup](https://youtube.com/watch?v=example)
- [Voice Commands Demo](https://youtube.com/watch?v=example)
- [API Configuration](https://youtube.com/watch?v=example)

---

## 🎉 Success Stories

> *"JARVIS-X has transformed my daily workflow. The productivity features alone save me hours every week!"* - Developer

> *"The entertainment APIs make it so much fun to interact with. My kids love asking for jokes and facts!"* - Parent

> *"As a crypto trader, having instant price updates through voice commands is incredibly valuable."* - Trader

---

## 🗺 Roadmap

### 🔜 Coming Soon
- [ ] **Mobile App** - Android/iOS companion
- [ ] **Web Dashboard** - Browser-based control panel
- [ ] **Plugin System** - Easy third-party integrations
- [ ] **Multi-language** - Support for 10+ languages
- [ ] **Smart Home** - IoT device control
- [ ] **Calendar Integration** - Google/Outlook sync

### 🎯 Future Vision
- [ ] **AI Vision** - Image recognition and analysis
- [ ] **Document AI** - PDF/Word processing
- [ ] **Code Assistant** - Programming help and debugging
- [ ] **Learning Mode** - Personalized skill acquisition
- [ ] **Team Features** - Multi-user support

---

## 👤 Author & Credits

**Sulekh Niwal**  
*Creator & Lead Developer*

- 🐙 GitHub: [@sulekhniwal-star](https://github.com/sulekhniwal-star)
- 💼 LinkedIn: [Sulekh Niwal Kumawat](https://www.linkedin.com/in/sulekh-niwal-kumawat-293a442a3)
- 📧 Email: sulekhniwal@gmail.com

### 🙏 Special Thanks
- Google Gemini AI team
- All free API providers
- Open source community
- Beta testers and contributors

---

## 📄 License & Legal

- **License**: MIT License - free for personal and commercial use
- **APIs**: Each API has its own terms of service
- **Disclaimer**: Educational and research purposes
- **Privacy**: Your data stays local unless explicitly shared

---

## 🚀 Get Started Now!

```bash
# One command setup
git clone https://github.com/your-username/JARVIS-X.git && cd JARVIS-X && python setup.py
```

**⭐ Star this repository if you found it helpful!**

*Built with ❤️ for the AI community*

---

<div align="center">

### 🌟 **Experience the Future of AI Assistance Today!** 🌟

[🚀 Get Started](#quick-setup-3-steps) | [📖 Documentation](#documentation) | [🤝 Contribute](#contributing) | [💬 Community](https://discord.gg/jarvis-x)

</div>