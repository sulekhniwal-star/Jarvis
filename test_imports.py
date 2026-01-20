#!/usr/bin/env python3
"""Test script to verify all imports work correctly"""

def test_imports():
    """Test all the imports used in jarvis.py"""
    imports = [
        'asyncio',
        'datetime',
        'logging',
        'os',
        'platform',
        'subprocess',
        'tempfile',
        'io.BytesIO',
        'typing.Optional',
        'typing.Any',
        'typing.Dict',
    ]

    optional_imports = [
        ('edge_tts', 'edge_tts'),
        ('google.generativeai', 'genai'),
        ('pyautogui', 'pyautogui'),
        ('speech_recognition', 'sr'),
        ('duckduckgo_search.DDGS', 'DDGS'),
        ('dotenv.load_dotenv', 'load_dotenv'),
        ('PIL.Image', 'Image'),
        ('cv2', 'cv2'),
        ('vosk', 'vosk'),
        ('psutil', 'psutil'),
    ]

    print("Testing standard library imports...")
    for imp in imports:
        try:
            __import__(imp)
            print(f"✓ {imp}")
        except ImportError as e:
            print(f"✗ {imp}: {e}")

    print("\nTesting optional imports...")
    for imp, name in optional_imports:
        try:
            module = __import__(imp, fromlist=[name.split('.')[-1]])
            print(f"✓ {imp}")
        except ImportError as e:
            print(f"✗ {imp}: {e}")

    print("\nTesting google.generativeai specifically...")
    try:
        import google.generativeai as genai
        print("✓ google.generativeai imported successfully")
        print(f"  Version: {genai.__version__ if hasattr(genai, '__version__') else 'unknown'}")
    except ImportError as e:
        print(f"✗ google.generativeai: {e}")

if __name__ == "__main__":
    test_imports()
