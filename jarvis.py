import speech_recognition as sr
import edge_tts
import asyncio
import pygame
import io
import datetime
import webbrowser
import os
import requests
import json
import re
import pywhatkit
import wikipedia
import pyautogui
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv
import google.generativeai as genai
import threading
import time
import logging
import platform
import subprocess
from collections import deque
import cv2
import numpy as np
from PIL import Image
import base64
import sqlite3
from datetime import datetime as dt
import pickle
from AppOpener import open as app_open
import openai
from googletrans import Translator
import hashlib
import getpass
import tkinter as tk
from tkinter import ttk, scrolledtext
from flask import Flask, jsonify, request

load_dotenv()
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class JarvisSkillManager:
    def __init__(self):
        self.skills = {}
        self.load_default_skills()
    
    def register_skill(self, name, handler, keywords):
        self.skills[name] = {'handler': handler, 'keywords': keywords}
    
    def load_default_skills(self):
        self.register_skill('math', self.math_solver, ['calculate', 'math', 'solve'])
        self.register_skill('trivia', self.trivia_game, ['trivia', 'quiz', 'game'])
    
    def math_solver(self, query):
        try:
            math_expr = re.search(r'[0-9+\-*/().\s]+', query)
            if math_expr:
                result = eval(math_expr.group())
                return f"The answer is {result}"
        except:
            return "I couldn't solve that math problem"
        return "Please provide a valid math expression"
    
    def trivia_game(self, query):
        questions = [
            ("What is the capital of France?", "Paris"),
            ("What is 2 + 2?", "4"),
            ("What year was Python created?", "1991")
        ]
        import random
        q, a = random.choice(questions)
        return f"Trivia question: {q}"
    
    def find_skill(self, command):
        for skill_name, skill_data in self.skills.items():
            for keyword in skill_data['keywords']:
                if keyword in command.lower():
                    return skill_data['handler']
        return None

class JarvisAuth:
    def __init__(self):
        self.authenticated = False
        self.auth_method = os.getenv('AUTH_METHOD', 'none')
        self.user_pin = os.getenv('USER_PIN', '1234')
    
    def authenticate(self, method='pin', input_data=None):
        if self.auth_method == 'none':
            self.authenticated = True
            return True
        if method == 'pin' and input_data == self.user_pin:
            self.authenticated = True
            return True
        return False
    
    def is_authenticated(self):
        return self.authenticated

class JarvisGUI:
    def __init__(self, jarvis_instance):
        self.jarvis = jarvis_instance
        self.root = tk.Tk()
        self.root.title("Jarvis Dashboard")
        self.root.geometry("800x600")
        self.setup_gui()
    
    def setup_gui(self):
        self.response_text = scrolledtext.ScrolledText(self.root, height=20, width=80)
        self.response_text.pack(pady=10)
        
        self.command_entry = tk.Entry(self.root, width=60)
        self.command_entry.pack(pady=5)
        
        send_btn = tk.Button(self.root, text="Send Command", command=self.send_command)
        send_btn.pack(pady=5)
        
        self.status_label = tk.Label(self.root, text="Status: Ready")
        self.status_label.pack(pady=5)
    
    def send_command(self):
        command = self.command_entry.get()
        if command:
            self.response_text.insert(tk.END, f"You: {command}\n")
            response = "Processing command..."
            self.response_text.insert(tk.END, f"Jarvis: {response}\n")
            self.command_entry.delete(0, tk.END)
    
    def run(self):
        self.root.mainloop()

class JarvisAPI:
    def __init__(self, jarvis_instance):
        self.jarvis = jarvis_instance
        self.app = Flask(__name__)
        self.setup_routes()
    
    def setup_routes(self):
        @self.app.route('/api/command', methods=['POST'])
        def process_command():
            data = request.json
            command = data.get('command', '')
            response = "Command processed"
            return jsonify({'response': response, 'status': 'success'})
        
        @self.app.route('/api/status', methods=['GET'])
        def get_status():
            return jsonify({'status': 'online', 'version': '2.0'})
    
    def run(self, host='0.0.0.0', port=5000):
        self.app.run(host=host, port=port, debug=False)

