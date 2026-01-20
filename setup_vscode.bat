@echo off
echo Setting up Jarvis for VS Code...

REM Install Python dependencies
echo Installing requirements...
pip install -r requirements.txt

REM Create .vscode directory if it doesn't exist
if not exist .vscode mkdir .vscode

REM Move VS Code config files to .vscode directory
if exist launch.json move launch.json .vscode\
if exist tasks.json move tasks.json .vscode\
if exist settings.json move settings.json .vscode\

echo.
echo Setup complete! You can now:
echo 1. Open this folder in VS Code
echo 2. Press F5 to run Jarvis
echo 3. Use Ctrl+Shift+P and type "Tasks: Run Task" for other options
echo.
pause