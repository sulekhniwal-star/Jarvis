import asyncio
from typing import Optional, Any

from config import tk, scrolledtext

class JarvisGUI:
    """Simple GUI dashboard for Jarvis"""

    def __init__(self, agent: Any):  # type: ignore
        self.agent = agent
        self.root = tk.Tk()  # type: ignore
        self.root.title("Jarvis AI Assistant")
        self.root.geometry("600x400")

        # Create widgets
        self.create_widgets()

    def create_widgets(self):
        # Title
        title_label = tk.Label(self.root, text="🤖 Jarvis AI Assistant", font=("Arial", 16))  # type: ignore
        title_label.pack(pady=10)

        # Command entry
        self.command_entry = tk.Entry(self.root, width=50, font=("Arial", 12))  # type: ignore
        self.command_entry.pack(pady=10)
        self.command_entry.bind("<Return>", self.send_command)

        # Send button
        send_button = tk.Button(self.root, text="Send Command", command=self.send_command)  # type: ignore
        send_button.pack(pady=5)

        # Response area
        self.response_area = scrolledtext.ScrolledText(self.root, wrap=tk.WORD, width=60, height=15)  # type: ignore
        self.response_area.pack(pady=10)
        self.response_area.config(state=tk.DISABLED)  # type: ignore

        # Status label
        self.status_label = tk.Label(self.root, text="Ready", fg="green")  # type: ignore
        self.status_label.pack(pady=5)

    def send_command(self, event: Optional[Any] = None) -> None:
        command = self.command_entry.get().strip()
        if command:
            self.command_entry.delete(0, tk.END)  # type: ignore
            self.status_label.config(text="Processing...", fg="orange")
            self.root.update()

            # Process command asynchronously
            asyncio.create_task(self.process_command_async(command))

    async def process_command_async(self, command: str):
        try:
            response = await self.agent.process_with_gemini(command)  # type: ignore
            self.display_response(f"You: {command}\nJarvis: {response}")
        except Exception as e:
            self.display_response(f"Error: {str(e)}")
        finally:
            self.status_label.config(text="Ready", fg="green")

    def display_response(self, text: str):
        self.response_area.config(state=tk.NORMAL)  # type: ignore
        self.response_area.insert(tk.END, text + "\n\n")  # type: ignore
        self.response_area.config(state=tk.DISABLED)  # type: ignore
        self.response_area.see(tk.END)  # type: ignore

    def run(self):
        self.root.mainloop()
