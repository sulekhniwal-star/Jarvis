# 🎤 JARVIS Command Reference

## All Supported Commands

### 🕐 Time Commands
```
"What time is it?"
"Tell me the current time"
"What's the time?"
"Current time"
```
→ JARVIS tells you the exact time

---

### 😄 Joke Commands
```
"Tell me a joke"
"Make me laugh"
"Say something funny"
"I need a joke"
"Tell me something funny"
```
→ JARVIS tells a random joke

---

### 👋 Greeting Commands
```
"Hello"
"Hi"
"Hey"
"Good morning"
"Good evening"
"Namaste"
```
→ JARVIS responds with greeting

---

### 🌤️ Weather Commands
```
"What's the weather?"
"How's the weather?"
"Tell me the weather in Mumbai"
"Weather in New York"
"Is it raining?"
"What's the temperature?"
"Current weather in London"
```
→ JARVIS fetches current weather
*Note: Auto-detects city from your location or asks*

---

### 🖥️ Application Commands
```
"Open Chrome"
"Launch YouTube"
"Open Spotify"
"Start VS Code"
"Open Notepad"
"Open Calculator"
```
→ JARVIS launches the application

**Supported Apps:**
- chrome
- youtube
- spotify
- vscode
- notepad
- calculator

---

### 🔊 Volume Commands
```
"Set volume to 50"
"Increase volume to 75"
"Volume 100"
"Mute"
"Unmute"
"Mute the volume"
"Unmute the volume"
"Increase volume"
"Decrease volume"
```
→ JARVIS controls system volume

---

### 💻 System Commands
```
"Shutdown"
"Power off"
"Turn off computer"
"Restart"
"Reboot"
"Exit"
"Goodbye"
"Quit"
"Stop"
"Close"
```
→ JARVIS shuts down, restarts, or exits

---

### 🤖 AI Response Commands
```
"What is artificial intelligence?"
"Explain quantum computing"
"How does photosynthesis work?"
"Tell me about space"
"What is Python programming?"
"How do planes fly?"
"Explain blockchain"
"What is machine learning?"
```
→ JARVIS uses Gemini AI to answer any question

---

### 💾 Memory Commands (Advanced)
```
"Remember my name is John"
"My favorite color is blue"
"I like to listen to rock music"
"What is my name?"
"What is my favorite color?"
"Do you remember my name?"
"Add contact John Doe with phone 123-456-7890"
"Add contact Jane Doe with email jane@example.com"
```
→ JARVIS learns, remembers, and retrieves personal information.

---

## Usage Patterns

### Single Command
```
You: "Hey Jarvis, what time is it?"
JARVIS: "Yes, sir? The current time is 14:30:45"
```

### Multi-Turn Conversation
```
You: "Hey Jarvis"
JARVIS: "Yes, sir?"

You: "Tell me a joke"
JARVIS: "Why don't scientists trust atoms? Because they make up everything!"

You: "Another one"
JARVIS: (Uses context) "Sure! Why did the scarecrow win an award..."
```

### Follow-up Questions
```
You: "What's the weather?"
JARVIS: "The weather in Indore is partly cloudy with 28°C"

You: "What about tomorrow?"
JARVIS: (Using context) "Based on your previous weather query..."
```

---

## Voice Recognition Tips

### Better Recognition
✅ Speak clearly
✅ Pause between "Jarvis" and command
✅ Use natural language
✅ Speak at normal volume
✅ Minimize background noise

### Commands That Work
```
"Hey Jarvis, what's the time?"          ✓ Natural
"Open Chrome"                           ✓ Clear
"Jarvis tell me a joke"                 ✓ Direct
```

### Avoid
```
"jarvisshutthedoor"                    ✗ No pause
"*whispers* what time"                  ✗ Too quiet
"WHAT'S THE WEATHER?!?!"               ✗ Too loud
```

---

## Intent Detection Examples

### Intent: GREETING
```
You: "Hello"
Intent Detected: greeting (Confidence: 0.99)
Response: "Hello there! How can I assist you today?"
```

### Intent: WEATHER
```
You: "How's the weather in Mumbai?"
Intent Detected: weather (Confidence: 0.97)
Metadata: {location: "Mumbai"}
Response: "The weather in Mumbai is..."
```

