"""
Windows Registry Helper - Add JARVIS to Context Menu
This allows you to right-click and 'Run JARVIS' from any folder
"""
import winreg
import os
import sys

def add_context_menu():
    """Add JARVIS to Windows context menu."""
    try:
        # Path to JARVIS
        jarvis_path = r"F:\Jarvis"
        venv_python = os.path.join(jarvis_path, ".venv", "Scripts", "pythonw.exe")
        jarvis_script = os.path.join(jarvis_path, "jarvis.py")
        api_key = "AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"
        
        # Create registry key
        key = winreg.CreateKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Classes\Directory\shell\JARVIS"
        )
        
        # Set default value (menu text)
        winreg.SetValueEx(key, "", 0, winreg.REG_SZ, "🤖 Run JARVIS here")
        
        # Set icon
        icon_path = r"C:\Windows\System32\cmd.exe"
        winreg.SetValueEx(key, "Icon", 0, winreg.REG_SZ, icon_path)
        
        # Create command subkey
        cmd_key = winreg.CreateKey(key, "command")
        
        # Set command with admin privileges
        command = f'powershell -Command "Start-Process \'{venv_python}\' -ArgumentList \'{jarvis_script} --api-key {api_key}\' -Verb RunAs"'
        winreg.SetValueEx(cmd_key, "", 0, winreg.REG_SZ, command)
        
        print("✅ Context menu integration added!")
        print("🎯 Right-click any folder and select '🤖 Run JARVIS here'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print("⚠️  You may need admin privileges to add registry entries")
        sys.exit(1)

if __name__ == "__main__":
    add_context_menu()
