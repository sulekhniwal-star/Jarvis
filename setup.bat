@echo off
echo Installing Advanced Jarvis dependencies...
pip install -r requirements.txt

echo.
echo Advanced Jarvis Setup Complete!
echo.
echo IMPORTANT: Edit .env file and add your API keys:
echo - Gemini API key (for AI conversations and vision)
echo - News API key (optional, for news updates)
echo - Hugging Face token (optional, for image generation)
echo - Alpha Vantage key (optional, for stock prices)
echo - Spotify keys (optional, for music control)
echo.
echo NEW ADVANCED FEATURES:
echo - VISION: "Jarvis, what am I looking at?" (screen analysis)
echo - WEBCAM: "Jarvis, look at me" (webcam analysis)
echo - IMAGE GEN: "Jarvis, generate image of a sunset"
echo - STOCKS: "Jarvis, how is Apple stock doing?"
echo - MEMORY: "Jarvis, remember I like coffee" / "what do you remember about coffee?"
echo - WORK MODE: "Jarvis, start work mode" (opens VS Code, Spotify, browser)
echo - Plus all previous features: weather, news, reminders, voice changes
echo.
echo To run: python jarvis.py
echo.
pause