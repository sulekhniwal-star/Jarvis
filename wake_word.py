import speech_recognition as sr
import threading
from typing import Callable, Optional


class WakeWordDetector:
    """
    Wake word detector for hands-free activation.
    Uses speech recognition to detect "Hey Jarvis" or similar wake words.
    """
    
    WAKE_WORDS = ['jarvis', 'hey jarvis', 'jarvis', 'wake up jarvis']
    
    def __init__(self, on_wake_callback: Optional[Callable] = None):
        self.recognizer = sr.Recognizer()
        self.is_listening = False
        self.on_wake_callback = on_wake_callback
        self.listen_thread = None
    
    def set_wake_words(self, wake_words: list):
        """Update wake word list."""
        self.WAKE_WORDS = [word.lower() for word in wake_words]
    
    def start_listening(self):
        """Start continuous listening for wake word in background thread."""
        self.is_listening = True
        self.listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        self.listen_thread.start()
    
    def stop_listening(self):
        """Stop listening for wake word."""
        self.is_listening = False
    
    def _listen_loop(self):
        """Continuous listening loop."""
        with sr.Microphone() as source:
            print("🎤 Wake word detector active. Say 'Hey Jarvis' to activate...")
            self.recognizer.adjust_for_ambient_noise(source, duration=1)
            
            while self.is_listening:
                try:
                    audio = self.recognizer.listen(source, timeout=1)
                    self._process_audio(audio)
                except sr.RequestError:
                    pass
                except sr.UnknownValueError:
                    pass
                except sr.WaitTimeoutError:
                    pass
                except Exception as e:
                    print(f"Wake word detector error: {e}")
    
    def _process_audio(self, audio):
        """Process audio and check for wake word."""
        try:
            text = self.recognizer.recognize_google(audio, language='en-in').lower()
            print(f"Detected: {text}")
            
            # Check if wake word is in the recognized text
            for wake_word in self.WAKE_WORDS:
                if wake_word in text:
                    print("✅ Wake word detected!")
                    if self.on_wake_callback:
                        self.on_wake_callback()
                    break
        except (sr.UnknownValueError, sr.RequestError):
            pass
    
    def detect_wake_word(self, audio) -> bool:
        """Detect wake word in given audio."""
        try:
            text = self.recognizer.recognize_google(audio, language='en-in').lower()
            print(f"Detected: {text}")
            
            for wake_word in self.WAKE_WORDS:
                if wake_word in text:
                    return True
            return False
        except (sr.UnknownValueError, sr.RequestError):
            return False
    
    def listen_for_command(self, timeout: int = 5) -> Optional[str]:
        """Listen for a command after wake word activation."""
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source)
            try:
                print("🎤 Listening for your command...")
                audio = self.recognizer.listen(source, timeout=timeout)
                command = self.recognizer.recognize_google(audio, language='en-in').lower()
                print(f"Command: {command}")
                return command
            except sr.UnknownValueError:
                print("Could not understand audio")
                return None
            except sr.RequestError as e:
                print(f"Error: {e}")
                return None
            except sr.WaitTimeoutError:
                print("No command heard")
                return None


class VoiceActivityDetector:
    """Detect voice activity for optimized listening."""
    
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.recognizer.dynamic_energy_threshold = True
    
    def is_voice_active(self, timeout: float = 1.0) -> bool:
        """Check if voice activity is detected."""
        with sr.Microphone() as source:
            self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            try:
                audio = self.recognizer.listen(source, timeout=timeout, phrase_time_limit=0.5)
                # If we got audio, voice is active
                return True
            except (sr.WaitTimeoutError, sr.UnknownValueError):
                return False
