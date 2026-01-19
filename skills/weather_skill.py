import asyncio
import requests
from skills.base_skill import BaseSkill

class WeatherSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'weather'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        location = entities.get('location')
        if not location:
            location = self.assistant.memory.get_preference('city', 'Indore')
        
        return await self.get_weather_async(location)

    async def get_weather_async(self, location: str):
        """Asynchronously fetch weather information."""
        try:
            # Geocoding API
            geocoding_url = "https://geocoding-api.open-meteo.com/v1/search"
            geocoding_params = {"name": location, "count": 1, "language": "en", "format": "json"}
            
            loop = asyncio.get_event_loop()
            geocoding_res = await loop.run_in_executor(None, lambda: requests.get(geocoding_url, params=geocoding_params, timeout=5))
            geocoding_data = geocoding_res.json()
            
            if "results" not in geocoding_data or len(geocoding_data["results"]) == 0:
                return f"Sorry, I couldn't find the location: {location}"
            
            location_data = geocoding_data["results"][0]
            latitude = location_data['latitude']
            longitude = location_data['longitude']
            city = location_data['name']
            
            # Weather API
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": latitude,
                "longitude": longitude,
                "current_weather": "true",
            }
            
            weather_res = await loop.run_in_executor(None, lambda: requests.get(url, params=params, timeout=5))
            weather_data = weather_res.json()
            
            temperature = weather_data['current_weather']['temperature']
            weather_code = weather_data['current_weather']['weathercode']
            
            weather_desc = self._get_weather_description(weather_code)
            
            response = f"The weather in {city} is {weather_desc} with a temperature of {temperature}°C."
            
            self.assistant.memory.add_habit(f"weather_check_{city}")
            return response
        
        except requests.RequestException:
            return "I couldn't fetch the weather. Please check your internet connection."
        except Exception as e:
            print(f"❌ Weather error: {e}")
            return "Sorry, I couldn't get the weather information."

    def _get_weather_description(self, code: int) -> str:
        """Convert WMO weather code to description."""
        weather_codes = {
            0: "clear sky", 1: "mostly clear", 2: "partly cloudy", 3: "overcast",
            45: "foggy", 51: "drizzling", 61: "rainy", 71: "snowing",
            80: "rain showers", 95: "thunderstorm"
        }
        return weather_codes.get(code, "cloudy")
