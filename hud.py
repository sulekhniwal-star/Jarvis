"""JARVIS HUD interface components for the AI assistant."""
import threading
import tkinter as tk
from datetime import datetime

import customtkinter as ctk  # type: ignore


class JarvisOverlay:  # pylint: disable=too-many-instance-attributes
    """Overlay window for JARVIS assistant interface."""
    def __init__(self, assistant_callback=None):
        self.assistant_callback = assistant_callback
        self.is_enabled = True
        self.is_listening = False
        self.is_sleeping = False

        # Create overlay window
        self.root = tk.Toplevel()
        self.root.title("JARVIS Assistant")
        self.root.geometry("350x500")
        self.root.configure(bg='#0a0a0a')

        # Position at bottom right corner
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = screen_width - 370
        y = screen_height - 550
        self.root.geometry(f"350x500+{x}+{y}")

        # Make window always on top and semi-transparent
        self.root.attributes('-topmost', True)
        self.root.attributes('-alpha', 0.9)

        self._setup_ui()
        self._start_status_animation()

    def _setup_ui(self):
        # Header with status
        header_frame = tk.Frame(self.root, bg='#0a0a0a')
        header_frame.pack(fill='x', padx=10, pady=5)

        self.status_label = tk.Label(
            header_frame,
            text="🤖 JARVIS - Ready",
            font=("Arial", 12, "bold"),
            fg="#00ffff",
            bg="#0a0a0a"
        )
        self.status_label.pack(side='left')

        # Control buttons
        btn_frame = tk.Frame(header_frame, bg='#0a0a0a')
        btn_frame.pack(side='right')

        self.enable_btn = tk.Button(
            btn_frame,
            text="●",
            font=("Arial", 8),
            fg="#00ff00",
            bg="#1a1a1a",
            command=self.toggle_enable,
            width=3
        )
        self.enable_btn.pack(side='left', padx=2)

        self.sleep_btn = tk.Button(
            btn_frame,
            text="💤",
            font=("Arial", 8),
            bg="#1a1a1a",
            command=self.toggle_sleep,
            width=3
        )
        self.sleep_btn.pack(side='left', padx=2)

        # Chat area
        chat_frame = tk.Frame(self.root, bg='#0a0a0a')
        chat_frame.pack(fill='both', expand=True, padx=10, pady=5)

        self.chat_display = tk.Text(
            chat_frame,
            font=("Consolas", 9),
            fg="#00ffff",
            bg="#0f0f0f",
            insertbackground="#00ffff",
            wrap='word',
            state='disabled'
        )
        self.chat_display.pack(fill='both', expand=True)

        # Input area
        input_frame = tk.Frame(self.root, bg='#0a0a0a')
        input_frame.pack(fill='x', padx=10, pady=5)

        self.input_entry = tk.Entry(
            input_frame,
            font=("Arial", 10),
            fg="#00ffff",
            bg="#1a1a1a",
            insertbackground="#00ffff"
        )
        self.input_entry.pack(fill='x', pady=2)
        self.input_entry.bind('<Return>', self.send_message)

        # Wake word indicator
        self.wake_indicator = tk.Label(
            self.root,
            text="Say 'Jarvis' to wake up",
            font=("Arial", 8),
            fg="#666666",
            bg="#0a0a0a"
        )
        self.wake_indicator.pack(pady=2)

    def _start_status_animation(self):
        self.colors = ['#00ffff', '#0088ff', '#0066cc', '#0088ff']
        self.color_index = 0
        self._animate_status()

    def _animate_status(self):
        if self.is_listening:
            color = self.colors[self.color_index % len(self.colors)]
            self.status_label.configure(fg=color)
            self.color_index += 1
        self.root.after(500, self._animate_status)

    def toggle_enable(self):
        """Toggle enable/disable state of the assistant."""
        self.is_enabled = not self.is_enabled
        if self.is_enabled:
            self.enable_btn.configure(fg="#00ff00")
            self.status_label.configure(text="🤖 JARVIS - Ready")
            self.add_system_message("JARVIS enabled")
        else:
            self.enable_btn.configure(fg="#ff0000")
            self.status_label.configure(text="🤖 JARVIS - Disabled")
            self.add_system_message("JARVIS disabled")

    def toggle_sleep(self):
        """Toggle sleep mode for the assistant."""
        if not self.is_enabled:
            return

        self.is_sleeping = not self.is_sleeping
        if self.is_sleeping:
            self.sleep_btn.configure(fg="#ffaa00")
            self.status_label.configure(text="🤖 JARVIS - Sleeping")
            self.add_system_message("JARVIS is sleeping. Say 'Jarvis' to wake up.")
        else:
            self.sleep_btn.configure(fg="#666666")
            self.status_label.configure(text="🤖 JARVIS - Ready")
            self.add_system_message("JARVIS is awake")

    def send_message(self, _event=None):
        """Send user message to assistant."""
        if not self.is_enabled or self.is_sleeping:
            return

        message = self.input_entry.get().strip()
        if not message:
            return

        self.input_entry.delete(0, 'end')
        self.add_message("You", message)

        if self.assistant_callback:
            threading.Thread(target=self._process_command, args=(message,), daemon=True).start()

    def _process_command(self, command):
        self.set_listening(True)
        if self.assistant_callback:
            try:
                response = self.assistant_callback(command)
                self.add_message("JARVIS", response)
            except (ValueError, TypeError, AttributeError, RuntimeError) as e:
                self.add_message("JARVIS", f"Error: {str(e)}")
        else:
            self.add_message("JARVIS", "No assistant callback configured")
        self.set_listening(False)

    def set_listening(self, listening):
        """Set the listening state and update UI accordingly."""
        self.is_listening = listening
        if listening:
            self.root.after(0, lambda: self.status_label.configure(text="🤖 JARVIS - Listening..."))
        else:
            self.root.after(0, lambda: self.status_label.configure(text="🤖 JARVIS - Ready"))

    def add_message(self, sender, message):
        """Add a message to the chat display."""
        timestamp = datetime.now().strftime("%H:%M")
        formatted_msg = f"[{timestamp}] {sender}: {message}\n"

        def update_chat():
            self.chat_display.configure(state='normal')
            self.chat_display.insert('end', formatted_msg)
            self.chat_display.configure(state='disabled')
            self.chat_display.see('end')

        self.root.after(0, update_chat)

    def add_system_message(self, message):
        """Add a system message to the chat display."""
        timestamp = datetime.now().strftime("%H:%M")
        formatted_msg = f"[{timestamp}] System: {message}\n"

        def update_chat():
            self.chat_display.configure(state='normal')
            self.chat_display.insert('end', formatted_msg)
            self.chat_display.configure(state='disabled')
            self.chat_display.see('end')

        self.root.after(0, update_chat)

    def wake_up(self):
        """Wake up the assistant from sleep mode."""
        if self.is_sleeping:
            self.is_sleeping = False
            self.sleep_btn.configure(fg="#666666")
            self.status_label.configure(text="🤖 JARVIS - Ready")
            self.add_system_message("JARVIS woke up")
            return True
        return False

    def start(self):
        """Start the overlay main loop."""
        self.root.mainloop()