class Jarvis:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.wake_word = "jarvis"
        self.listening = True
        self.conversation_memory = deque(maxlen=20)
        self.current_voice = "en-US-AriaNeural"
        self.offline_mode = False
        self.current_language = 'en'
        
        # Initialize components
        self.skill_manager = JarvisSkillManager()
        self.auth = JarvisAuth()
        self.translator = Translator()
        
        # Initialize long-term memory database
        self.init_memory_db()
        
        # Initialize AI models
        self.init_ai_models()
        
        # Initialize services
        self.init_services()
        
        # Available voices with emotions
        self.voices = {
            "male": "en-US-DavisNeural",
            "female": "en-US-AriaNeural",
            "british": "en-GB-RyanNeural",
            "cheerful": "en-US-JennyNeural",
            "serious": "en-US-GuyNeural"
        }
        
        # Custom commands storage
        self.custom_commands = self.load_custom_commands()
        
        # Work mode applications (cross-platform)
        self.work_apps = self.get_platform_apps()
    
    def init_ai_models(self):
        try:
            genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            self.vision_model = genai.GenerativeModel('gemini-1.5-flash')
            
            if os.getenv('OPENAI_API_KEY'):
                openai.api_key = os.getenv('OPENAI_API_KEY')
                self.openai_available = True
            else:
                self.openai_available = False
            
            logging.info("AI models initialized")
        except Exception as e:
            logging.error(f"AI model initialization failed: {e}")
            self.gemini_model = None
            self.vision_model = None
    
    def init_services(self):
        try:
            pygame.mixer.init()
            
            self.spotify = None
            if os.getenv('SPOTIFY_CLIENT_ID'):
                self.spotify = spotipy.Spotify(auth_manager=SpotifyOAuth(
                    client_id=os.getenv('SPOTIFY_CLIENT_ID'),
                    client_secret=os.getenv('SPOTIFY_CLIENT_SECRET'),
                    redirect_uri="http://localhost:8080",
                    scope="user-modify-playback-state user-read-playback-state"
                ))
        except Exception as e:
            logging.error(f"Service initialization failed: {e}")
    
    def get_platform_apps(self):
        system = platform.system().lower()
        if system == "windows":
            return ["code", "spotify", "chrome"]
        elif system == "darwin":
            return ["open -a 'Visual Studio Code'", "open -a Spotify", "open -a 'Google Chrome'"]
        else:
            return ["code", "spotify", "google-chrome"]
    
    def load_custom_commands(self):
        try:
            if os.path.exists('custom_commands.json'):
                with open('custom_commands.json', 'r') as f:
                    return json.load(f)
        except Exception as e:
            logging.error(f"Failed to load custom commands: {e}")
        return {}
    
    def save_custom_command(self, trigger, response):
        self.custom_commands[trigger] = response
        try:
            with open('custom_commands.json', 'w') as f:
                json.dump(self.custom_commands, f, indent=2)
            return f"Custom command '{trigger}' saved"
        except Exception as e:
            return f"Failed to save command: {e}"
    
    def translate_text(self, text, target_lang='en'):
        try:
            if target_lang != 'en':
                result = self.translator.translate(text, dest=target_lang)
                return result.text
            return text
        except Exception as e:
            logging.error(f"Translation failed: {e}")
            return text
    
    def detect_language(self, text):
        try:
            detection = self.translator.detect(text)
            return detection.lang
        except:
            return 'en'
    
    def learning_mode(self, command):
        if "teach me" in command or "learn that" in command:
            fact = command.replace("teach me", "").replace("learn that", "").strip()
            if fact:
                self.save_memory('learned_fact', fact, importance=3)
                return f"I've learned: {fact}"
            return "What would you like me to learn?"
        elif "what did you learn about" in command:
            topic = command.replace("what did you learn about", "").strip()
            memories = self.recall_memory(topic)
            if memories:
                return f"I learned: {'. '.join(memories[:2])}"
            return f"I haven't learned anything about {topic} yet"
        return "Learning mode: Say 'teach me [fact]' or 'what did you learn about [topic]'"
    
    def multi_ai_response(self, query):
        responses = []
        
        if self.gemini_model:
            try:
                gemini_response = self.gemini_model.generate_content(query)
                responses.append(('gemini', gemini_response.text))
            except Exception as e:
                logging.error(f"Gemini error: {e}")
        
        if self.openai_available:
            try:
                openai_response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[{"role": "user", "content": query}],
                    max_tokens=150
                )
                responses.append(('openai', openai_response.choices[0].message.content))
            except Exception as e:
                logging.error(f"OpenAI error: {e}")
        
        if responses:
            return responses[0][1]
        return "I'm having trouble with my AI systems right now"
        
    def init_memory_db(self):
        """Initialize SQLite database for long-term memory"""
        try:
            self.conn = sqlite3.connect('jarvis_memory.db')
            self.conn.execute('''
                CREATE TABLE IF NOT EXISTS memories (
                    id INTEGER PRIMARY KEY,
                    timestamp TEXT,
                    category TEXT,
                    content TEXT,
                    importance INTEGER
                )
            ''')
            self.conn.commit()
        except Exception as e:
            logging.error(f"Memory DB init failed: {e}")
    
    def save_memory(self, category, content, importance=1):
        """Save important information to long-term memory"""
        try:
            timestamp = dt.now().isoformat()
            self.conn.execute(
                "INSERT INTO memories (timestamp, category, content, importance) VALUES (?, ?, ?, ?)",
                (timestamp, category, content, importance)
            )
            self.conn.commit()
        except Exception as e:
            logging.error(f"Save memory failed: {e}")
    
    def recall_memory(self, query):
        """Retrieve relevant memories based on query"""
        try:
            cursor = self.conn.execute(
                "SELECT content FROM memories WHERE content LIKE ? ORDER BY importance DESC LIMIT 3",
                (f"%{query}%",)
            )
            memories = [row[0] for row in cursor.fetchall()]
    async def speak(self, text, emotion="neutral"):
        print(f"Jarvis: {text}")
        
        try:
            if self.current_language != 'en':
                text = self.translate_text(text, self.current_language)
            
            voice = self.current_voice
            if emotion == "cheerful":
                voice = self.voices.get("cheerful", self.current_voice)
            elif emotion == "serious":
                voice = self.voices.get("serious", self.current_voice)
            
            if emotion == "excited":
                text = f"<prosody rate='fast' pitch='high'>{text}</prosody>"
            elif emotion == "calm":
                text = f"<prosody rate='slow' pitch='low'>{text}</prosody>"
            
            communicate = edge_tts.Communicate(text, voice)
            
            audio_data = b""
            async for chunk in communicate.stream():
                if chunk["type"] == "audio":
                    audio_data += chunk["data"]
            
            pygame.mixer.music.load(io.BytesIO(audio_data))
            pygame.mixer.music.play()
            
            while pygame.mixer.music.get_busy():
                await asyncio.sleep(0.1)
        except Exception as e:
            logging.error(f"Speech failed: {e}")
            print(f"Jarvis: {text}")
    
    def listen(self):
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            with self.microphone as source:
                audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=5)
            
            command = self.recognizer.recognize_google(audio).lower()
            print(f"You said: {command}")
            return command
        except sr.WaitTimeoutError:
            return ""
        except sr.UnknownValueError:
            return ""
        except sr.RequestError as e:
            logging.error(f"Speech recognition error: {e}")
            self.offline_mode = True
            return ""
        except Exception as e:
            logging.error(f"Listen error: {e}")
            return ""
    
    def get_time(self):
        now = datetime.datetime.now()
        return f"The current time is {now.strftime('%I:%M %p')}"
    
    def get_date(self):
        today = datetime.date.today()
        return f"Today is {today.strftime('%A, %B %d, %Y')}"
    
    def search_web(self, query):
        webbrowser.open(f"https://www.google.com/search?q={query}")
        return f"Searching for {query}"
    
    def play_youtube(self, query):
        try:
            pywhatkit.playonyt(query)
            return f"Playing {query} on YouTube"
        except:
            return "Couldn't play video"
    
    def get_wikipedia_summary(self, query):
        try:
            summary = wikipedia.summary(query, sentences=2)
            return summary
        except:
            return f"Couldn't find information about {query}"
    
    def control_spotify(self, command):
        if not self.spotify:
            return "Spotify not configured"
        
        try:
            if "play" in command:
                self.spotify.start_playback()
                return "Playing music"
            elif "pause" in command or "stop" in command:
                self.spotify.pause_playback()
                return "Music paused"
            elif "next" in command:
                self.spotify.next_track()
                return "Next song"
            elif "previous" in command:
                self.spotify.previous_track()
                return "Previous song"
        except:
            return "Spotify control failed"
    
    def system_control(self, command):
        try:
            system = platform.system().lower()
            
            if "volume up" in command:
                if system == "windows":
                    pyautogui.press('volumeup')
                elif system == "darwin":
                    subprocess.run(["osascript", "-e", "set volume output volume (output volume of (get volume settings) + 10)"])
                elif system == "linux":
                    subprocess.run(["amixer", "set", "Master", "5%+"])
                return "Volume increased"
                
            elif "volume down" in command:
                if system == "windows":
                    pyautogui.press('volumedown')
                elif system == "darwin":
                    subprocess.run(["osascript", "-e", "set volume output volume (output volume of (get volume settings) - 10)"])
                elif system == "linux":
                    subprocess.run(["amixer", "set", "Master", "5%-"])
                return "Volume decreased"
                
            elif "mute" in command:
                if system == "windows":
                    pyautogui.press('volumemute')
                elif system == "darwin":
                    subprocess.run(["osascript", "-e", "set volume with output muted"])
                elif system == "linux":
                    subprocess.run(["amixer", "set", "Master", "toggle"])
                return "Audio muted"
                
            elif "lock screen" in command:
                if system == "windows":
                    os.system("rundll32.exe user32.dll,LockWorkStation")
                elif system == "darwin":
                    subprocess.run(["/System/Library/CoreServices/Menu Extras/User.menu/Contents/Resources/CGSession", "-suspend"])
                elif system == "linux":
                    subprocess.run(["xdg-screensaver", "lock"])
                return "Screen locked"
                
            elif "screenshot" in command:
                pyautogui.screenshot("screenshot.png")
                return "Screenshot saved"
                
        except Exception as e:
            logging.error(f"System control error: {e}")
            return "System command failed"
        
        return "System command not recognized"
    
    async def ask_ai(self, question):
        if not self.gemini_model:
            return "AI service unavailable"
            
        try:
            memories = self.recall_memory(question)
            context_from_memory = "\n".join(memories) if memories else ""
            
            conversation_context = "\n".join([f"User: {q}\nJarvis: {a}" for q, a in self.conversation_memory])
            full_context = f"{context_from_memory}\n{conversation_context}" if context_from_memory else conversation_context
            
            full_prompt = f"{full_context}\nUser: {question}\nJarvis:" if full_context else question
            
            response = self.gemini_model.generate_content(full_prompt)
            
            self.conversation_memory.append((question, response.text))
            
            if any(word in question.lower() for word in ['remember', 'important', 'preference', 'like', 'dislike']):
                self.save_memory('preference', f"User said: {question}. Response: {response.text}", importance=2)
            
            return response.text
        except Exception as e:
            logging.error(f"AI error: {e}")
            return "I'm having trouble with my AI brain right now"
    
    def wait_for_wake_word(self):
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            with self.microphone as source:
                audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=3)
            
            command = self.recognizer.recognize_google(audio).lower()
            return self.wake_word in command or "hey jarvis" in command
        except:
            return False
    
    def get_weather(self, command):
        if self.offline_mode:
            return "Weather requires internet connection"
            
        city_match = re.search(r'weather in (.+)', command)
        city = city_match.group(1) if city_match else "New York"
        
        try:
            url = f"http://wttr.in/{city}?format=%C+%t+in+%l"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                weather_info = response.text.strip()
                return f"The weather is {weather_info}"
            else:
                return f"Sorry, I couldn't get weather for {city}"
        except Exception as e:
            logging.error(f"Weather error: {e}")
            return "Weather service unavailable"
    
    async def analyze_screen(self, user_prompt="Analyze this screenshot"):
        """Capture screenshot and analyze with Gemini Vision"""
        if not self.vision_model:
            return "Vision capabilities not available"
        
        try:
            # Take screenshot
            screenshot = pyautogui.screenshot()
            screenshot.save("temp_screenshot.png")
            
            # Prepare image for Gemini
            image = Image.open("temp_screenshot.png")
            
            # Analyze with Gemini Vision
            response = self.vision_model.generate_content([user_prompt, image])
            
            # Clean up
            os.remove("temp_screenshot.png")
            
            return response.text
        except Exception as e:
            logging.error(f"Screen analysis failed: {e}")
            return "Couldn't analyze the screen"
    
    def get_news_headlines(self):
        """Fetch top news headlines using NewsAPI"""
        if self.offline_mode:
            return "News requires internet connection"
        
        try:
            api_key = os.getenv('NEWS_API_KEY')
            if not api_key:
                return "News API key not configured"
            
            url = f"https://newsapi.org/v2/top-headlines?country=us&category=technology&pageSize=5&apiKey={api_key}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                articles = data.get('articles', [])
                
                if not articles:
                    return "No news articles found"
                
                headlines = []
                for i, article in enumerate(articles[:5], 1):
                    title = article.get('title', 'No title')
                    headlines.append(f"{i}. {title}")
                
                return "Here are the top tech headlines: " + ". ".join(headlines)
            else:
                return "Couldn't fetch news at the moment"
        except Exception as e:
            logging.error(f"News fetch error: {e}")
            return "News service unavailable"
    
    def generate_image_hf(self, prompt):
        """Generate image using Hugging Face Inference API"""
        if self.offline_mode:
            return "Image generation requires internet connection"
        
        try:
            hf_token = os.getenv('HF_TOKEN')
            if not hf_token:
                return "Hugging Face token not configured"
            
            # Use Stable Diffusion model
            api_url = "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5"
            headers = {"Authorization": f"Bearer {hf_token}"}
            
            payload = {"inputs": prompt}
            
            response = requests.post(api_url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                # Save the generated image
                timestamp = int(time.time())
                filename = f"generated_image_{timestamp}.png"
                
                with open(filename, "wb") as f:
                    f.write(response.content)
                
                # Open the image
                if platform.system() == "Windows":
                    os.startfile(filename)
                elif platform.system() == "Darwin":
                    subprocess.run(["open", filename])
                else:
                    subprocess.run(["xdg-open", filename])
                
                return f"Image generated and saved as {filename}. Opening now."
            else:
                return "Image generation failed. The model might be loading, try again in a moment."
        except Exception as e:
            logging.error(f"Image generation error: {e}")
            return "Couldn't generate image"
    
    def open_application(self, app_name):
        """Open application using AppOpener"""
        try:
            app_open(app_name, match_closest=True)
            return f"Opening {app_name}"
        except Exception as e:
            logging.error(f"App opening error: {e}")
            return f"Couldn't open {app_name}. Make sure it's installed."
    
    def get_stock_info(self, symbol):
        """Get stock information using Alpha Vantage"""
        if self.offline_mode:
            return "Stock info requires internet connection"
        
        try:
            api_key = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')
            url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={api_key}"
            
            response = requests.get(url, timeout=5)
            data = response.json()
            
            if "Global Quote" in data:
                quote = data["Global Quote"]
                price = quote["05. price"]
                change = quote["09. change"]
                return f"{symbol} is trading at ${price}, change: {change}"
            else:
                return f"Couldn't get stock info for {symbol}"
        except Exception as e:
            logging.error(f"Stock info error: {e}")
            return "Stock service unavailable"
    
    def work_mode(self):
        """Launch work applications"""
        try:
            system = platform.system().lower()
            apps = self.work_apps.get(system, [])
            
            for app in apps:
                if system == "windows":
                    subprocess.Popen(app, shell=True)
                else:
                    subprocess.Popen(app.split(), shell=True)
                time.sleep(1)  # Delay between launches
            
            return "Work mode activated - launching VS Code, Spotify, and browser"
        except Exception as e:
            logging.error(f"Work mode error: {e}")
            return "Couldn't activate work mode"
        if self.offline_mode:
            return "News requires internet connection"
            
        try:
            url = "https://newsapi.org/v2/top-headlines?country=us&pageSize=3&apiKey=" + os.getenv('NEWS_API_KEY', 'demo')
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                headlines = [article['title'] for article in data.get('articles', [])[:3]]
                return "Top headlines: " + ". ".join(headlines)
            else:
                return "News unavailable"
        except Exception as e:
            logging.error(f"News error: {e}")
            return "Couldn't fetch news"
    
    def set_reminder(self, command):
        time_match = re.search(r'remind me in (\d+) (minutes?|hours?)', command)
        if time_match:
            duration = int(time_match.group(1))
            unit = time_match.group(2)
            message = command.split('to ')[-1] if 'to ' in command else "reminder"
            
            seconds = duration * 60 if 'minute' in unit else duration * 3600
            threading.Timer(seconds, self._reminder_callback, args=[message]).start()
            return f"Reminder set for {duration} {unit}"
        return "Please specify time like 'remind me in 5 minutes to call mom'"
    
    def _reminder_callback(self, message):
        asyncio.create_task(self.speak(f"Reminder: {message}"))
    
    def change_voice(self, command):
        for voice_name, voice_id in self.voices.items():
            if voice_name in command:
                self.current_voice = voice_id
                return f"Voice changed to {voice_name}"
        return "Available voices: male, female, british"
    
    async def process_command(self, command):
        if not command:
            return
        
        sensitive_commands = ['shutdown', 'delete', 'format', 'install']
        if any(cmd in command for cmd in sensitive_commands) and not self.auth.is_authenticated():
            await self.speak("Authentication required for this command")
            return
        
        try:
            detected_lang = self.detect_language(command)
            if detected_lang != 'en':
                command = self.translate_text(command, 'en')
                self.current_language = detected_lang
            
            for trigger, response in self.custom_commands.items():
                if trigger.lower() in command.lower():
                    await self.speak(response)
                    return
            
            skill_handler = self.skill_manager.find_skill(command)
            if skill_handler:
                result = skill_handler(command)
                await self.speak(result)
                return
            
            if "teach me" in command or "learn that" in command or "what did you learn" in command:
                result = self.learning_mode(command)
                await self.speak(result)
                return
            
            if "create command" in command:
                parts = command.split("create command", 1)[1].strip().split("response")
                if len(parts) == 2:
                    trigger = parts[0].strip()
                    response = parts[1].strip()
                    result = self.save_custom_command(trigger, response)
                    await self.speak(result)
                else:
                    await self.speak("Say: create command [trigger] response [response]")
                return
            
            if "switch to" in command and "language" in command:
                lang_map = {'spanish': 'es', 'french': 'fr', 'german': 'de', 'english': 'en'}
                for lang_name, lang_code in lang_map.items():
                    if lang_name in command:
                        self.current_language = lang_code
                        await self.speak(f"Switched to {lang_name}")
                        return
            
            # Vision commands
            if "what am i looking at" in command or "analyze screen" in command or "what's on my screen" in command:
                prompt = "Analyze this screenshot and describe what you see"
                if "what" in command and "screen" not in command:
                    prompt = command
                result = await self.analyze_screen(prompt)
                await self.speak(result)
            
            # News commands
            elif "tell me the news" in command or "what's the news" in command or "news headlines" in command:
                result = self.get_news_headlines()
                await self.speak(result)
            
            # Image generation
            elif "generate image" in command or "create image" in command or "make image" in command:
                prompt = command
                for phrase in ["generate image of", "create image of", "make image of", "generate image", "create image", "make image"]:
                    if phrase in command:
                        prompt = command.split(phrase, 1)[-1].strip()
                        break
                
                if not prompt or prompt == command:
                    await self.speak("What image would you like me to generate?")
                    return
                
                result = self.generate_image_hf(prompt)
                await self.speak(result)
            
            # App opening
            elif "open" in command and not any(word in command for word in ["notepad", "calculator", "browser"]):
                app_name = command.replace("open", "").strip()
                if app_name:
                    result = self.open_application(app_name)
                    await self.speak(result)
                else:
                    await self.speak("What application would you like me to open?")
            
            # Existing commands with enhancements
            elif "time" in command:
                await self.speak(self.get_time())
            elif "date" in command:
                await self.speak(self.get_date())
            elif "weather" in command:
                result = self.get_weather(command)
                await self.speak(result)
            elif "remind me" in command:
                result = self.set_reminder(command)
                await self.speak(result)
            elif "change voice" in command or "voice" in command:
                result = self.change_voice(command)
                await self.speak(result)
            elif "work mode" in command or "start work" in command:
                result = self.work_mode()
                await self.speak(result, emotion="excited")
            elif "remember" in command:
                content = command.replace("remember", "").strip()
                self.save_memory('user_request', content, importance=2)
                await self.speak(f"I'll remember that: {content}")
            elif "what do you remember about" in command:
                query = command.replace("what do you remember about", "").strip()
                memories = self.recall_memory(query)
                if memories:
                    result = "I remember: " + ". ".join(memories[:2])
                else:
                    result = f"I don't have any memories about {query}"
                await self.speak(result)
            elif "shutdown" in command or "exit" in command:
                await self.speak("Goodbye sir. Shutting down.", emotion="calm")
                self.listening = False
            elif "hello" in command or "hi" in command:
                await self.speak("Hello sir. How can I assist you today?", emotion="cheerful")
            else:
                if not self.offline_mode:
                    await self.speak("Let me think about that...")
                    ai_response = self.multi_ai_response(command)
                    await self.speak(ai_response)
                else:
                    await self.speak("I'm in offline mode. Try basic commands like time, volume, or screenshot.")
                    
        except Exception as e:
            logging.error(f"Command error: {e}")
            await self.speak("Sorry, I encountered an error.", emotion="serious")
    
    async def _handle_open_command(self, command):
        try:
            if "notepad" in command:
                if platform.system() == "Windows":
                    os.system("notepad")
                elif platform.system() == "Darwin":
                    os.system("open -a TextEdit")
                else:
                    os.system("gedit")
                await self.speak("Opening text editor")
            elif "calculator" in command:
                if platform.system() == "Windows":
                    os.system("calc")
                elif platform.system() == "Darwin":
                    os.system("open -a Calculator")
                else:
                    os.system("gnome-calculator")
                await self.speak("Opening Calculator")
            elif "browser" in command:
                webbrowser.open("https://www.google.com")
                await self.speak("Opening browser")
        except Exception as e:
            logging.error(f"Open command error: {e}")
            await self.speak("Couldn't open that application")
    
    async def run(self, gui_mode=False, api_mode=False):
        await self.speak("Advanced Jarvis online with multi-AI, learning, and cross-platform capabilities.", emotion="cheerful")
        
        if gui_mode:
            gui = JarvisGUI(self)
            gui_thread = threading.Thread(target=gui.run)
            gui_thread.daemon = True
            gui_thread.start()
        
        if api_mode:
            api = JarvisAPI(self)
            api_thread = threading.Thread(target=lambda: api.run())
            api_thread.daemon = True
            api_thread.start()
        
        while self.listening:
            try:
                if self.wait_for_wake_word():
                    await self.speak("Yes sir?", emotion="cheerful")
                    
                    command = self.listen()
                    if command:
                        command = command.replace(self.wake_word, "").replace("hey jarvis", "").strip()
                        await self.process_command(command)
                
            except KeyboardInterrupt:
                await self.speak("Goodbye sir.", emotion="calm")
                if hasattr(self, 'conn'):
                    self.conn.close()
                break
            except Exception as e:
                logging.error(f"Main loop error: {e}")
                await asyncio.sleep(1)
                if not self.offline_mode:
                    await self.speak("I encountered an error but I'm still here.", emotion="serious")

async def main():
    import argparse
    parser = argparse.ArgumentParser(description='Advanced Jarvis AI Assistant')
    parser.add_argument('--gui', action='store_true', help='Enable GUI dashboard')
    parser.add_argument('--api', action='store_true', help='Enable REST API')
    parser.add_argument('--auth', choices=['none', 'pin'], default='none', help='Authentication method')
    
    args = parser.parse_args()
    
    os.environ['AUTH_METHOD'] = args.auth
    
    jarvis = Jarvis()
    
    if args.auth == 'pin':
        pin = getpass.getpass("Enter PIN: ")
        if not jarvis.auth.authenticate('pin', pin):
            print("Authentication failed")
            return
    
    await jarvis.run(gui_mode=args.gui, api_mode=args.api)

if __name__ == "__main__":
    asyncio.run(main())