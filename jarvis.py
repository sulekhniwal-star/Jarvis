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

load_dotenv()

class Jarvis:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.wake_word = "jarvis"
        self.listening = True
        
        # Initialize Gemini AI
        genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
        self.model = genai.GenerativeModel('gemini-pro')
        
        # Initialize pygame for audio
        pygame.mixer.init()
        
        # Initialize Spotify
        self.spotify = None
        if os.getenv('SPOTIFY_CLIENT_ID'):
            self.spotify = spotipy.Spotify(auth_manager=SpotifyOAuth(
                client_id=os.getenv('SPOTIFY_CLIENT_ID'),
                client_secret=os.getenv('SPOTIFY_CLIENT_SECRET'),
                redirect_uri="http://localhost:8080",
                scope="user-modify-playback-state user-read-playback-state"
            ))
        
    async def speak(self, text):
        print(f"Jarvis: {text}")
        
        # Use Edge-TTS for natural voice
        voice = "en-US-AriaNeural"
        communicate = edge_tts.Communicate(text, voice)
        
        audio_data = b""
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_data += chunk["data"]
        
        # Play audio using pygame
        pygame.mixer.music.load(io.BytesIO(audio_data))
        pygame.mixer.music.play()
        
        while pygame.mixer.music.get_busy():
            await asyncio.sleep(0.1)
    
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
        except sr.RequestError:
            self.speak("Sorry, I'm having trouble with speech recognition")
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
        if "volume up" in command:
            pyautogui.press('volumeup')
            return "Volume increased"
        elif "volume down" in command:
            pyautogui.press('volumedown')
            return "Volume decreased"
        elif "mute" in command:
            pyautogui.press('volumemute')
            return "Audio muted"
        elif "lock screen" in command:
            os.system("rundll32.exe user32.dll,LockWorkStation")
            return "Screen locked"
        elif "screenshot" in command:
            pyautogui.screenshot("screenshot.png")
            return "Screenshot saved"
        return "System command not recognized"
    
    async def ask_ai(self, question):
        try:
            response = self.model.generate_content(question)
            return response.text
        except:
            return "I'm having trouble connecting to my AI brain right now"
    
    def wait_for_wake_word(self):
        # Simple wake word detection using speech recognition
        try:
            with self.microphone as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
            
            with self.microphone as source:
                audio = self.recognizer.listen(source, timeout=1, phrase_time_limit=3)
            
            command = self.recognizer.recognize_google(audio).lower()
            return self.wake_word in command
        except:
            return False
    
    def get_weather(self, command):
        # Extract city from command
        city_match = re.search(r'weather in (.+)', command)
        city = city_match.group(1) if city_match else "New York"
        
        try:
            # Using free wttr.in service
            url = f"http://wttr.in/{city}?format=%C+%t+in+%l"
            response = requests.get(url)
            
            if response.status_code == 200:
                weather_info = response.text.strip()
                return f"The weather is {weather_info}"
            else:
                return f"Sorry, I couldn't get weather for {city}"
        except:
            return "Weather service unavailable"
    
    async def process_command(self, command):
        if not command:
            return
            
        # Basic commands (fast response)
        if "time" in command:
            await self.speak(self.get_time())
        
        elif "date" in command:
            await self.speak(self.get_date())
        
        elif "weather" in command:
            await self.speak(self.get_weather(command))
        
        elif "play" in command and "youtube" in command:
            query = command.replace("play", "").replace("youtube", "").strip()
            await self.speak(self.play_youtube(query))
        
        elif "search" in command:
            query = command.replace("search", "").strip()
            await self.speak(self.search_web(query))
        
        elif "what is" in command or "who is" in command:
            query = command.replace("what is", "").replace("who is", "").strip()
            result = self.get_wikipedia_summary(query)
            await self.speak(result)
        
        elif "spotify" in command or "music" in command:
            result = self.control_spotify(command)
            await self.speak(result)
        
        elif "open" in command:
            if "notepad" in command:
                os.system("notepad")
                await self.speak("Opening Notepad")
            elif "calculator" in command:
                os.system("calc")
                await self.speak("Opening Calculator")
            elif "browser" in command:
                webbrowser.open("https://www.google.com")
                await self.speak("Opening browser")
        
        elif any(word in command for word in ["volume", "mute", "lock", "screenshot"]):
            result = self.system_control(command)
            await self.speak(result)
        
        elif "shutdown" in command or "exit" in command:
            await self.speak("Goodbye sir. Shutting down.")
            self.listening = False
        
        elif "hello" in command or "hi" in command:
            await self.speak("Hello sir. How can I assist you today?")
        
        else:
            # Use AI for unknown commands
            await self.speak("Let me think about that...")
            ai_response = await self.ask_ai(command)
            await self.speak(ai_response)
    
    async def run(self):
        await self.speak("Enhanced Jarvis online. I'm ready for natural conversation.")
        
        while self.listening:
            try:
                # Wait for wake word using speech recognition
                if self.wait_for_wake_word():
                    await self.speak("Yes sir?")
                    
                    # Listen for command
                    command = self.listen()
                    if command:
                        # Remove wake word if present
                        command = command.replace(self.wake_word, "").strip()
                        await self.process_command(command)
                
            except KeyboardInterrupt:
                await self.speak("Goodbye sir.")
                break
            except Exception as e:
                print(f"Error: {e}")
                await asyncio.sleep(1)

async def main():
    jarvis = Jarvis()
    await jarvis.run()

if __name__ == "__main__":
    asyncio.run(main())