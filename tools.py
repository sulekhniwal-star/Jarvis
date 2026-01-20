import asyncio
import datetime
import os
import platform
import subprocess
from io import BytesIO
from typing import Any, Dict, List, Optional

from config import (
    DDGS, Image, cv2, psutil, yf, pywhatkit,
    pyautogui, logger
)
from config import NewsApiClient  # type: ignore

class ToolHandler:
    """Handles all tool functions for the Jarvis agent"""

    def __init__(self, vision_model: Optional[Any] = None):
        self.vision_model = vision_model

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
            if Image is None:
                return "PIL not available for image processing"

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

    async def analyze_webcam(self) -> str:
        """Capture a frame from the webcam and analyze with Gemini Vision"""
        try:
            if cv2 is None:
                return "OpenCV not available for webcam analysis"

            if Image is None:
                return "PIL not available for image processing"

            # Capture frame from webcam
            cap = cv2.VideoCapture(0)  # type: ignore
            if not cap.isOpened():  # type: ignore
                return "Could not access webcam"

            ret, frame = cap.read()  # type: ignore
            cap.release()  # type: ignore

            if not ret:
                return "Failed to capture frame from webcam"

            # Convert to PIL Image
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)  # type: ignore
            pil_image = Image.fromarray(frame_rgb)  # type: ignore

            # Analyze with Gemini Vision
            response = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: self.vision_model.generate_content([  # type: ignore
                    "Analyze this webcam image and describe what you see. Be concise and focus on the main elements.",
                    pil_image
                ])
            )

            return f"Webcam analysis: {response.text}"

        except Exception as e:
            logger.error(f"Webcam analysis error: {e}")
            return "Could not analyze webcam"

    async def get_battery_status(self) -> str:
        """Get battery status"""
        try:
            if psutil is None:
                return "psutil not available for battery status"

            battery = psutil.sensors_battery()  # type: ignore
            if battery is None:
                return "Battery information not available"

            percent = battery.percent  # type: ignore
            plugged = battery.power_plugged  # type: ignore
            status = "Plugged in" if plugged else "On battery"
            return f"Battery: {percent}% - {status}"

        except Exception as e:
            logger.error(f"Battery status error: {e}")
            return "Could not get battery status"

    async def shutdown_system(self) -> str:
        """Shutdown the system"""
        try:
            system = platform.system().lower()
            if system == "windows":
                subprocess.run(["shutdown", "/s", "/t", "0"], check=False)
            elif system == "darwin":
                subprocess.run(["sudo", "shutdown", "-h", "now"], check=False)
            elif system == "linux":
                subprocess.run(["sudo", "shutdown", "-h", "now"], check=False)
            return "System shutting down"
        except Exception as e:
            logger.error(f"Shutdown error: {e}")
            return "Could not shutdown system"

    async def restart_system(self) -> str:
        """Restart the system"""
        try:
            system = platform.system().lower()
            if system == "windows":
                subprocess.run(["shutdown", "/r", "/t", "0"], check=False)
            elif system == "darwin":
                subprocess.run(["sudo", "shutdown", "-r", "now"], check=False)
            elif system == "linux":
                subprocess.run(["sudo", "shutdown", "-r", "now"], check=False)
            return "System restarting"
        except Exception as e:
            logger.error(f"Restart error: {e}")
            return "Could not restart system"

    async def sleep_system(self) -> str:
        """Put the system to sleep"""
        try:
            system = platform.system().lower()
            if system == "windows":
                subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0,1,0"], check=False)
            elif system == "darwin":
                subprocess.run(["pmset", "sleepnow"], check=False)
            elif system == "linux":
                subprocess.run(["systemctl", "suspend"], check=False)
            return "System going to sleep"
        except Exception as e:
            logger.error(f"Sleep error: {e}")
            return "Could not put system to sleep"

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

    async def play_youtube(self, topic: str) -> str:
        """Play a video on YouTube"""
        if pywhatkit is None:
            return "pywhatkit not available for YouTube playback"
        try:
            # pywhatkit runs synchronously, so we run it in an executor
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: pywhatkit.playonyt(topic)  # type: ignore
            )
            return f"Playing {topic} on YouTube."
        except Exception as e:
            logger.error(f"YouTube error: {e}")
            return "Failed to play video."

    async def get_stock_price(self, ticker: str) -> str:
        """Get stock price using yfinance"""
        if yf is None:
            return "yfinance not available for stock prices"
        try:
            stock = yf.Ticker(ticker)  # type: ignore
            info = stock.info  # type: ignore
            price = info.get('currentPrice') or info.get('regularMarketPrice')  # type: ignore
            return f"The current price of {ticker.upper()} is ${price}."
        except Exception as _:
            return f"Could not find stock data for {ticker}."

    async def check_system_health(self) -> str:
        """Check CPU and RAM"""
        if psutil is None:
            return "psutil not available for system health check"
        cpu_usage = psutil.cpu_percent(interval=1)  # type: ignore
        ram_usage = psutil.virtual_memory().percent  # type: ignore
        return f"System Health: CPU is at {cpu_usage}%, and RAM is at {ram_usage}%."

    async def get_news(self, category: str = "general") -> str:
        """Get latest news headlines using NewsAPI (free tier)"""
        try:

            api_key = os.getenv('NEWS_API_KEY')
            if not api_key:
                return "NEWS_API_KEY not found in environment variables. Get one from https://newsapi.org/register"

            newsapi = NewsApiClient(api_key=api_key)  # type: ignore

            # Get top headlines
            top_headlines: Dict[str, Any] = await asyncio.get_event_loop().run_in_executor(
                None, lambda: newsapi.get_top_headlines(category=category, language='en', page_size=5)  # type: ignore
            )

            if top_headlines['status'] == 'ok' and top_headlines['articles']:
                headlines: List[str] = []
                for i, article in enumerate(top_headlines['articles'][:5], 1):
                    title: str = article['title']
                    source: str = article['source']['name']
                    headlines.append(f"{i}. {title} ({source})")

                return f"Latest {category} news:\n" + "\n".join(headlines)
            else:
                return f"No news found for category: {category}"

        except Exception as e:
            logger.error(f"News error: {e}")
            return "Could not fetch news at this time."
