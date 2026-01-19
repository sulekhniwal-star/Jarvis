"""
JARVIS - Advanced AI Voice Assistant
=====================================

Features:
- AI-powered intent detection using Gemini
- Advanced context-aware memory system
- Modular, skill-based architecture
- Wake word detection ("Hey Jarvis")
- Modern PyQt5 GUI with audio visualization
- Conversation history and learning
- Multi-threaded architecture for smooth operation
"""

import asyncio
import importlib
import inspect
import os
import sys
import threading
from typing import Any, List

import sounddevice as sd
import speech_recognition as sr

# Enhanced speech recognition
try:
    import whisper
    has_whisper = True
except ImportError:
    has_whisper = False
    print("⚠️ Whisper not available - using Google Speech only")

# Import custom modules
from intent_detector import IntentDetector
from enhanced_memory import EnhancedJarvisMemory
from skills.base_skill import BaseSkill
from wake_word import WakeWordDetector
from tts import TTSManager, VoiceMode
from gui_emitter import emitter


class SkillManager:
    """Dynamically loads and manages skills."""

    def __init__(self, assistant: "JarvisAssistant"):
        self.assistant = assistant
        self.skills: List[BaseSkill] = []
        self._load_skills()

    def _load_skills(self):
        """Loads all skills from the 'skills' directory."""
        skills_dir = os.path.join(os.path.dirname(__file__), "skills")
        for filename in os.listdir(skills_dir):
            if filename.endswith(".py") and not filename.startswith("__"):
                module_name = f"skills.{filename[:-3]}"
                try:
                    module = importlib.import_module(module_name)
                    for name, cls in inspect.getmembers(module, inspect.isclass):
                        if issubclass(cls, BaseSkill) and cls is not BaseSkill:
                            self.skills.append(cls(self.assistant))
                            print(f"✅ Skill '{name}' loaded successfully.")
                except Exception as e:
                    print(f"❌ Error loading skill {module_name}: {e}")

    async def handle_intent(self, intent: str, entities: dict[str, Any], user_input: str):
        """
        Find the appropriate skill to handle the intent and execute it.
        """
        for skill in self.skills:
            if skill.can_handle(intent, entities):
                try:
                    response = await skill.handle(intent, entities, self.assistant)
                    if response:
                        await self.assistant.speak_async(response)
                    self.assistant.memory.add_conversation(user_input, response or "", intent)
                    return
                except Exception as e:
                    print(f"❌ Error handling intent '{intent}' with skill '{skill.__class__.__name__}': {e}")
                    await self.assistant.speak_async("I'm sorry, something went wrong while handling your request.")
                    return
        
        # If no skill can handle the intent, use the AI response
        context = self.assistant.memory.get_context_summary()
        response = self.assistant.intent_detector.get_ai_response(user_input, context)
        await self.assistant.speak_async(response)


