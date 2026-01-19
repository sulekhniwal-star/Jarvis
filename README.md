# Jarvis AI Assistant

A voice-activated AI assistant inspired by Jarvis from the Avengers movies.

## Features

- **Voice Recognition**: Responds to "Jarvis" wake word
- **Text-to-Speech**: Speaks responses back to you
- **Time & Date**: Get current time and date
- **Web Search**: Search Google for anything
- **System Control**: Open applications like Notepad, Calculator
- **Weather**: Get weather information (requires API key)

## Setup

1. Run `setup.bat` to install dependencies
2. For weather features, get a free API key from OpenWeatherMap and replace `your_api_key_here` in jarvis.py

## Usage

1. Run: `python jarvis.py`
2. Wait for "Jarvis online" message
3. Say commands starting with "Jarvis"

## Example Commands

- "Jarvis, what time is it?"
- "Jarvis, what's the date?"
- "Jarvis, search for Python tutorials"
- "Jarvis, open notepad"
- "Jarvis, open calculator"
- "Jarvis, what's the weather?"
- "Jarvis, shutdown"

## Requirements

- Python 3.7+
- Microphone
- Internet connection
- Windows OS (for system commands)

## Troubleshooting

If you get microphone errors, make sure:
- Your microphone is working
- Python has microphone permissions
- Try running as administrator