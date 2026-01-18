"""
JARVIS Admin Launcher
Runs JARVIS with administrative privileges
"""
import ctypes
import os
import sys
import subprocess

def is_admin():
    """Check if running with admin privileges."""
    try:
        return ctypes.windll.shell.IsUserAnAdmin()
    except:
        return False

def run_as_admin():
    """Re-run the script with admin privileges."""
    if not is_admin():
        print("🔐 Requesting administrative privileges...")
        # Re-run this script with admin privileges
        ctypes.windll.shell.ShellExecuteEx(
            lpVerb='runas',
            lpFile=sys.executable,
            lpParameters=f'"{__file__}"',
            lpDirectory=os.getcwd()
        )
        sys.exit()

def main():
    """Run JARVIS."""
    api_key = "AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"
    venv_python = os.path.join(os.path.dirname(__file__), '.venv', 'Scripts', 'python.exe')
    jarvis_script = os.path.join(os.path.dirname(__file__), 'jarvis.py')
    
    print("\n" + "="*50)
    print("🤖 JARVIS - Admin Mode Activated")
    print("="*50 + "\n")
    
    # Run JARVIS
    subprocess.run([venv_python, jarvis_script, '--api-key', api_key])

if __name__ == "__main__":
    run_as_admin()
    main()
