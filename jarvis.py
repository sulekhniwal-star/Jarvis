import asyncio
from typing import Optional, Any

from config import logger
from speech import SpeechHandler
from ai import AIHandler
from tools import ToolHandler
from memory import MemoryHandler

class JarvisAgent:
    """Modern Agentic AI Assistant using Gemini Function Calling"""

    def __init__(self):
        self.listening: bool = True

        # Initialize handlers
        self.speech_handler = SpeechHandler()
        self.ai_handler = AIHandler()
        self.tool_handler = ToolHandler(self.ai_handler.vision_model)
        self.memory_handler = MemoryHandler()

        logger.info("🤖 Jarvis Agent initialized with function calling capabilities")

    async def listen_for_speech(self) -> Optional[str]:
        """Listen for speech input asynchronously"""
        return await self.speech_handler.listen_for_speech()

    async def speak(self, text: str, voice: str = "en-US-AriaNeural") -> None:
        """Convert text to speech and play using system audio"""
        await self.speech_handler.speak(text, voice)

    # Tool Functions - delegate to tool_handler
    async def get_current_time(self) -> str:
        """Get current date and time"""
        return await self.tool_handler.get_current_time()

    async def get_weather(self, location: str) -> str:
        """Get weather information using free service"""
        return await self.tool_handler.get_weather(location)

    async def web_search(self, query: str) -> str:
        """Search the web using DuckDuckGo"""
        return await self.tool_handler.web_search(query)

    async def open_application(self, app_name: str) -> str:
        """Open an application"""
        return await self.tool_handler.open_application(app_name)

    async def analyze_screen(self) -> str:
        """Take screenshot and analyze with Gemini Vision"""
        return await self.tool_handler.analyze_screen()

    async def system_control(self, action: str) -> str:
        """Control system functions"""
        return await self.tool_handler.system_control(action)

    # Memory functions - delegate to memory_handler
    async def remember_fact(self, key: str, value: str) -> str:
        """Remember a fact"""
        return await self.memory_handler.remember_fact(key, value)

    async def recall_memory(self, key: str) -> str:
        """Recall a remembered fact"""
        return await self.memory_handler.recall_memory(key)

    # Additional tool functions - delegate to tool_handler
    async def analyze_webcam(self) -> str:
        """Capture a frame from the webcam and analyze with Gemini Vision"""
        return await self.tool_handler.analyze_webcam()

    async def get_battery_status(self) -> str:
        """Get battery status"""
        return await self.tool_handler.get_battery_status()

    async def shutdown_system(self) -> str:
        """Shutdown the system"""
        return await self.tool_handler.shutdown_system()

    async def restart_system(self) -> str:
        """Restart the system"""
        return await self.tool_handler.restart_system()

    async def sleep_system(self) -> str:
        """Put the system to sleep"""
        return await self.tool_handler.sleep_system()

    async def play_youtube(self, topic: str) -> str:
        """Play a video on YouTube"""
        return await self.tool_handler.play_youtube(topic)

    async def get_stock_price(self, ticker: str) -> str:
        """Get stock price using yfinance"""
        return await self.tool_handler.get_stock_price(ticker)

    async def check_system_health(self) -> str:
        """Check CPU and RAM"""
        return await self.tool_handler.check_system_health()

    async def get_news(self, category: str = "general") -> str:
        """Get latest news headlines using NewsAPI (free tier)"""
        return await self.tool_handler.get_news(category)

    async def execute_function_call(self, function_call: Any) -> str:  # type: ignore[misc]
        """Execute a function call from Gemini"""
        return await self.ai_handler.execute_function_call(function_call)  # type: ignore

    async def process_with_gemini(self, user_input: str) -> str:
        """Process user input with Gemini and handle function calls"""
        return await self.ai_handler.process_with_gemini(user_input)

    async def wait_for_wake_word(self) -> bool:
        """Wait for wake word 'jarvis' or 'hey jarvis' using Vosk (offline)"""
        return await self.speech_handler.wait_for_wake_word()

    async def run(self):
        """Main agent loop"""
        await self.speak("Jarvis Agent online. I'm ready to assist you with intelligent function calling.")

        while self.listening:
            try:
                # Wait for wake word
                if await self.wait_for_wake_word():
                    await self.speak("Yes, how can I help?")

                    # Listen for command
                    command = await self.listen_for_speech()

                    if command:
                        # Remove wake words
                        command = command.replace("jarvis", "").replace("hey", "").strip()

                        if "shutdown" in command or "exit" in command:
                            await self.speak("Goodbye!")
                            self.listening = False
                            break

                        # Process with Gemini
                        response = await self.process_with_gemini(command)
                        await self.speak(response)

                # Small delay to prevent excessive CPU usage
                await asyncio.sleep(0.1)

            except KeyboardInterrupt:
                await self.speak("Shutting down Jarvis Agent.")
                self.listening = False
                break
            except Exception as e:
                logger.error(f"Main loop error: {e}")
                await asyncio.sleep(1)

async def main():
    """Entry point"""
    try:
        agent = JarvisAgent()
        await agent.run()
    except Exception as e:
        logger.error(f"Failed to start Jarvis Agent: {e}")
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
