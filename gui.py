import sys
import threading
from typing import Optional, Any
from PyQt5.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, 
                             QLabel, QPushButton, QWidget, QTextEdit)
from PyQt5.QtCore import Qt, QTimer, pyqtSignal
from PyQt5.QtGui import QFont, QColor, QPainter, QPaintEvent
from PyQt5.QtWidgets import QProgressBar
from PyQt5.QtGui import QCloseEvent
import math


class AudioVisualizer(QWidget):
    """Custom widget for audio wave visualization."""
    
    def __init__(self, parent: Optional[QWidget] = None):
        super().__init__(parent)
        self.audio_data = []
        self.setMinimumHeight(100)
        self.setStyleSheet("background-color: #0a0e27;")
    
    def update_audio_data(self, data: list[int | float]):
        """Update audio visualization data."""
        self.audio_data = data[-100:]  # Keep last 100 samples
        self.update()
    
    def paintEvent(self, a0: Optional[QPaintEvent]):
        """Paint audio waveform."""
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        
        width = self.width()
        height = self.height()
        center_y = height // 2
        
        # Draw center line
        painter.setPen(QColor(0, 255, 100))
        painter.drawLine(0, center_y, width, center_y)
        
        # Draw waveform
        if self.audio_data:
            pen = QColor(0, 200, 255)
            painter.setPen(pen)
            
            x_step = width / len(self.audio_data)
            for i, value in enumerate(self.audio_data):
                x = int(i * x_step)
                # Normalize value to 0-1
                normalized = min(abs(value) / 32768, 1.0)
                y = center_y - int(normalized * center_y * 0.8)
                
                if i > 0:
                    prev_x = int((i-1) * x_step)
                    painter.drawLine(prev_x, self.prev_y, x, y)
                
                self.prev_y = y


