# 🚀 JARVIS Advanced Features Guide

## Table of Contents
1. Memory System Deep Dive
2. Intent Detection Customization
3. Adding Custom Features
4. Vision Integration (Optional)
5. Advanced Wake Words
6. GUI Customization

---

## 1️⃣ Memory System Deep Dive

### Accessing User Memory

```python
from memory import JarvisMemory

memory = JarvisMemory()

# Get owner name
owner = memory.memory['owner']

# Get preferences
music_pref = memory.get_preference('music')

# Store new preference
memory.learn_preference('coffee_type', 'cappuccino')

# Save to disk
memory.save_memory()
```

### Adding Contacts

```python
# Store a contact
memory.add_contact('Mom', phone='+91-9876543210', email='mom@email.com')

# Retrieve contact
contact = memory.get_contact('Mom')
print(contact['phone'])  # +91-9876543210
```

### Storing Notes

```python
# Add a note
memory.add_note('Call dentist on Friday')

# Notes are automatically timestamped and saved
```

### Conversation History

```python
# Add conversation
memory.add_conversation(
    user_input='What is AI?',
    response='AI stands for Artificial Intelligence...',
    intent='ai_response'
)

# Retrieve recent conversations
recent = memory.get_recent_conversations(count=5)
for conv in recent:
    print(f"User: {conv['user_input']}")
    print(f"JARVIS: {conv['response']}")
```

### Getting Context for AI

```python
# Get summary for AI context
context = memory.get_context_summary()
# Returns: "User: Sulekh, Location: Indore. Known habits: chrome, youtube. 
#           Recent context: User said 'what is ai'"
```

---

## 2️⃣ Intent Detection Customization

### Adding New Intents

Edit `intent_detector.py` and add to `INTENT_KEYWORDS`:

```python
INTENT_KEYWORDS = {
    # ... existing intents ...
    'reminder': ['remind', 'remember', 'set reminder', 'alert'],
    'email': ['send email', 'check email', 'mail'],
    'calendar': ['calendar', 'schedule', 'meeting', 'appointment'],
}
```

### Implementing Intent Handlers

In `jarvis.py`, add to `process_intent()`:

```python
def process_intent(self, intent: str, confidence: float, metadata: dict, user_input: str):
    # ... existing intents ...
    
    elif intent == 'reminder':
        reminder_text = metadata.get('reminder_text', user_input)
        self.memory.add_note(f"REMINDER: {reminder_text}")
        self.speak(f"I've set a reminder: {reminder_text}")
    
    elif intent == 'email':
        self.handle_email(metadata)
    
    elif intent == 'calendar':
        self.handle_calendar(metadata)
```

### Improving Metadata Extraction

Edit `_extract_metadata()` to extract custom data:

```python
def _extract_metadata(self, intent: str, user_input: str) -> Dict:
    metadata = {}
    
    if intent == 'reminder':
        # Extract reminder time and text
        import re
        time_match = re.search(r'at (\d{1,2}:\d{2})', user_input)
        if time_match:
            metadata['time'] = time_match.group(1)
        
        # Extract reminder text
        metadata['reminder_text'] = user_input.replace('remind me', '').strip()
    
    return metadata
```

---

## 3️⃣ Adding Custom Features

### Custom Weather Command

```python
def get_extended_weather(self, location: str):
    """Get extended weather forecast"""
    try:
        # ... get location data ...
        
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum"
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        # Process daily forecast
        forecast = data['daily']
        tomorrow_max = forecast['temperature_2m_max'][1]
        tomorrow_min = forecast['temperature_2m_min'][1]
        
        response_text = f"Tomorrow: High {tomorrow_max}°C, Low {tomorrow_min}°C"
        self.speak(response_text)
    except Exception as e:
        print(f"Weather error: {e}")
```

### Email Integration

```python
import smtplib
from email.mime.text import MIMEText

def send_email(self, recipient: str, subject: str, body: str):
    """Send email via SMTP"""
    try:
        # Configure your email
        sender_email = "your-email@gmail.com"
        sender_password = "app-password"  # Use app-specific password
        
        msg = MIMEText(body)
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = recipient
        
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        
        self.speak(f"Email sent to {recipient}")
    except Exception as e:
        self.speak(f"Could not send email: {str(e)}")
```