### Intent: VOLUME
```
You: "Set volume to 75"
Intent Detected: volume (Confidence: 0.95)
Metadata: {action: "set", level: 75}
Response: "Volume set to 75 percent"
```

### Intent: AI_RESPONSE
```
You: "What is quantum computing?"
Intent Detected: ai_response (Confidence: 0.92)
Response: (Uses Gemini API) "Quantum computing is..."
```

---

## Command Categories

### 🏠 Home Control
- Open applications
- Control volume
- Shutdown/Restart

### 📊 Information
- Time
- Weather
- AI questions

### 🎮 Entertainment
- Jokes
- Play music
- Open apps

### 📝 Productivity
- Set reminders
- Add notes
- Store contacts

### 🤖 AI Queries
- Anything you want to know
- Explanations
- Advice

---

## Troubleshooting Commands

### If JARVIS doesn't understand:
```
❌ "werrr is the weather"
✅ "What's the weather?"

❌ "jarvistella joke"
✅ "Hey Jarvis, tell me a joke"

❌ "volumeup"
✅ "Increase volume to 50"
```

### If microphone is not detected:
```bash
# Test microphone
python -m speech_recognition

# Or run JARVIS with debug
python jarvis.py --debug
```

---

## Advanced Features

### Context Memory
```
You: "What's the weather?"
JARVIS: "Getting weather for Indore (your saved city)"

You: "What about a different city?"
JARVIS: (Uses context) "Which city would you like to know about?"
```

### Learning Preferences
```
You: "I like lo-fi music"
JARVIS: "Noted! I'll remember your music preference."

Later: "Play some music"
JARVIS: "Playing lo-fi music for you"
```

### Conversation History
```
You: "What's AI?"
JARVIS: "AI stands for Artificial Intelligence..."

You: "Tell me more"
JARVIS: (Remembers context) "Sure! Expanding on that..."
```

---

## Command Variations

JARVIS understands many variations of the same command:

```
Time:
- "What time is it?"
- "Tell me the time"
- "Current time"
- "What's the time?"

Weather:
- "What's the weather?"
- "How's the weather in Mumbai?"
- "Tell me the weather"
- "Weather forecast"
- "Is it raining?"

Jokes:
- "Tell me a joke"
- "Make me laugh"
- "Tell me something funny"
- "Say something funny"

Open:
- "Open Chrome"
- "Launch Chrome"
- "Start Chrome"
- "Run Chrome"
```

---

## Performance Tips

### Faster Recognition
1. Speak naturally
2. Clear pronunciation
3. Pause after wake word
4. Minimize echo/noise

### Better Responses
1. Use complete sentences
2. Provide context
3. Ask follow-ups
4. Let JARVIS remember

---

## Power User Commands

### Set Custom Wake Words
```python
# In your code
wake_word_detector.set_wake_words(['hey jarvis', 'jarvis', 'wake up'])
```

### Add Custom Commands
```python
# In memory
memory.learn_preference('favorite_food', 'pizza')
memory.add_contact('Mom', phone='+91-1234567890')
memory.add_note('Call dentist Friday')
```

### Execute Complex Queries
```
"What's the weather in Mumbai AND tell me a joke"
JARVIS: (Processes both requests)
```

---

## Statistics

| Category | Count |
|----------|-------|
| Time Commands | 4 |
| Greeting Commands | 6 |
| Joke Commands | 5 |
| Weather Commands | 7 |
| App Commands | 15+ |
| Volume Commands | 9 |
| System Commands | 8 |
| AI Query Commands | Unlimited |
| **Total** | **50+** |

---

## 🎯 Most Popular Commands

```
1. "Hey Jarvis, what time is it?" - Most common
2. "What's the weather?" - Very popular
3. "Tell me a joke" - Entertainment
4. "Open Chrome" - Launch app
5. "Set volume to 50" - Quick control
```

---

## 🚀 Pro Tips

1. **Chain commands**: Say one command at a time for best results
2. **Use context**: JARVIS remembers previous questions
3. **Natural speech**: Use conversational language
4. **Quiet environment**: Better recognition
5. **Full sentences**: "Set volume to 50" works better than "Volume 50"

---

## 📱 GUI vs Terminal

### Terminal
- More control
- See all logs
- Faster performance
- Text-based

### GUI
- Visual feedback
- Conversation history
- Audio visualization
- Easier for beginners

---

**Master these commands and become a JARVIS power user!** 🤖✨
