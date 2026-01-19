# JARVIS - Your Personal AI Assistant

![JARVIS GUI](https://i.imgur.com/your-gui-screenshot.png) <!-- Replace with a real screenshot -->

JARVIS is a sophisticated, voice-controlled personal assistant built with Python. It leverages advanced AI capabilities for intent detection, has a modular skill-based architecture, and features a modern, intuitive graphical user interface.

## 🚀 Features

- **AI-Powered Intent Detection**: Utilizes the Gemini API for natural language understanding, allowing JARVIS to understand complex commands.
- **Modular Skill-Based Architecture**: Easily extend JARVIS's abilities by adding new skills. Each skill is a self-contained module, making the system clean and scalable.
- **Continuous Wake Word Detection**: Activate JARVIS hands-free by saying "Hey Jarvis".
- **Advanced Speech & Text-to-Speech**:
    - High-accuracy speech recognition using Whisper.
    - High-quality, natural-sounding voice responses using Microsoft Edge's TTS engine.
- **Context-Aware Memory**: JARVIS remembers your preferences and conversation history for a personalized experience.
- **Modern GUI**: A sleek and responsive graphical interface built with PyQt5, featuring audio visualization and real-time status updates.
- **Cross-Platform**: Runs on Windows, with potential for macOS and Linux support.

## 🛠️ Setup & Installation

Follow these steps to get JARVIS up and running on your system.

### 1. Prerequisites

- Python 3.10+
- A working microphone
- Git

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/jarvis.git
cd jarvis
```

### 3. Set Up a Virtual Environment

It's highly recommended to use a virtual environment to manage dependencies.

```bash
# For Windows
python -m venv .venv
.venv\Scripts\activate

# For macOS/Linux
python3 -m venv .venv
source .venv/bin/activate
```

### 4. Install Dependencies

Install all the required Python packages using the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

### 5. Configure the API Key

JARVIS uses the Google Gemini API for intent detection. You'll need to get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

Once you have your key, you can either pass it as a command-line argument or set it as an environment variable.

## ▶️ Running JARVIS

You can run JARVIS in two modes: terminal mode or with the graphical user interface (GUI).

### GUI Mode (Recommended)

To run JARVIS with the full visual experience, use the `--gui` flag.

```bash
python jarvis.py --api-key YOUR_GEMINI_API_KEY --gui
```

### Terminal Mode

For a lightweight, console-only experience:

```bash
python jarvis.py --api-key YOUR_GEMINI_API_KEY
```

## 🧠 Architecture & Extending Skills

The power of this refactored JARVIS lies in its modular architecture. All of its abilities, or "skills," are located in the `skills/` directory.

### How it Works

1.  **`jarvis.py`**: The core application orchestrator. It manages the assistant's main loop, wake word detection, and communication between components.
2.  **`SkillManager`**: This class, inside `jarvis.py`, is responsible for discovering and loading all available skills from the `skills/` directory.
3.  **`intent_detector.py`**: When you speak, this module sends your command to the Gemini AI to determine your *intent* (e.g., `weather`, `time`, `joke`).
4.  **Skill Dispatch**: The `SkillManager` receives the intent and finds the appropriate skill that can handle it.
5.  **Execution**: The chosen skill's `handle` method is executed, performing the desired action (e.g., fetching the weather, telling a joke).

### 📝 Creating a New Skill

Adding a new ability to JARVIS is simple:

1.  **Create a New File**: Create a new Python file in the `skills/` directory (e.g., `my_new_skill.py`).

2.  **Define the Skill Class**: Inside the file, create a class that inherits from `BaseSkill`.

    ```python
    from .base_skill import BaseSkill

    class MyNewSkill(BaseSkill):
        def __init__(self, assistant):
            self.assistant = assistant

        # This method tells the SkillManager if this skill can handle the detected intent.
        def can_handle(self, intent: str, entities: dict) -> bool:
            return intent == 'my_new_intent'

        # This method contains the logic for the skill.
        async def handle(self, intent: str, entities: dict, assistant: "JarvisAssistant") -> str:
            # Your skill's logic goes here
            name = entities.get('name', 'World')
            response = f"Hello, {name}! This is my new skill."
            
            # The string returned will be spoken by JARVIS.
            return response
    ```

3.  **Update Intent Detector**: You may need to add examples of your new command to the `intent_detector.py`'s prompt so the AI can learn to recognize it.

4.  **Import the Skill**: In `skills/__init__.py`, import your new skill class and add it to the `__all__` list.

    ```python
    # skills/__init__.py
    from .my_new_skill import MyNewSkill

    __all__ = [
        # ... other skills
        "MyNewSkill"
    ]
    ```

5.  **Run JARVIS**: That's it! JARVIS will automatically load and use your new skill.

## 🤝 Contributing

Contributions are welcome! If you have ideas for new skills, improvements, or bug fixes, feel free to open an issue or submit a pull request.
