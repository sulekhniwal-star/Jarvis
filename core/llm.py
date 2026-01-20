"""Large Language Model integration."""

import google.generativeai as genai
from config import GEMINI_API_KEY
from utils.logger import logger


class GeminiLLM:
    """Gemini LLM implementation for generating replies."""

    def __init__(self):
        """Initialize the Gemini LLM with API key and system instruction."""
        genai.configure(api_key=GEMINI_API_KEY)
        self.model = genai.GenerativeModel(
            'gemini-pro',
            system_instruction="You are Jarvis, a helpful AI assistant inspired by Iron Man."
        )

    def generate_reply(self, prompt: str, context: str = "") -> str:
        """Generate a reply using Gemini API with error handling and retries."""
        # Trim context if too long
        if context and len(context) > 2000:
            context = context[-2000:]
        
        # Prepend context to prompt
        full_prompt = f"{context}\n\n{prompt}" if context else prompt
        
        max_retries = 3
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating reply for prompt (attempt {attempt + 1})")
                response = self.model.generate_content(full_prompt)
                text = response.text
                # Approximate trimming to ~500 tokens (roughly 400-500 words)
                words = text.split()
                if len(words) > 500:
                    text = ' '.join(words[:500]) + '...'
                logger.info("Reply generated successfully")
                return text
            except Exception as e:
                logger.error(f"Error generating reply (attempt {attempt + 1}): {e}")
                if attempt == max_retries - 1:
                    logger.error("Max retries reached, returning error message")
                    return "Sorry, I encountered an error while generating a response."
        # This should not be reached, but for completeness
        return "Sorry, I encountered an error while generating a response."
