from faster_whisper import WhisperModel
import threading
from typing import Callable, Optional
import os
import numpy as np
from audio_recorder import AudioRecorder

class WakeWordDetector:
    """
    Wake word detector for hands-free activation.
    Uses faster-whisper to detect "Hey Jarvis" or similar wake words.
    """

    WAKE_WORDS = ['jarvis', 'hey jarvis', 'wake up jarvis']
    
    def __init__(self, on_wake_callback: Optional[Callable] = None, model_size="tiny.en"):
        self.model = self._get_model(model_size)
        self.is_listening = False
        self.on_wake_callback = on_wake_callback
        self.listen_thread = None
        self.recorder = AudioRecorder()

    def _get_model(self, model_size):
        try:
            return WhisperModel(model_size, device="cpu", compute_type="int8")
        except Exception as e:
            print(f"Error loading whisper model: {e}")
            print("Please ensure you have a C++ compiler and try reinstalling faster-whisper.")
            # Provide instructions for installing a C++ compiler on Windows
            print("On Windows, you may need to install Microsoft C++ Build Tools:")
            print("1. Go to: https://visualstudio.microsoft.com/visual-cpp-build-tools/")
            print("2. Download and run the installer.")
            print("3. Select 'Desktop development with C++' and click 'Install'.")
            exit(1)


    def set_wake_words(self, wake_words: list):
        """Update wake word list."""
        self.WAKE_WORDS = [word.lower() for word in wake_words]

    def start(self):
        """Start continuous listening for wake word in background thread."""
        if not self.is_listening:
            self.is_listening = True
            self.listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
            self.listen_thread.start()

    def stop(self):
        """Stop listening for wake word."""
        self.is_listening = False
        if self.listen_thread:
            self.listen_thread.join()

    def _listen_loop(self):
        """Continuous listening loop."""
        with self.recorder as r:
            print("🎤 Wake word detector active. Say 'Hey Jarvis' to activate...")
            while self.is_listening:
                audio_data = r.get_audio()
                segments, _ = self.model.transcribe(audio_data, beam_size=5)
                for segment in segments:
                    text = segment.text.lower().strip()
                    if any(wake_word in text for wake_word in self.WAKE_WORDS):
                        print(f"✅ Wake word detected! ({text})")
                        if self.on_wake_callback:
                            self.on_wake_callback()
                        break  # Exit inner loop once wake word is found


class CommandListener:
    def __init__(self, model_size="base.en"):
        self.model = self._get_model(model_size)
        self.recorder = AudioRecorder()

    def _get_model(self, model_size):
        try:
            return WhisperModel(model_size, device="cpu", compute_type="int8")
        except Exception as e:
            print(f"Error loading whisper model: {e}")
            exit(1)

    def listen_for_command(self, timeout: int = 5) -> Optional[str]:
        """Listen for a command after wake word activation."""
        with self.recorder as r:
            print("🎤 Listening for your command...")
            
            # Collect audio for the given timeout
            audio_chunks = []
            for _ in range(0, int(r.sample_rate / 1024 * timeout)):
                audio_chunks.append(r.get_audio())

            audio_data = np.concatenate(audio_chunks, axis=0)
            
            segments, _ = self.model.transcribe(audio_data, beam_size=5)
            command = "".join(segment.text for segment in segments).strip()

            if command:
                print(f"Command: {command}")
                return command
            else:
                print("No command heard")
                return None