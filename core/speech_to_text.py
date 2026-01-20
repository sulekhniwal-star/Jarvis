"""Speech-to-text functionality."""

import numpy as np
import sounddevice as sd
import time
from faster_whisper import WhisperModel
from config import DEFAULT_LANGUAGE
from utils.logger import logger


class SpeechToText:
    """Class for speech-to-text using faster-whisper."""

    def __init__(self):
        """Initialize the SpeechToText class with faster-whisper model."""
        try:
            self.model = WhisperModel("base", device="cpu", compute_type="int8")
            self.language = DEFAULT_LANGUAGE
        except Exception as e:
            logger.error(f"Error initializing WhisperModel: {e}")
            raise

    def listen(self) -> str:
        """Capture audio and transcribe to text.

        Returns:
            str: Recognized text in lowercase.
        """
        try:
            samplerate = 16000
            silence_threshold = 0.01
            timeout = 10  # seconds
            chunk_duration = 0.5  # seconds
            audio_chunks = []

            def callback(indata, frames, time_info, status):
                if status:
                    logger.warning(f"Sounddevice status: {status}")
                audio_chunks.append(indata.copy())

            with sd.InputStream(samplerate=samplerate, channels=1, callback=callback):
                start_time = time.time()
                last_audio_time = start_time

                while time.time() - start_time < timeout:
                    time.sleep(chunk_duration)
                    if audio_chunks:
                        # Check RMS of the last chunk for silence
                        rms = np.sqrt(np.mean(audio_chunks[-1]**2))
                        if rms > silence_threshold:
                            last_audio_time = time.time()
                        elif time.time() - last_audio_time > 1.0:  # 1 second of silence
                            break

            if not audio_chunks:
                logger.warning("No audio recorded.")
                return ""

            audio = np.concatenate(audio_chunks).flatten()

            # Transcribe
            segments, info = self.model.transcribe(audio, language=self.language)
            text = " ".join([segment.text for segment in segments]).strip()

            return text.lower()

        except Exception as e:
            logger.error(f"Error in listen method: {e}")
            return ""
