"""Wake word detection functionality."""

import re


class WakeWordDetector:
    """Detects wake words in text."""

    def __init__(self, wake_word: str):
        """Initialize with the wake word."""
        self.wake_word = wake_word.lower()

    def is_wake_word(self, text: str) -> bool:
        """Check if the wake word is present as a full word in the text.
        
        - Case-insensitive
        - Ignores punctuation
        - Returns True only if wake word exists as a full word
        """
        # Normalize text: lower case, remove punctuation
        normalized_text = re.sub(r'[^\w\s]', '', text.lower())
        # Check for full word match
        return re.search(r'\b' + re.escape(self.wake_word) + r'\b', normalized_text) is not None
    
    def detect(self) -> bool:
        """Detect wake word from audio input."""
        # For now, return True to simulate wake word detection
        # In a real implementation, this would listen for audio input
        return True