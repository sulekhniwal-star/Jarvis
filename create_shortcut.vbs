
Set objWSH = CreateObject("WScript.Shell")
Set objLink = objWSH.CreateShortcut("C:\Users\sulek\Desktop\JARVIS.lnk")

objLink.TargetPath = "cmd.exe"
objLink.Arguments = "/c cd /d f:\Jarvis && .venv\Scripts\python.exe jarvis.py --api-key AIzaSyAA4-3HG_AGQzY9ad8mH1-fkWFXpDTa940"
objLink.WorkingDirectory = "f:\Jarvis"
objLink.Description = "JARVIS - Advanced AI Voice Assistant"
objLink.IconLocation = "C:\Windows\System32\cmd.exe,0"

' Set to run as admin (requires binary modification)
objLink.Save

' Now modify the shortcut file to include admin flag
Set objFile = objWSH.CreateObject("Scripting.FileSystemObject")
Dim bytes
Set stream = objWSH.CreateObject("ADODB.Stream")
stream.Type = 1
stream.Open
stream.LoadFromFile "C:\Users\sulek\Desktop\JARVIS.lnk"
bytes = stream.Read()
' Add admin flag (0x20 at offset 21)
If (bytes(21) AND &H20) = 0 Then
    bytes(21) = bytes(21) OR &H20
    stream.Position = 0
    stream.Write(bytes)
    stream.SaveToFile "C:\Users\sulek\Desktop\JARVIS.lnk", 2
End If
stream.Close
