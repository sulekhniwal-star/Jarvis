import asyncio
import datetime
import logging
import os
import platform
import subprocess
import tempfile
from io import BytesIO
from typing import Optional, Any

try:
    import edge_tts  # type: ignore
except ImportError:
    edge_tts = None  # type: ignore

try:
    import google.generativeai as genai  # type: ignore
except ImportError:
    genai = None  # type: ignore

try:
    import pyautogui  # type: ignore
except ImportError:
    pyautogui = None  # type: ignore

try:
    import speech_recognition as sr  # type: ignore
except ImportError:
    sr = None  # type: ignore

try:
    from duckduckgo_search import DDGS  # type: ignore
except ImportError:
    DDGS = None  # type: ignore

try:
    from dotenv import load_dotenv  # type: ignore
except ImportError:
    load_dotenv = None  # type: ignore

try:
    from PIL import Image  # type: ignore
except ImportError:
    Image = None  # type: ignore

# Load environment variables
if load_dotenv:
    load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class JarvisAgent:
    """Modern Agentic AI Assistant using Gemini Function Calling"""
    
    def __init__(self):
        self.listening = True
        
        # Check if speech recognition is available
        if not sr:
            raise ImportError("speech_recognition package not installed. Run: pip install SpeechRecognition")
            
        self.recognizer = sr.Recognizer()  # type: ignore
        self.microphone = sr.Microphone()  # type: ignore
        
        # Initialize Gemini with function calling
        self._setup_gemini()
        
        logger.info("🤖 Jarvis Agent initialized with function calling capabilities")
    
    def _setup_gemini(self):
        """Configure Gemini with function calling tools"""
        if not genai:
            raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")
            
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        genai.configure(api_key=api_key)  # type: ignore
        
        # Define function schemas for Gemini
        self.tools: list[dict[str, Any]] = [  # type: ignore
            {
                "function_declarations": [
                    {
                        "name": "get_current_time",
                        "description": "Get the current date and time",
                        "parameters": {"type": "object", "properties": {}}
                    },
                    {
                        "name": "get_weather",
                        "description": "Get weather information for a location",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "location": {"type": "string", "description": "City or location name"}
                            },
                            "required": ["location"]
                        }
                    },
                    {
                        "name": "web_search",
                        "description": "Search the internet for information",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {"type": "string", "description": "Search query"}
                            },
                            "required": ["query"]
                        }
                    },
                    {
                        "name": "open_application",
                        "description": "Open an application or program",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "app_name": {"type": "string", "description": "Name of the application to open"}
                            },
                            "required": ["app_name"]
                        }
                    },
                    {
                        "name": "analyze_screen",
                        "description": "Take a screenshot and analyze what's on the screen",
                        "parameters": {"type": "object", "properties": {}}
                    },
                    {
                        "name": "system_control",
                        "description": "Control system functions like volume, screenshot, etc.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "action": {"type": "string", "description": "System action to perform"}
                            },
                            "required": ["action"]
                        }
                    }
                ]
            }
        ]
        
        # Initialize Gemini models
        self.chat_model = genai.GenerativeModel(  # type: ignore
            'gemini-1.5-flash',
            tools=self.tools,
            system_instruction="You are Jarvis, an intelligent AI assistant. Use the available functions when appropriate to help the user. Be concise and helpful."
        )
        
        self.vision_model = genai.GenerativeModel('gemini-1.5-flash')  # type: ignore
        
        # Start chat session
        self.chat = self.chat_model.start_chat()  # type: ignore
    
    async def listen_for_speech(self) -> Optional[str]:
        """Listen for speech input asynchronously"""
        try:
            with self.microphone as source:  # type: ignore
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)  # type: ignore
            
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
    
    # Tool Functions
    async def get_current_time(self) -> str:
        """Get current date and time"""
        now = datetime.datetime.now()
        return f"Current time: {now.strftime('%I:%M %p on %A, %B %d, %Y')}"
    
    async def get_weather(self, location: str) -> str:
        """Get weather information using free service"""
        try:
            import requests  # type: ignore
            url = f"http://wttr.in/{location}?format=%C+%t+%h+%w+in+%l"
            response = await asyncio.get_event_loop().run_in_executor(
                None, lambda: requests.get(url, timeout=5)
            )
            
            if response.status_code == 200:
                return f"Weather in {location}: {response.text.strip()}"
            else:
                return f"Could not get weather for {location}"
                
        except Exception as e:
            logger.error(f"Weather error: {e}")
            return f"Weather service unavailable for {location}"
    
    async def web_search(self, query: str) -> str:
        """Search the web using DuckDuckGo"""
        try:
            loop = asyncio.get_event_loop()
            
            def search():  # type: ignore
                with DDGS() as ddgs:  # type: ignore
                    results = list(ddgs.text(query, max_results=3))  # type: ignore
                    return results  # type: ignore
            
            results = await loop.run_in_executor(None, search)  # type: ignore
            
            if results:  # type: ignore
                formatted_results = []  # type: ignore
                for i, result in enumerate(results[:3], 1):  # type: ignore
                    formatted_results.append(f"{i}. {result['title']}: {result['body'][:100]}...")  # type: ignore
                
                return f"Search results for '{query}':\n" + "\n".join(formatted_results)  # type: ignore
            else:
                return f"No search results found for '{query}'"
                
        except Exception as e:
            logger.error(f"Search error: {e}")
            return f"Search service unavailable for '{query}'"
    
    async def open_application(self, app_name: str) -> str:
        """Open an application"""
        try:
            system = platform.system().lower()
            
            # Common application mappings
            app_mappings = {
                "notepad": {"windows": "notepad", "darwin": "TextEdit", "linux": "gedit"},
                "calculator": {"windows": "calc", "darwin": "Calculator", "linux": "gnome-calculator"},
                "browser": {"windows": "start chrome", "darwin": "open -a 'Google Chrome'", "linux": "google-chrome"},
                "code": {"windows": "code", "darwin": "code", "linux": "code"},
                "spotify": {"windows": "spotify", "darwin": "open -a Spotify", "linux": "spotify"}
            }
            
            app_lower = app_name.lower()
            if app_lower in app_mappings and system in app_mappings[app_lower]:
                command = app_mappings[app_lower][system]
            else:
                command = app_name
            
            # Run command asynchronously
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await process.communicate()
            return f"Opened {app_name}"
            
        except Exception as e:
            logger.error(f"App opening error: {e}")
            return f"Could not open {app_name}"
    
    async def analyze_screen(self) -> str:
        """Take screenshot and analyze with Gemini Vision"""
        try:
            # Take screenshot
            screenshot = pyautogui.screenshot()  # type: ignore
            
            # Convert to bytes
            img_buffer = BytesIO()
            screenshot.save(img_buffer, format='PNG')  # type: ignore
            img_buffer.seek(0)
            
            # Analyze with Gemini Vision
            image = Image.open(img_buffer)  # type: ignore
            
            response = await asyncio.get_event_loop().run_in_executor(  # type: ignore[misc]
                None,
                lambda: self.vision_model.generate_content([  # type: ignore
                    "Analyze this screenshot and describe what you see. Be concise and focus on the main elements.",
                    image
                ])  # type: ignore
            )  # type: ignore
            
            return f"Screen analysis: {response.text}"  # type: ignore
            
        except Exception as e:
            logger.error(f"Screen analysis error: {e}")
            return "Could not analyze screen"
    
    async def system_control(self, action: str) -> str:
        """Control system functions"""
        try:
            action_lower = action.lower()
            
            if "volume up" in action_lower:
                if platform.system() == "Windows":
                    pyautogui.press('volumeup')  # type: ignore
                return "Volume increased"
                
            elif "volume down" in action_lower:
                if platform.system() == "Windows":
                    pyautogui.press('volumedown')  # type: ignore
                return "Volume decreased"
                
            elif "screenshot" in action_lower:
                screenshot = pyautogui.screenshot()  # type: ignore
                filename = f"screenshot_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
                screenshot.save(filename)  # type: ignore
                return f"Screenshot saved as {filename}"
                
            else:
                return f"Unknown system action: {action}"
                
        except Exception as e:
            logger.error(f"System control error: {e}")
            return f"System control failed: {action}"
    
    async def execute_function_call(self, function_call) -> str:  # type: ignore
        """Execute a function call from Gemini"""
        function_name = function_call.name  # type: ignore
        args = dict(function_call.args) if function_call.args else {}  # type: ignore
        
        logger.info(f"🔧 Executing function: {function_name} with args: {args}")
        
        # Map function names to methods
        function_map = {  # type: ignore
            "get_current_time": self.get_current_time,
            "get_weather": self.get_weather,
            "web_search": self.web_search,
            "open_application": self.open_application,
            "analyze_screen": self.analyze_screen,
            "system_control": self.system_control
        }
        
        if function_name in function_map:
            try:
                if args:
                    result = await function_map[function_name](**args)  # type: ignore
                else:
                    result = await function_map[function_name]()  # type: ignore
                return result  # type: ignore
            except Exception as e:
                logger.error(f"Function execution error: {e}")
                return f"Error executing {function_name}: {str(e)}"
        else:
            return f"Unknown function: {function_name}"
    
    async def process_with_gemini(self, user_input: str) -> str:
        """Process user input with Gemini and handle function calls"""
        try:
            # Send message to Gemini
            response = await asyncio.get_event_loop().run_in_executor(  # type: ignore
                None,
                lambda: self.chat.send_message(user_input)  # type: ignore
            )  # type: ignore
            
            # Check if Gemini wants to call functions
            if response.candidates[0].content.parts:  # type: ignore
                for part in response.candidates[0].content.parts:  # type: ignore
                    if hasattr(part, 'function_call'):  # type: ignore
                        # Execute the function call
                        function_result = await self.execute_function_call(part.function_call)  # type: ignore
                        
                        # Send function result back to Gemini
                        function_response = await asyncio.get_event_loop().run_in_executor(  # type: ignore
                            None,
                            lambda: self.chat.send_message([  # type: ignore
                                genai.protos.Part(  # type: ignore
                                    function_response=genai.protos.FunctionResponse(  # type: ignore
                                        name=part.function_call.name,  # type: ignore
                                        response={"result": function_result}
                                    )
                                )
                            ])
                        )  # type: ignore
                        
                        return function_response.text  # type: ignore
                    
                    elif hasattr(part, 'text'):  # type: ignore
                        return part.text  # type: ignore
            
            return response.text  # type: ignore
            
        except Exception as e:
            logger.error(f"Gemini processing error: {e}")
            return "I'm having trouble processing that request right now."
    
    async def wait_for_wake_word(self) -> bool:
        """Wait for wake word 'jarvis' or 'hey jarvis'"""
        speech = await self.listen_for_speech()
        if speech and ("jarvis" in speech or "hey jarvis" in speech):
            return True
        return False
    
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