# 🤖 JARVIS - Advanced AI Voice Assistant

An evolved version of JARVIS with AI-powered intent detection, long-term memory, and modern GUI.

## 🚀 What's New

### ✨ Step 1: AI-Powered Brain
- **Replaced** simple if-else logic with **Gemini AI intent detection**
- Supports both AI-based and keyword-based fallback detection
- Context-aware responses using conversation history

### 💾 Step 2: Long-Term Memory System
- Stores user preferences, habits, and contact information
- Remembers conversation history (last 50 conversations)
- Learns user preferences over time
- Expandable memory structure (JSON-based)

### 🎤 Step 3: Wake Word Detection
- Say **"Hey Jarvis"** to activate hands-free mode
- Background listening in separate thread
- Voice Activity Detection (VAD) for optimized listening

### 🖥️ Step 4: Modern GUI
- Built with **PyQt5** for professional appearance
- Real-time audio visualization
- Conversation history display

## Important Note on Python Version

You are currently using Python 3.14, which is a very new version. Some packages, like `PyAudio`, do not have stable releases for this version yet, which can cause installation and runtime issues.

**It is highly recommended to use a more stable and widely supported Python version, such as Python 3.12.**

You can download Python 3.12 from the official Python website: [https://www.python.org/downloads/release/python-3124/](https://www.python.org/downloads/release/python-3124/)

After installing Python 3.12, please create a new virtual environment for this project. When selecting the interpreter in VS Code (step 3), make sure to choose your Python 3.12 installation.

If you use Python 3.12, you can ignore the "Special instructions for PyAudio" (step 4) and just run `pip install -r requirements.txt`. The official version of `PyAudio` will be installed automatically.

### Alternative for Python 3.14

If you must stay on Python 3.14, you can use an alternative library to `PyAudio` called `sounddevice`. This project has been updated to use `sounddevice`. You will need to uninstall `PyAudio` and install `sounddevice` and `numpy`.

```bash
pip uninstall pyaudio
pip install sounddevice numpy
```

After doing this, you can proceed with the rest of the instructions.

## How to run this program in VS Code

1.  **Open the project in VS Code.**

2.  **Install the Python extension:**
    If you don't have it, go to the Extensions view (Ctrl+Shift+X) and search for "Python" and install the one by Microsoft.

3.  **Select the Python Interpreter:**
    -   Open the Command Palette (Ctrl+Shift+P).
    -   Type "Python: Select Interpreter".
    -   Select the interpreter from the `.venv` folder. It should be something like `./.venv/Scripts/python.exe`.

4.  **Install dependencies:**
    -   Open a new terminal in VS Code (Terminal > New Terminal).
    -   Your terminal should automatically use the virtual environment. You can see `(.venv)` at the beginning of the prompt.
    -   **Special instructions for PyAudio:**
        `PyAudio` can have installation issues on Windows. It's best to install it from a pre-compiled file (a "wheel").
        -   Download the `PyAudio` wheel for Python 3.14 (64-bit Windows) from this link: [https://sourceforge.net/projects/unofficial-windows-binaries/files/pyaudio/pyaudio-0.2.14-cp314-cp314-win_amd64.whl/download](https://sourceforge.net/projects/unofficial-windows-binaries/files/pyaudio/pyaudio-0.2.14-cp314-cp314-win_amd64.whl/download)
        -   After downloading, open your terminal, navigate to the folder where you saved the file (usually your `Downloads` folder), and run this command (replace the filename if it's different):
            ```bash
            pip install pyaudio-0.2.14-cp314-cp314-win_amd64.whl
            ```
    -   Once `PyAudio` is installed, install the rest of the dependencies from `requirements.txt`. `pip` will see that `PyAudio` is already installed and skip it.
        ```bash
        pip install -r requirements.txt
        ```

5.  **Run the program:**
    -   With the `jarvis.py` file open, you can either:
        -   Click the "Run Python File" button (the green triangle) in the top-right of the editor.
        -   Right-click in the editor and select "Run Python File in Terminal".
        -   Type the following command in the terminal:
            ```bash
            python jarvis.py
            ```
