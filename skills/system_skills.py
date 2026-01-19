import os
import webbrowser
from skills.base_skill import BaseSkill

# System monitoring
try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False
    print("⚠️ psutil not available - system info disabled")

# Screenshot capability
try:
    import pyautogui
    HAS_PYAUTOGUI = True
except ImportError:
    HAS_PYAUTOGUI = False
    print("⚠️ pyautogui not available - screenshot disabled")

# Try to import pycaw for audio control
try:
    from comtypes import CLSCTX_ALL
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
    HAS_AUDIO_CONTROL = True
except (ImportError, Exception):
    HAS_AUDIO_CONTROL = False
    print("⚠️  pycaw not available - volume control disabled")

# Try to import screen_brightness_control for brightness control
try:
    import screen_brightness_control as sbc
    HAS_BRIGHTNESS_CONTROL = True
except ImportError:
    HAS_BRIGHTNESS_CONTROL = False
    print("⚠️ screen_brightness_control not available - brightness control disabled")


class OpenAppSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'open_app'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        app_name = entities.get('app_name', '').lower()
        return self._open_application(app_name)

    def _open_application(self, app_name: str):
        """Open an application by searching for it."""
        app_paths = {
            'chrome': "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            'youtube': "https://www.youtube.com",
            'spotify': "https://www.spotify.com",
            'notepad': "C:\\Windows\\notepad.exe",
            'calculator': "C:\\Windows\\System32\\calc.exe",
            'vscode': "C:\\Program Files\\Microsoft VS Code\\Code.exe"
        }
        
        path = app_paths.get(app_name)
        if path:
            if path.startswith('http'):
                webbrowser.open(path)
            else:
                try:
                    os.startfile(path)
                except Exception as e:
                    return f"Could not open {app_name}: {e}"
            self.assistant.memory.add_habit(f"opened_{app_name}")
            return f"Opening {app_name}"
        else:
            # Search for the app in Program Files and Start Menu
            search_dirs = [
                os.environ.get("ProgramFiles", "C:\\Program Files"),
                os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"),
                os.path.join(os.environ.get("APPDATA"), "Microsoft\\Windows\\Start Menu\\Programs"),
                os.path.join(os.environ.get("ALLUSERSPROFILE"), "Microsoft\\Windows\\Start Menu\\Programs")
            ]
            for dir in search_dirs:
                for root, _, files in os.walk(dir):
                    for file in files:
                        if app_name.lower() in file.lower() and file.endswith((".exe", ".lnk")):
                            try:
                                os.startfile(os.path.join(root, file))
                                self.assistant.memory.add_habit(f"opened_{app_name}")
                                return f"Opening {app_name}"
                            except Exception as e:
                                return f"Found {app_name} but could not open it: {e}"
            return f"I don't know how to open {app_name}"


class AutomationSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent in ['type_text', 'move_mouse']

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not HAS_PYAUTOGUI:
            return "Automation features are not available."
        
        if intent == 'type_text':
            text_to_type = entities.get('text', '')
            if text_to_type:
                pyautogui.typewrite(text_to_type)
                return f"Typing: {text_to_type}"
            else:
                return "You need to tell me what to type."
        
        elif intent == 'move_mouse':
            x = entities.get('x')
            y = entities.get('y')
            if x is not None and y is not None:
                pyautogui.moveTo(int(x), int(y))
                return f"Moving mouse to ({x}, {y})"
            else:
                return "You need to provide x and y coordinates to move the mouse."
        return "Unknown automation command."


class WindowSwitchSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'switch_window'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not HAS_PYAUTOGUI:
            return "Window switching is not available."
        
        pyautogui.hotkey('alt', 'tab')
        return "Switching window."


class VolumeSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'volume'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        action = entities.get('action')
        level = entities.get('level')
        return self._control_volume(action, level)

    def _control_volume(self, action: str = None, level: int = None):
        """Control system volume."""
        if not HAS_AUDIO_CONTROL:
            return "Volume control is not available on this system."
        
        try:
            device = AudioUtilities.GetSpeakers()
            volume = device.EndpointVolume
            current_level = volume.GetMasterVolumeLevelScalar()
            
            if action == 'mute':
                volume.SetMute(True, None)
                return "Volume muted"
            elif action == 'unmute':
                volume.SetMute(False, None)
                return "Volume unmuted"
            elif action == 'increase':
                new_level = min(1.0, current_level + 0.1)
                volume.SetMasterVolumeLevelScalar(new_level, None)
                return f"Volume increased to {int(new_level * 100)}%"
            elif action == 'decrease':
                new_level = max(0.0, current_level - 0.1)
                volume.SetMasterVolumeLevelScalar(new_level, None)
                return f"Volume decreased to {int(new_level * 100)}%"
            elif action == 'set' and level is not None:
                if 0 <= level <= 100:
                    volume.SetMasterVolumeLevelScalar(level / 100.0, None)
                    return f"Volume set to {level}%"
                else:
                    return "Volume must be between 0 and 100."
            else:
                return f"Current volume is {int(current_level * 100)}%"

        except Exception as e:
            print(f"❌ Volume control error: {e}")
            return "I couldn't control the volume."


class BrightnessSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'brightness'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        level = entities.get('level')
        return self._control_brightness(level)

    def _control_brightness(self, level: int = None):
        """Control screen brightness."""
        if not HAS_BRIGHTNESS_CONTROL:
            return "Brightness control is not available on this system."
        
        try:
            if level is not None:
                if 0 <= level <= 100:
                    sbc.set_brightness(level)
                    return f"Brightness set to {level}%"
                else:
                    return "Brightness must be between 0 and 100."
            else:
                current_brightness = sbc.get_brightness()
                return f"Current brightness is {current_brightness}%"
        except Exception as e:
            print(f"❌ Brightness control error: {e}")
            return "I couldn't control the brightness."


class SystemInfoSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'system_info'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not HAS_PSUTIL: 
            return "System info is not available."
        try:
            info = {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent
            }
            return f"System status: CPU {info['cpu_percent']:.1f}%, Memory {info['memory_percent']:.1f}%"
        except Exception as e:
            print(f"❌ System info error: {e}")
            return "Could not get system info"

class ScreenshotSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'screenshot'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        if not HAS_PYAUTOGUI:
            return "Screenshot feature not available."
        try:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"screenshot_{timestamp}.png"
            pyautogui.screenshot(filename)
            return f"Screenshot saved as {filename}"
        except Exception as e:
            print(f"❌ Screenshot error: {e}")
            return "Could not take screenshot."

class ShutdownSkill(BaseSkill):
    def __init__(self, assistant):
        self.assistant = assistant

    def can_handle(self, intent: str, entities: dict) -> bool:
        return intent == 'shutdown'

    async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
        os.system("shutdown /s /t 5")
        return "Shutting down the system in 5 seconds."