class JarvisHUD:  # pylint: disable=too-many-instance-attributes
    """Main HUD interface for JARVIS assistant."""
    def __init__(self):
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.root = ctk.CTk()
        self.root.title("JARVIS HUD")
        self.root.geometry("800x600")
        self.root.configure(fg_color="#0a0a0a")

        self._setup_ui()
        self._start_animation()

    def _setup_ui(self):
        # Status label
        self.status_label = ctk.CTkLabel(
            self.root,
            text="Initializing...",
            font=("Arial", 24, "bold"),
            text_color="#00ffff"
        )
        self.status_label.pack(pady=20)

        # Animated circle frame
        self.circle_frame = ctk.CTkFrame(self.root, fg_color="transparent")
        self.circle_frame.pack(pady=10)

        self.circle = ctk.CTkProgressBar(
            self.circle_frame,
            width=100,
            height=100,
            progress_color="#00ffff",
            fg_color="#1a1a1a"
        )
        self.circle.pack()

        # Conversation log
        self.log_frame = ctk.CTkFrame(self.root)
        self.log_frame.pack(fill="both", expand=True, padx=20, pady=20)

        self.conversation_log = ctk.CTkTextbox(
            self.log_frame,
            font=("Courier", 12),
            text_color="#00ffff",
            fg_color="#0f0f0f"
        )
        self.conversation_log.pack(fill="both", expand=True, padx=10, pady=10)

    def _start_animation(self):
        """Start the pulsing animation."""
        self.progress = 0
        self.direction = 1
        self._animate_circle()

    def _animate_circle(self):
        """Animate the progress circle with pulsing effect."""
        self.progress += self.direction * 0.02
        if self.progress >= 1 or self.progress <= 0:
            self.direction *= -1
        self.circle.set(self.progress)
        self.root.after(50, self._animate_circle)

    def update_status(self, text: str):
        """Update the status label."""
        self.root.after(0, lambda: self.status_label.configure(text=text))

    def add_message(self, sender: str, message: str):
        """Add a message to the conversation log."""
        timestamp = datetime.now().strftime("%H:%M:%S")
        formatted_message = f"[{timestamp}] {sender}: {message}\n"

        def update_log():
            self.conversation_log.insert("end", formatted_message)
            self.conversation_log.see("end")

        self.root.after(0, update_log)

    def start(self):
        """Start the HUD in a separate thread."""
        def run_gui():
            self.root.mainloop()

        gui_thread = threading.Thread(target=run_gui, daemon=True)
        gui_thread.start()

    def destroy(self):
        """Close the HUD."""
        self.root.after(0, self.root.destroy)