### Scheduled Tasks

```python
import schedule
import threading

class TaskScheduler:
    def __init__(self, jarvis):
        self.jarvis = jarvis
        self.scheduler = schedule.Scheduler()
    
    def schedule_task(self, task_name: str, time_str: str, action: callable):
        """Schedule a task"""
        self.scheduler.at(time_str).do(action)
    
    def run_scheduler(self):
        """Run scheduler in background"""
        thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        thread.start()
    
    def _scheduler_loop(self):
        while True:
            self.scheduler.run_pending()
            time.sleep(1)
```

---

## 4️⃣ Vision Integration (Optional)

### Face Recognition

```python
import cv2
import face_recognition
import numpy as np

class FaceRecognizer:
    def __init__(self):
        self.known_faces = []
        self.known_names = []
    
    def add_face(self, image_path: str, name: str):
        """Add a known face"""
        image = face_recognition.load_image_file(image_path)
        encoding = face_recognition.face_encodings(image)[0]
        self.known_faces.append(encoding)
        self.known_names.append(name)
    
    def recognize_faces(self):
        """Recognize faces in camera feed"""
        video_capture = cv2.VideoCapture(0)
        
        while True:
            ret, frame = video_capture.read()
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            face_locations = face_recognition.face_locations(rgb_frame)
            face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            for face_encoding in face_encodings:
                matches = face_recognition.compare_faces(
                    self.known_faces, face_encoding
                )
                name = "Unknown"
                
                face_distances = face_recognition.face_distance(
                    self.known_faces, face_encoding
                )
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = self.known_names[best_match_index]
                
                yield name
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        video_capture.release()
```

### Object Detection

```python
import cv2
import numpy as np

class ObjectDetector:
    def __init__(self):
        # Load YOLO weights
        self.net = cv2.dnn.readNet(
            "yolov3.weights",
            "yolov3.cfg"
        )
    
    def detect_objects(self, frame):
        """Detect objects in frame"""
        height, width, channels = frame.shape
        
        blob = cv2.dnn.blobFromImage(
            frame, 0.00392, (416, 416), (0, 0, 0), True, False
        )
        
        self.net.setInput(blob)
        outs = self.net.forward(self.get_output_layers())
        
        class_ids = []
        confidences = []
        boxes = []
        
        for out in outs:
            for detection in out:
                scores = detection[5:]
                class_id = np.argmax(scores)
                confidence = scores[class_id]
                
                if confidence > 0.5:
                    center_x = int(detection[0] * width)
                    center_y = int(detection[1] * height)
                    w = int(detection[2] * width)
                    h = int(detection[3] * height)
                    
                    x = center_x - w / 2
                    y = center_y - h / 2
                    
                    boxes.append([x, y, w, h])
                    confidences.append(float(confidence))
                    class_ids.append(class_id)
        
        return boxes, confidences, class_ids
    
    def get_output_layers(self):
        layer_names = self.net.getLayerNames()
        output_layers = [
            layer_names[i - 1] for i in self.net.getUnconnectedOutLayers()
        ]
        return output_layers
```

---

## 5️⃣ Advanced Wake Words

### Using Porcupine (Recommended)

```bash
pip install pvporcupine
```

```python
import pvporcupine
import pyaudio
import struct

class PorcupineWakeWord:
    def __init__(self, access_key: str):
        self.access_key = access_key
        self.porcupine = pvporcupine.create(
            access_key=access_key,
            keywords=['jarvis']
        )
    
    def listen(self):
        """Listen for Porcupine wake word"""
        pa = pyaudio.PyAudio()
        stream = pa.open(
            rate=self.porcupine.sample_rate,
            channels=1,
            format=pyaudio.paInt16,
            input=True,
            frames_per_buffer=self.porcupine.frame_length
        )
        
        print("🎤 Listening for wake word...")
        
        while True:
            pcm = stream.read(self.porcupine.frame_length)
            pcm = struct.unpack_from("h" * self.porcupine.frame_length, pcm)
            
            keyword_index = self.porcupine.process(pcm)
            
            if keyword_index >= 0:
                print("✅ Wake word detected!")
                return True
```

### Using Vosk (Offline)

