"""
This package contains all the skills for JARVIS.
"""

from .base_skill import BaseSkill
from .basic_skills import GreetingSkill, TimeSkill, JokeSkill, ExitSkill
from .memory_skills import LearnPreferenceSkill, GetPreferenceSkill, AddContactSkill
from .system_skills import OpenAppSkill, VolumeSkill, SystemInfoSkill, ScreenshotSkill, ShutdownSkill
from .weather_skill import WeatherSkill

__all__ = [
    "BaseSkill",
    "GreetingSkill",
    "TimeSkill",
    "JokeSkill",
    "ExitSkill",
    "LearnPreferenceSkill",
    "GetPreferenceSkill",
    "AddContactSkill",
    "OpenAppSkill",
    "VolumeSkill",
    "SystemInfoSkill",
    "ScreenshotSkill",
    "ShutdownSkill",
    "WeatherSkill"
]
