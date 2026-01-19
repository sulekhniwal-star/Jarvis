import speech_recognition as sr
import pyttsx3
import datetime
import webbrowser
import os
import requests
import json
import threading
import time

class Jarvis:
    def __init__(self):
        self.recognizer = sr.Recognizer()
        self.microphone = sr.Microphone()
        self.tts_engine = pyttsx3.init()
        self.setup_voice()
        self.wake_word = "jarvis"
        self.listening = True
        
    def setup_voice(self):
        voices = self.tts_engine.getProperty('voices')
        # Use male voice if available
        for voice in voices:
            if 'male' in voice.name.lower():
                self.tts_engine.setProperty('voice', voice.id)
                break
        self.tts_engine.setProperty('rate', 180)
        self.tts_engine.setProperty('volume', 0.9)
    
    def speak(self, text):
        print(f"Jarvis: {text}")
        self.tts_engine.say(text)
        self.tts_engine.runAndWait()
    
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
        search_url = f"https://www.google.com/search?q={query}"
        webbrowser.open(search_url)
        return f"Searching for {query}"
    
    def get_weather(self, city="New York"):
        try:
            # Using a free weather API (you'll need to get an API key)
            api_key = "your_api_key_here"  # Replace with actual API key
            url = f"http://api.openweathermap.org/data/2.5/weather?q={city}&appid={api_key}&units=metric"
            response = requests.get(url)
            data = response.json()
            
            if response.status_code == 200:
                temp = data['main']['temp']
                desc = data['weather'][0]['description']
                return f"The weather in {city} is {desc} with a temperature of {temp} degrees Celsius"
            else:
                return "Sorry, I couldn't get the weather information"
        except:
            return "Weather service is currently unavailable"
    
    def process_command(self, command):
        if not command:
            return
            
        if "time" in command:
            self.speak(self.get_time())
        
        elif "date" in command:
            self.speak(self.get_date())
        
        elif "weather" in command:
            self.speak(self.get_weather())
        
        elif "search" in command or "google" in command:
            query = command.replace("search", "").replace("google", "").strip()
            if query:
                self.speak(self.search_web(query))
            else:
                self.speak("What would you like me to search for?")
        
        elif "open" in command:
            if "notepad" in command:
                os.system("notepad")
                self.speak("Opening Notepad")
            elif "calculator" in command:
                os.system("calc")
                self.speak("Opening Calculator")
            elif "browser" in command:
                webbrowser.open("https://www.google.com")
                self.speak("Opening browser")
        
        elif "shutdown" in command or "exit" in command or "quit" in command:
            self.speak("Goodbye sir. Shutting down.")
            self.listening = False
        
        elif "hello" in command or "hi" in command:
            self.speak("Hello sir. How can I assist you today?")
        
        else:
            self.speak("I'm sorry, I didn't understand that command. Try asking about time, date, weather, or tell me to search something.")
    
    def run(self):
        self.speak("Jarvis online. How may I assist you today?")
        
        while self.listening:
            try:
                command = self.listen()
                
                if self.wake_word in command:
                    # Remove wake word and process the rest
                    command = command.replace(self.wake_word, "").strip()
                    if command:
                        self.process_command(command)
                    else:
                        self.speak("Yes sir?")
                
            except KeyboardInterrupt:
                self.speak("Goodbye sir.")
                break
            except Exception as e:
                print(f"Error: {e}")
                time.sleep(1)

if __name__ == "__main__":
    jarvis = Jarvis()
    jarvis.run()