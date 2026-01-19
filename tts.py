import asyncio
import os
from typing import Literal

from playsound import playsound

# Try to import TTS engines
try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

try:
    from gtts import gTTS
    HAS_GTTS = True
except ImportError:
    HAS_GTTS = False

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False

VoiceMode = Literal["normal", "warning", "assistant"]

class TTSManager:
    """Manages Text-to-Speech synthesis with multiple engines and voice modes."""

    def __init__(self):
        self.engine = None
        self.tts_method = None
        self._initialize_tts()

        self.voice_modes = {
            "normal": "en-US-GuyNeural",
            "assistant": "en-US-AriaNeural",
            "warning": "en-GB-RyanNeural",
        }

    def _initialize_tts(self):
        """Initializes the best available TTS engine."""
        if HAS_EDGE_TTS:
            self.tts_method = 'edge-tts'
            print("✅ Edge-TTS enabled (high quality)")
        elif HAS_PYTTSX3:
            try:
                self.engine = pyttsx3.init()
                self.engine.setProperty('rate', 150)
                self.tts_method = 'pyttsx3'
                print("✅ pyttsx3 Text-to-Speech enabled (offline)")
            except Exception as e:
                print(f"⚠️ pyttsx3 initialization failed: {e}")
                self.engine = None
        elif HAS_GTTS:
            self.tts_method = 'gtts'
            print("✅ Google Text-to-Speech enabled (online)")
        else:
            print("⚠️ No TTS available - responses will be text-only")

    async def speak_async(self, text: str, mode: VoiceMode = "normal"):
        """Asynchronously convert text to speech with a given voice mode."""
        print(f"🔊 JARVIS ({mode}): {text}")
        try:
            if self.tts_method == 'edge-tts':
                await self._speak_edge_tts(text, mode)
            elif self.tts_method == 'pyttsx3' and self.engine:
                await asyncio.to_thread(self._speak_pyttsx3, text)
            elif self.tts_method == 'gtts':
                await asyncio.to_thread(self._speak_gtts, text)
        except Exception as e:
            print(f"❌ Speech synthesis error: {e}")

    async def _speak_edge_tts(self, text: str, mode: VoiceMode):
        """Speak using Edge-TTS with a specific voice."""
        try:
            voice = self.voice_modes.get(mode, self.voice_modes["normal"])
            communicate = edge_tts.Communicate(text, voice)
            temp_audio_file = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Temp", "jarvis_tts.mp3")
            await communicate.save(temp_audio_file)
            await asyncio.to_thread(playsound, temp_audio_file)
            os.remove(temp_audio_file)
        except Exception as e:
            print(f"⚠️ Edge-TTS error: {e}")

    def _speak_pyttsx3(self, text: str):
        """Speak using pyttsx3."""
        try:
            self.engine.say(text)
            self.engine.runAndWait()
        except Exception as e:
            print(f"⚠️ pyttsx3 error: {e}")

    def _speak_gtts(self, text: str):
        """Speak using gTTS."""
        try:
            tts = gTTS(text=text, lang='en')
            temp_audio = os.path.join(os.path.expanduser("~"), "AppData", "Local", "Temp", "jarvis_gtts.mp3")
            tts.save(temp_audio)
            playsound(temp_audio)
            os.remove(temp_audio)
        except Exception as e:
            print(f"⚠️ gTTS error: {e}")
