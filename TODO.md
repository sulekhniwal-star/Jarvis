# TODO for Implementing core/llm.py

- [x] Import necessary modules (google.generativeai, config, logger)
- [x] Define GeminiLLM class
- [x] Implement constructor: read API key from config, configure genai, set system instruction
- [x] Implement generate_reply method: call Gemini API, handle errors/retries (up to 3 attempts), trim responses to ~500 tokens
- [x] Add basic error handling and logging