class JarvisGUI(QMainWindow):
    """Modern JARVIS GUI with circular design and audio visualization."""
    
    # Signals for thread-safe communication
    status_changed = pyqtSignal(str)
    response_received = pyqtSignal(str)
    listening_started = pyqtSignal()
    listening_stopped = pyqtSignal()
    
    def __init__(self, jarvis_core: Optional["JarvisCore"]):
        super().__init__()
        self.jarvis_core = jarvis_core
        self.is_listening = False
        self.is_speaking = False
        
        self.init_ui()
        self.setup_signals()
        self.setup_timers()
    
    def init_ui(self):
        """Initialize the user interface."""
        self.setWindowTitle("🤖 JARVIS - Advanced AI Assistant")
        self.setGeometry(100, 100, 1000, 700)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #0a0e27;
            }
            QLabel {
                color: #00d9ff;
                font-weight: bold;
            }
            QPushButton {
                background-color: #0066cc;
                color: white;
                border: none;
                border-radius: 5px;
                padding: 10px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #0099ff;
            }
            QPushButton:pressed {
                background-color: #003399;
            }
            QTextEdit {
                background-color: #1a1f3a;
                color: #00d9ff;
                border: 2px solid #0066cc;
                border-radius: 5px;
                font-family: Courier;
            }
            QComboBox {
                background-color: #1a1f3a;
                color: #00d9ff;
                border: 2px solid #0066cc;
                border-radius: 5px;
            }
        """)
        
        # Central widget
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)
        
        # Title
        title = QLabel("🤖 JARVIS - Advanced AI Assistant")
        title.setFont(QFont('Arial', 24, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(title)
        
        # Status indicator
        self.status_label = QLabel("🔴 Offline")
        self.status_label.setFont(QFont('Arial', 14))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(self.status_label)
        
        # Audio visualizer
        self.visualizer = AudioVisualizer()
        main_layout.addWidget(self.visualizer)
        
        # Listening progress
        self.listen_progress = QProgressBar()
        self.listen_progress.setStyleSheet("""
            QProgressBar {
                background-color: #1a1f3a;
                border: 2px solid #0066cc;
                border-radius: 5px;
                text-align: center;
            }
            QProgressBar::chunk {
                background-color: #00ff00;
            }
        """)
        self.listen_progress.setVisible(False)
        main_layout.addWidget(self.listen_progress)
        
        # Response display
        response_label = QLabel("Response:")
        response_label.setFont(QFont('Arial', 12, QFont.Weight.Bold))
        main_layout.addWidget(response_label)
        
        self.response_text = QTextEdit()
        self.response_text.setReadOnly(True)
        self.response_text.setMinimumHeight(150)
        main_layout.addWidget(self.response_text)
        
        # Control buttons
        button_layout = QHBoxLayout()
        
        self.listen_btn = QPushButton("🎤 Start Listening")
        self.listen_btn.setFixedHeight(50)
        self.listen_btn.clicked.connect(self.toggle_listening)
        button_layout.addWidget(self.listen_btn)
        
        self.speak_btn = QPushButton("🔊 Speak")
        self.speak_btn.setFixedHeight(50)
        self.speak_btn.clicked.connect(self.on_speak)
        button_layout.addWidget(self.speak_btn)
        
        self.exit_btn = QPushButton("❌ Exit")
        self.exit_btn.setFixedHeight(50)
        self.exit_btn.clicked.connect(self.closeEvent)
        button_layout.addWidget(self.exit_btn)
        
        main_layout.addLayout(button_layout)
        
        # Conversation history
        history_label = QLabel("Conversation History:")
        history_label.setFont(QFont('Arial', 12, QFont.Weight.Bold))
        main_layout.addWidget(history_label)
        
        self.history_text = QTextEdit()
        self.history_text.setReadOnly(True)
        self.history_text.setMinimumHeight(150)
        main_layout.addWidget(self.history_text)
    
    def setup_signals(self):
        """Setup signal connections."""
        self.status_changed.connect(self.on_status_changed)
        self.response_received.connect(self.on_response_received)
        self.listening_started.connect(self.on_listening_started)
        self.listening_stopped.connect(self.on_listening_stopped)
    
    def setup_timers(self):
        """Setup timers for animations."""
        self.pulse_timer = QTimer()
        self.pulse_timer.timeout.connect(self.pulse_effect)
        self.pulse_counter = 0
    
    def toggle_listening(self):
        """Toggle listening state."""
        if not self.is_listening:
            self.is_listening = True
            self.listen_btn.setText("⏸️  Stop Listening")
            self.listen_btn.setStyleSheet("background-color: #ff6600;")
            self.listening_started.emit()
            self.status_changed.emit("🟢 Listening...")
            
            # Start listening in separate thread
            if self.jarvis_core:
                thread = threading.Thread(target=self.jarvis_core.listen, daemon=True)
                thread.start()
        else:
            self.is_listening = False
            self.listen_btn.setText("🎤 Start Listening")
            self.listen_btn.setStyleSheet("")
            self.listening_stopped.emit()
            self.status_changed.emit("🔴 Offline")
    
    def on_listening_started(self):
        """Handle listening start."""
        if self.listen_progress:
            self.listen_progress.setVisible(True)
            self.listen_progress.setValue(0)
        self.pulse_timer.start(50)
    
    def on_listening_stopped(self):
        """Handle listening stop."""
        self.listen_progress.setVisible(False)
        self.pulse_timer.stop()
    
    def on_speak(self):
        """Handle speak button."""
        text = self.response_text.toPlainText()
        if text and self.jarvis_core:
            thread = threading.Thread(target=self.jarvis_core.speak, args=(text,), daemon=True)
            thread.start()
    
    def on_status_changed(self, status: str):
        """Update status label."""
        self.status_label.setText(status)
    
    def on_response_received(self, response: str):
        """Handle received response."""
        self.response_text.setText(response)
        self.add_to_history(f"JARVIS: {response}")
    
    def add_to_history(self, message: str):
        """Add message to conversation history."""
        if self.history_text:
            self.history_text.append(message)
            # Auto-scroll to bottom
            scrollbar = self.history_text.verticalScrollBar()
            if scrollbar:
                scrollbar.setValue(scrollbar.maximum())
    
    def pulse_effect(self):
        """Create pulsing effect during listening."""
        self.pulse_counter += 1
        value = abs(math.sin(self.pulse_counter * 0.1)) * 100
        if self.listen_progress:
            self.listen_progress.setValue(int(value))
    
    def closeEvent(self, a0: Optional[QCloseEvent]):
        """Handle window close."""
        self.is_listening = False
        self.pulse_timer.stop()
        if a0:
            a0.accept()


class JarvisCore:
    """Core JARVIS functionality to be used by GUI."""
    
    def __init__(self, memory: Any, intent_detector: Any, wake_word_detector: Any):
        self.memory = memory
        self.intent_detector = intent_detector
        self.wake_word_detector = wake_word_detector
    
    def listen(self):
        """Listen for voice command."""
        command = self.wake_word_detector.listen_for_command()
        return command
    
    def speak(self, text: str):
        """Speak text output."""
        import pyttsx3  # type: ignore
        engine = pyttsx3.init()  # type: ignore
        engine.say(text)  # type: ignore
        engine.runAndWait()  # type: ignore


if __name__ == '__main__':
    app = QApplication(sys.argv)
    window = JarvisGUI(None)
    window.show()
    sys.exit(app.exec_())
