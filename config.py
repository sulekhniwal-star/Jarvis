import logging
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    pass

# Optional imports with fallbacks
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

try:
    import cv2  # type: ignore
except ImportError:
    cv2 = None  # type: ignore

try:
    import vosk  # type: ignore
except ImportError:
    vosk = None  # type: ignore

try:
    import psutil  # type: ignore
except ImportError:
    psutil = None  # type: ignore

try:
    import yfinance as yf  # type: ignore
except ImportError:
    yf = None  # type: ignore

try:
    import pywhatkit  # type: ignore
except ImportError:
    pywhatkit = None  # type: ignore

try:
    from newsapi import NewsApiClient  # type: ignore
except ImportError:
    NewsApiClient = None  # type: ignore

try:
    import tkinter as tk  # type: ignore
    from tkinter import scrolledtext, messagebox  # type: ignore
except ImportError:
    tk = None  # type: ignore

# Load environment variables
if load_dotenv:
    load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Gemini function schemas
TOOLS: list[dict[str, Any]] = [
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
                "name": "analyze_webcam",
                "description": "Capture a frame from the webcam and analyze it",
                "parameters": {"type": "object", "properties": {}}
            },
            {
                "name": "remember_fact",
                "description": "Remember a fact or information",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string", "description": "Key for the memory"},
                        "value": {"type": "string", "description": "Value to remember"}
                    },
                    "required": ["key", "value"]
                }
            },
            {
                "name": "recall_memory",
                "description": "Recall a remembered fact",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "key": {"type": "string", "description": "Key to recall"}
                    },
                    "required": ["key"]
                }
            },
            {
                "name": "get_battery_status",
                "description": "Get the current battery status",
                "parameters": {"type": "object", "properties": {}}
            },
            {
                "name": "shutdown_system",
                "description": "Shutdown the system",
                "parameters": {"type": "object", "properties": {}}
            },
            {
                "name": "restart_system",
                "description": "Restart the system",
                "parameters": {"type": "object", "properties": {}}
            },
            {
                "name": "sleep_system",
                "description": "Put the system to sleep",
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
            },
            {
                "name": "play_youtube",
                "description": "Play a video or song on YouTube",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "topic": {"type": "string", "description": "The name of the video or song to play"}
                    },
                    "required": ["topic"]
                }
            },
            {
                "name": "get_stock_price",
                "description": "Get the current stock price of a company",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "ticker": {"type": "string", "description": "The stock ticker symbol (e.g., AAPL, GOOGL)"}
                    },
                    "required": ["ticker"]
                }
            },
            {
                "name": "check_system_health",
                "description": "Check CPU and RAM usage",
                "parameters": {"type": "object", "properties": {}}
            },
            {
                "name": "get_news",
                "description": "Get latest news headlines",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {"type": "string", "description": "News category (general, business, technology, etc.)"}
                    },
                    "required": []
                }
            }
        ]
    }
]