```bash
pip install vosk
# Download model: https://github.com/alphacep/vosk-api/blob/master/README.md
```

```python
import vosk
import pyaudio
import json

class VoskWakeWord:
    def __init__(self, model_path: str):
        self.model = vosk.Model(model_path)
        self.rec = vosk.KaldiRecognizer(self.model, 16000)
    
    def listen(self):
        """Listen for wake word with Vosk"""
        p = pyaudio.PyAudio()
        stream = p.open(
            format=pyaudio.paInt16,
            channels=1,
            rate=16000,
            input=True,
            frames_per_buffer=4096
        )
        
        print("🎤 Listening (offline)...")
        
        while True:
            data = stream.read(4096)
            
            if self.rec.AcceptWaveform(data):
                result = json.loads(self.rec.Result())
                text = result.get('result', [{}])[0].get('conf', '')
                
                if 'jarvis' in text.lower():
                    print("✅ Wake word detected!")
                    return True
```

---

## 6️⃣ GUI Customization

### Change Color Scheme

Edit `gui.py`:

```python
self.setStyleSheet("""
    QMainWindow {
        background-color: #1a1a2e;  # Change main background
    }
    QLabel {
        color: #ff00ff;  # Change text color to magenta
    }
    QPushButton {
        background-color: #16213e;  # Change button color
        color: #0f3460;
    }
    QPushButton:hover {
        background-color: #e94560;  # Change hover color
    }
""")
```

### Add Custom Buttons

```python
def init_ui(self):
    # ... existing code ...
    
    # Add custom button
    custom_btn = QPushButton("🎵 Play Music")
    custom_btn.setFixedHeight(50)
    custom_btn.clicked.connect(self.play_music)
    button_layout.addWidget(custom_btn)

def play_music(self):
    """Handle music button"""
    self.jarvis_core.play_music()
```

### Real-Time Visualizations

```python
class AdvancedVisualizer(QWidget):
    """Advanced audio visualization with multiple modes"""
    
    def __init__(self, parent=None):
        super().__init__(parent)
        self.mode = 'bars'  # 'bars', 'waveform', 'circular'
    
    def paintEvent(self, event):
        painter = QPainter(self)
        
        if self.mode == 'bars':
            self.draw_bars(painter)
        elif self.mode == 'waveform':
            self.draw_waveform(painter)
        elif self.mode == 'circular':
            self.draw_circular(painter)
    
    def draw_bars(self, painter):
        """Draw equalizer bars"""
        width = self.width()
        height = self.height()
        bar_width = width // 10
        
        for i in range(10):
            bar_height = height * self.audio_data[i] if i < len(self.audio_data) else 0
            x = i * bar_width
            painter.fillRect(x, height - bar_height, bar_width - 2, bar_height, QColor(0, 255, 150))
    
    def draw_circular(self, painter):
        """Draw circular equalizer"""
        center_x = self.width() // 2
        center_y = self.height() // 2
        radius = min(center_x, center_y) - 10
        
        painter.setPen(QColor(0, 200, 255))
        
        for i, value in enumerate(self.audio_data[:32]):
            angle = (i / 32) * 360
            # Draw circular visualization
```

---

## 🔗 Integration Examples

### Complete Custom Feature

```python
class RemindMeFeature:
    def __init__(self, jarvis):
        self.jarvis = jarvis
        self.reminders = []
    
    def create_reminder(self, text: str, time_str: str):
        """Create a reminder"""
        self.reminders.append({
            'text': text,
            'time': time_str,
            'created': datetime.now()
        })
        self.jarvis.memory.add_note(f"Reminder: {text} at {time_str}")
        self.jarvis.speak(f"Reminder set: {text}")
    
    def list_reminders(self):
        """List all reminders"""
        if not self.reminders:
            return "No reminders set"
        
        reminder_list = "\n".join([
            f"- {r['text']} at {r['time']}"
            for r in self.reminders
        ])
        return reminder_list
```

---

## 📊 Performance Tips

1. **Cache Gemini responses** for common queries
2. **Use threading** for long operations
3. **Optimize speech recognition** by adjusting noise threshold
4. **Compress memory.json** to keep startup fast
5. **Use database** instead of JSON for 1000+ conversations

---

Great! Your JARVIS is now truly advanced! 🚀
