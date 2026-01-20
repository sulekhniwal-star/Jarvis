import customtkinter as ctk  # type: ignore
import threading
import time
from datetime import datetime


class JarvisHUD:
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
        """Start the pulsing animation in a separate thread."""
        def animate():
            progress = 0
            direction = 1
            while True:
                progress += direction * 0.02
                if progress >= 1 or progress <= 0:
                    direction *= -1
                self.circle.set(progress)
                time.sleep(0.05)
        
        animation_thread = threading.Thread(target=animate, daemon=True)
        animation_thread.start()
    
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