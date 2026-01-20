import asyncio
import json
import os
import platform
import subprocess
import tempfile
from typing import Optional

from config import edge_tts, sr, vosk, logger

class SpeechHandler:
    """Handles speech recognition and text-to-speech functionality"""

    def __init__(self):
        # Check if speech recognition is available
        if not sr:
            print("Warning: speech_recognition package not installed. Speech recognition will not work. Run: pip install SpeechRecognition")
            self.recognizer = None
            self.microphone = None
        else:
            self.recognizer = sr.Recognizer()  # type: ignore
            self.microphone = sr.Microphone()  # type: ignore

        # Initialize Vosk for offline wake word detection
        self.vosk_recognizer = None
        if vosk:
            try:
                # You may need to download a Vosk model (e.g., vosk-model-small-en-us-0.15)
                # For now, we'll assume it's in a 'model' directory
                model_path = "model/vosk-model-small-en-us-0.15"
                if os.path.exists(model_path):
                    self.vosk_recognizer = vosk.Model(model_path)  # type: ignore
                    logger.info("🤖 Vosk model loaded for offline wake word detection")
                else:
                    logger.warning("Vosk model not found. Wake word detection will use Google (online). Download a model from https://alphacephei.com/vosk/models")
            except Exception as e:
                logger.error(f"Failed to load Vosk model: {e}")
        else:
            logger.warning("Vosk not installed. Wake word detection will use Google (online).")

    async def listen_for_speech(self) -> Optional[str]:
        """Listen for speech input asynchronously"""
        if not self.recognizer or not self.microphone:
            logger.warning("Speech recognition not available")
            return None

        try:
            with self.microphone as source:  # type: ignore
                self.recognizer.adjust_for_ambient_noise(source, duration=1)  # type: ignore

            # Run speech recognition in thread pool to avoid blocking
            loop = asyncio.get_event_loop()

            def listen():  # type: ignore
                with self.microphone as source:  # type: ignore
                    audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=5)  # type: ignore
                return self.recognizer.recognize_google(audio)  # type: ignore

            text = await loop.run_in_executor(None, listen)  # type: ignore
            logger.info(f"👤 User said: {text}")
            return text.lower()  # type: ignore

        except sr.WaitTimeoutError:  # type: ignore
            return None
        except sr.UnknownValueError:  # type: ignore
            return None
        except Exception as e:
            logger.error(f"Speech recognition error: {e}")
            return None

    async def speak(self, text: str, voice: str = "en-US-AriaNeural") -> None:
        """Convert text to speech and play using system audio"""
        try:
            logger.info(f"🤖 Jarvis: {text}")

            if edge_tts is None:
                print(f"🤖 Jarvis: {text}")
                return

            # Generate speech
            communicate = edge_tts.Communicate(text, voice)  # type: ignore

            # Save to temporary file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                async for chunk in communicate.stream():  # type: ignore
                    if chunk["type"] == "audio":  # type: ignore
                        temp_file.write(chunk["data"])  # type: ignore
                temp_path = temp_file.name

            # Play using system audio player
            system = platform.system().lower()
            if system == "windows":
                subprocess.run(["powershell", "-c", f"(New-Object Media.SoundPlayer '{temp_path}').PlaySync()"],
                             check=False, capture_output=True)
            elif system == "darwin":
                subprocess.run(["afplay", temp_path], check=False)
            elif system == "linux":
                subprocess.run(["aplay", temp_path], check=False)

            # Cleanup
            await asyncio.sleep(0.5)  # Brief delay before cleanup
            try:
                os.unlink(temp_path)
            except:
                pass

        except Exception as e:
            logger.error(f"Speech synthesis error: {e}")
            print(f"🤖 Jarvis: {text}")  # Fallback to text

    async def wait_for_wake_word(self) -> bool:
        """Wait for wake word 'jarvis' or 'hey jarvis' using Vosk (offline)"""
        if self.vosk_recognizer:  # type: ignore
            # Use Vosk for offline wake word detection
            try:
                with self.microphone as source:  # type: ignore
                    self.recognizer.adjust_for_ambient_noise(source, duration=1)  # type: ignore
                    audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=3)  # type: ignore

                    # Convert audio to raw data for Vosk
                    audio_data = audio.get_raw_data()  # type: ignore
                    if self.vosk_recognizer.AcceptWaveform(audio_data):  # type: ignore
                        result = json.loads(self.vosk_recognizer.Result())  # type: ignore
                        text = result.get("text", "").lower()
                        if "jarvis" in text or "hey jarvis" in text:
                            logger.info(f"🤖 Wake word detected (Vosk): {text}")
                            return True
            except Exception as e:
                logger.error(f"Vosk wake word detection error: {e}")
                # Fallback to Google
                speech = await self.listen_for_speech()
                if speech and ("jarvis" in speech or "hey jarvis" in speech):
                    return True
        else:
            # Fallback to Google speech recognition
            speech = await self.listen_for_speech()
            if speech and ("jarvis" in speech or "hey jarvis" in speech):
                return True
        return False
