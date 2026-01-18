"""
Create a Desktop shortcut to run JARVIS with admin privileges
"""
import os
from pathlib import Path

# Paths
jarvis_dir = Path(r"f:\Jarvis")
desktop = Path.home() / "Desktop"
shortcut_path = desktop / "JARVIS.lnk"

# VBS script to create shortcut with admin privileges
vbs_script = f"""
Set objWSH = CreateObject("WScript.Shell")
Set objLink = objWSH.CreateShortcut("{shortcut_path}")

objLink.TargetPath = "cmd.exe"
objLink.Arguments = "/c cd /d {jarvis_dir} && .venv\\Scripts\\python.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"
objLink.WorkingDirectory = "{jarvis_dir}"
objLink.Description = "JARVIS - Advanced AI Voice Assistant"
objLink.IconLocation = "C:\\Windows\\System32\\cmd.exe,0"

' Set to run as admin (requires binary modification)
objLink.Save

' Now modify the shortcut file to include admin flag
Set objFile = objWSH.CreateObject("Scripting.FileSystemObject")
Dim bytes
Set stream = objWSH.CreateObject("ADODB.Stream")
stream.Type = 1
stream.Open
stream.LoadFromFile "{shortcut_path}"
bytes = stream.Read()
' Add admin flag (0x20 at offset 21)
If (bytes(21) AND &H20) = 0 Then
    bytes(21) = bytes(21) OR &H20
    stream.Position = 0
    stream.Write(bytes)
    stream.SaveToFile "{shortcut_path}", 2
End If
stream.Close
"""

# Save VBS script
vbs_path = jarvis_dir / "create_shortcut.vbs"
with open(vbs_path, 'w') as f:
    f.write(vbs_script)

# Execute VBS
os.system(f'cscript.exe "{vbs_path}"')
print(f"✅ Desktop shortcut created at: {shortcut_path}")
print("📌 Right-click the shortcut and select 'Properties'")
print("📌 Click 'Advanced' and check 'Run as administrator'")
