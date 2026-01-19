@echo off
echo Installing Enhanced Jarvis dependencies...
pip install -r requirements.txt

echo.
echo Enhanced Jarvis Setup Complete!
echo.
echo IMPORTANT: Edit .env file and add your API keys:
echo - Gemini API key (for AI conversations)
echo - Spotify keys (optional, for music control)
echo.
echo New Features:
echo - Natural conversations with AI
echo - Realistic voice using Edge-TTS
echo - Free weather using wttr.in
echo - YouTube: "Jarvis, play music on YouTube"
echo - Wikipedia: "Jarvis, what is artificial intelligence?"
echo - System control: "Jarvis, volume up"
echo - Smart weather: "Jarvis, weather in Tokyo"
echo - Spotify control: "Jarvis, play music"
echo.
echo To run: python jarvis.py
echo.
pause