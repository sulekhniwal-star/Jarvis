import sys
import math
from typing import Optional

from PyQt5.QtWidgets import (QApplication, QMainWindow, QVBoxLayout, QHBoxLayout,
                             QLabel, QPushButton, QWidget, QTextEdit, QProgressBar)
from PyQt5.QtCore import Qt, QTimer, pyqtSlot
from PyQt5.QtGui import QFont, QColor, QPainter, QPaintEvent, QCloseEvent

from gui_emitter import emitter

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
        
        painter.setPen(QColor(0, 255, 100))
        painter.drawLine(0, center_y, width, center_y)
        
        if self.audio_data:
            pen = QColor(0, 200, 255)
            painter.setPen(pen)
            
            x_step = width / len(self.audio_data)
            prev_y = center_y
            for i, value in enumerate(self.audio_data):
                x = int(i * x_step)
                normalized = min(abs(value) / 32768, 1.0)
                y = center_y - int(normalized * center_y * 0.8)
                
                if i > 0:
                    prev_x = int((i - 1) * x_step)
                    painter.drawLine(prev_x, prev_y, x, y)
                
                prev_y = y


class JarvisGUI(QMainWindow):
    """Modern JARVIS GUI driven by signals."""

    def __init__(self, jarvis_assistant: Optional["JarvisAssistant"] = None):
        super().__init__()
        self.jarvis_assistant = jarvis_assistant
        self.init_ui()
        self.setup_signals()
        self.setup_timers()

    def init_ui(self):
        """Initialize the user interface."""
        self.setWindowTitle("J.A.R.V.I.S")
        self.setGeometry(100, 100, 1200, 800)
        self.setStyleSheet("""
            QMainWindow {
                background-color: #02091c;
            }
            QLabel {
                color: #00e5ff;
                font-family: 'Segoe UI', Arial, sans-serif;
            }
            QPushButton {
                background-color: transparent;
                color: #00e5ff;
                border: 2px solid #00e5ff;
                border-radius: 10px;
                padding: 10px;
                font-size: 16px;
                font-weight: bold;
            }
            QPushButton:hover {
                background-color: #00e5ff;
                color: #02091c;
            }
            QPushButton:pressed {
                background-color: #00aacc;
            }
            QTextEdit {
                background-color: rgba(0, 229, 255, 0.05);
                border: 1px solid #00e5ff;
                border-radius: 5px;
                color: #fafafa;
                font-size: 14px;
            }
        """)
        
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        title = QLabel("J.A.R.V.I.S")
        title.setFont(QFont('Segoe UI', 36, QFont.Weight.Bold))
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(title)

        self.status_label = QLabel("INITIALIZING...")
        self.status_label.setFont(QFont('Segoe UI', 14))
        self.status_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_layout.addWidget(self.status_label)

        self.visualizer = AudioVisualizer()
        main_layout.addWidget(self.visualizer)

        self.listen_progress = QProgressBar()
        self.listen_progress.setTextVisible(False)
        self.listen_progress.setStyleSheet("""
            QProgressBar {
                border: none;
                background-color: transparent;
            }
            QProgressBar::chunk {
                background-color: qlineargradient(x1:0, y1:0, x2:1, y2:0, stop:0 #00e5ff, stop:1 #02091c);
            }
        """)
        self.listen_progress.setVisible(False)
        main_layout.addWidget(self.listen_progress)

        self.response_text = QTextEdit()
        self.response_text.setReadOnly(True)
        self.response_text.setMinimumHeight(100)
        main_layout.addWidget(self.response_text)

        button_layout = QHBoxLayout()
        self.listen_btn = QPushButton("WAKE WORD ACTIVE")
        self.listen_btn.setFixedHeight(50)
        self.listen_btn.setEnabled(False)
        button_layout.addWidget(self.listen_btn)

        self.exit_btn = QPushButton("SHUT DOWN")
        self.exit_btn.setFixedHeight(50)
        self.exit_btn.clicked.connect(self.close)
        button_layout.addWidget(self.exit_btn)
        main_layout.addLayout(button_layout)

        self.history_text = QTextEdit()
        self.history_text.setReadOnly(True)
        main_layout.addWidget(self.history_text)

    def setup_signals(self):
        """Setup signal connections to the global emitter."""
        emitter.status_changed.connect(self.on_status_changed)
        emitter.response_received.connect(self.on_response_received)
        emitter.listening_started.connect(self.on_listening_started)
        emitter.listening_stopped.connect(self.on_listening_stopped)
        emitter.is_running_changed.connect(self.on_running_changed)

    def setup_timers(self):
        """Setup timers for animations."""
        self.pulse_timer = QTimer(self)
        self.pulse_timer.timeout.connect(self.pulse_effect)
        self.pulse_counter = 0

    @pyqtSlot()
    def on_listening_started(self):
        self.listen_progress.setVisible(True)
        self.pulse_timer.start(50)
        self.listen_btn.setText("🎤 Listening...")
        self.listen_btn.setStyleSheet("background-color: #ff6600;")

    @pyqtSlot()
    def on_listening_stopped(self):
        self.listen_progress.setVisible(False)
        self.pulse_timer.stop()
        self.listen_btn.setText("🎤 Listening (Wake Word Active)")
        self.listen_btn.setStyleSheet("")

    @pyqtSlot(str)
    def on_status_changed(self, status: str):
        self.status_label.setText(status)

    @pyqtSlot(str)
    def on_response_received(self, response: str):
        self.response_text.setText(response)
        self.add_to_history(f"JARVIS: {response}")

    @pyqtSlot(bool)
    def on_running_changed(self, is_running: bool):
        if not is_running:
            self.close()

    def add_to_history(self, message: str):
        self.history_text.append(message)
        self.history_text.verticalScrollBar().setValue(self.history_text.verticalScrollBar().maximum())

    def pulse_effect(self):
        self.pulse_counter += 1
        value = int(abs(math.sin(self.pulse_counter * 0.1)) * 100)
        self.listen_progress.setValue(value)

    def closeEvent(self, event: QCloseEvent):
        self.pulse_timer.stop()
        if self.jarvis_assistant:
            self.jarvis_assistant.is_running = False
        QApplication.quit()
        event.accept()

if __name__ == '__main__':
    # This part is for testing the GUI independently.
    # In the main application, `jarvis.py` will launch this GUI.
    
    app = QApplication(sys.argv)
    
    # In a real scenario, the JarvisAssistant instance is passed from jarvis.py
    # and runs in a separate thread.
    window = JarvisGUI()
    window.show()

    # Mocking signals for testing purposes
    def mock_signals():
        import time
        from threading import Thread

        def run():
            time.sleep(2)
            emitter.status_changed.emit("👂 Listening for wake word...")
            time.sleep(3)
            emitter.listening_started.emit()
            emitter.status_changed.emit("👂 Wake word detected! Listening for command...")
            emitter.response_received.emit("Yes, sir?")
            time.sleep(2)
            emitter.status_changed.emit("🧠 Processing...")
            time.sleep(2)
            emitter.response_received.emit("The current time is 10:30 AM.")
            emitter.listening_stopped.emit()
            emitter.status_changed.emit("👂 Listening for wake word...")

        Thread(target=run, daemon=True).start()

    mock_signals()
    sys.exit(app.exec_())