class JarvisAssistant:
    """Main JARVIS Assistant class."""

    def __init__(self, api_key: str, use_gui: bool = False):
        self.api_key = api_key
        self.use_gui = use_gui

        # Initialize core systems
        self.memory = EnhancedJarvisMemory()
        self.intent_detector = IntentDetector(api_key)
        self.skill_manager = SkillManager(self)
        self.wake_word_detector = WakeWordDetector(on_wake_callback=self.on_wake_word)
        self.tts_manager = TTSManager()

        self.recognizer = sr.Recognizer()

        # State
        self.is_running = True
        self.awaiting_command = False
        self.command_lock = asyncio.Lock()

        # Emitter for GUI communication
        self.emitter = emitter

        print("✅ JARVIS Initialized Successfully!")
        print(f"📝 User: {self.memory.get_preference('owner', 'Guest')}")
        print(f"📍 Location: {self.memory.get_preference('city', 'Unknown')}")

    async def speak_async(self, text: str, mode: VoiceMode = "normal"):
        """Asynchronously convert text to speech and emit a signal."""
        if self.use_gui:
            self.emitter.response_received.emit(text)
        await self.tts_manager.speak_async(text, mode)

    def listen(self, timeout: int = 5) -> str:
        """Listen for voice input with fallback to text."""
        result = self._listen_with_whisper(timeout)
        if result:
            return result

        if self.use_gui:
            self.emitter.status_changed.emit("🎤 Microphone unavailable. Use text input in the console.")
        else:
            print(f"\n⚠️ Microphone unavailable or Whisper failed - using TEXT INPUT mode")
        try:
            user_input = input("\n💬 Type your command: ").strip()
            if user_input:
                print(f"👤 You: {user_input}")
                return user_input.lower()
        except Exception as input_error:
            print(f"❌ Input error: {input_error}")
        return ""

    def _listen_with_whisper(self, timeout: int = 5) -> str:
        """Enhanced audio capture with Whisper."""
        if not has_whisper:
            return ""
        try:
            if self.use_gui:
                self.emitter.status_changed.emit("🎤 Listening...")
            else:
                print("🎤 Listening (enhanced)...")
            sample_rate = 16000
            audio_data = sd.rec(int(sample_rate * timeout), samplerate=sample_rate, channels=1, dtype='float32')
            sd.wait()
            if self.use_gui:
                self.emitter.status_changed.emit("🔄 Processing...")
            else:
                print("🔄 Processing...")

            model = whisper.load_model("base")
            result = model.transcribe(audio_data.flatten())
            text = result["text"].strip()
            if text:
                print(f"👤 You (Whisper): {text}")
                return text.lower()
            return ""
        except Exception as e:
            print(f"⚠️ Whisper error: {e}")
            return ""

    async def _process_command_async(self, command: str):
        """Asynchronously process a command."""
        async with self.command_lock:
            try:
                if self.use_gui:
                    self.emitter.status_changed.emit("🧠 Processing...")
                intent, confidence, metadata = self.intent_detector.detect_intent(command)
                print(f"🧠 Intent: {intent} (Confidence: {confidence:.2f})")
                await self.skill_manager.handle_intent(intent, metadata, command)
            except Exception as e:
                print(f"❌ Error processing command: {e}")
                await self.speak_async("I'm sorry, I had trouble understanding that.")
            finally:
                self.awaiting_command = False
                if self.use_gui:
                    self.emitter.listening_stopped.emit()
                    self.emitter.status_changed.emit("👂 Listening for wake word...")
    
    def on_wake_word(self):
        """Callback when wake word is detected."""
        if not self.awaiting_command:
            self.awaiting_command = True
            if self.use_gui:
                self.emitter.listening_started.emit()
                self.emitter.status_changed.emit("👂 Wake word detected! Listening for command...")
            else:
                print("👂 Wake word detected! Listening for command...")
            
            loop = asyncio.get_running_loop()
            asyncio.run_coroutine_threadsafe(self.speak_async("Yes, sir?"), loop)
            
            command_thread = threading.Thread(target=self._listen_for_command_thread)
            command_thread.start()

    def _listen_for_command_thread(self):
        """Listens for a command and processes it."""
        command = self.listen(timeout=5)
        loop = asyncio.get_running_loop()

        if command:
            asyncio.run_coroutine_threadsafe(self._process_command_async(command), loop)
        else:
            self.awaiting_command = False
            asyncio.run_coroutine_threadsafe(self.speak_async("I'm sorry, I didn't catch that."), loop)
            if self.use_gui:
                self.emitter.listening_stopped.emit()
                self.emitter.status_changed.emit("👂 Listening for wake word...")

    async def main_loop(self):
        """The main async loop for terminal mode."""
        await self.speak_async(f"Hello! I'm JARVIS, ready to assist {self.memory.get_preference('owner', 'you')}.")
        
        wake_word_thread = threading.Thread(target=self.wake_word_detector.start, daemon=True)
        wake_word_thread.start()

        if self.use_gui:
            self.emitter.status_changed.emit("👂 Listening for wake word...")
        else:
            print("👂 Listening for wake word 'Hey Jarvis'...")

        while self.is_running:
            await asyncio.sleep(1)

    def run_terminal_mode(self):
        """Run JARVIS in terminal mode."""
        loop = asyncio.get_event_loop()
        try:
            loop.create_task(self.main_loop())
            loop.run_forever()
        except KeyboardInterrupt:
            print("\n👋 Shutting down...")
        finally:
            self.is_running = False
            self.wake_word_detector.stop()
            tasks = asyncio.all_tasks(loop=loop)
            for task in tasks:
                task.cancel()
            group = asyncio.gather(*tasks, return_exceptions=True)
            loop.run_until_complete(group)
            loop.close()

    def run_gui_mode(self):
        """Run JARVIS with the PyQt5 GUI."""
        try:
            from PyQt5.QtWidgets import QApplication
            from ui import JarvisGUI
            
            app = QApplication(sys.argv)
            gui = JarvisGUI(jarvis_assistant=self)
            gui.show()

            # Start the main loop in a separate thread
            main_loop_thread = threading.Thread(target=self.run_terminal_mode, daemon=True)
            main_loop_thread.start()
            
            sys.exit(app.exec_())
            
        except ImportError as e:
            print(f"❌ GUI Error: {e}. Make sure PyQt5 is installed.")
            print("Falling back to terminal mode.")
            self.run_terminal_mode()
        except Exception as e:
            print(f"❌ An unexpected error occurred in GUI mode: {e}")
            self.run_terminal_mode()

    def run(self, use_gui: bool = False):
        """Start JARVIS."""
        print("\n" + "="*60)
        print("🤖 JARVIS - Refactored AI Voice Assistant")
        print("="*60)
        
        self.use_gui = use_gui
        if self.use_gui:
            self.emitter.is_running_changed.emit(True)
            self.run_gui_mode()
        else:
            self.run_terminal_mode()
        
        if self.use_gui:
            self.emitter.is_running_changed.emit(False)


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='JARVIS - Advanced AI Voice Assistant')
    parser.add_argument('--api-key', type=str, default="YOUR_GEMINI_API_KEY",
                        help='Gemini API Key')
    parser.add_gument('--gui', action='store_true', help='Use GUI mode')
    
    args = parser.parse_args()
    
    jarvis = JarvisAssistant(api_key=args.api_key)
    jarvis.run(use_gui=args.gui)


if __name__ == '__main__':
    main()
