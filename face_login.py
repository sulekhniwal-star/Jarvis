import cv2
import face_recognition
import numpy as np
import os
import time


class FaceLogin:
    def __init__(self):
        self.reference_path = "reference_face.jpg"
        self.reference_encoding = None
        self._load_reference_face()
    
    def _load_reference_face(self):
        """Load or capture reference face."""
        if os.path.exists(self.reference_path):
            try:
                reference_image = face_recognition.load_image_file(self.reference_path)
                encodings = face_recognition.face_encodings(reference_image)
                if encodings:
                    self.reference_encoding = encodings[0]
                    return
            except Exception:
                pass
        
        # Capture reference face if not exists
        self._capture_reference_face()
    
    def _capture_reference_face(self):
        """Capture and save reference face."""
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                return
            
            print("Look at the camera to set up face recognition...")
            time.sleep(2)
            
            ret, frame = cap.read()
            if ret:
                cv2.imwrite(self.reference_path, frame)
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                encodings = face_recognition.face_encodings(rgb_frame)
                if encodings:
                    self.reference_encoding = encodings[0]
            
            cap.release()
        except Exception:
            pass
    
    def authenticate(self) -> bool:
        """Authenticate user using face recognition."""
        if self.reference_encoding is None:
            return False
        
        try:
            cap = cv2.VideoCapture(0)
            if not cap.isOpened():
                return False
            
            start_time = time.time()
            
            while time.time() - start_time < 10:  # 10 second timeout
                ret, frame = cap.read()
                if not ret:
                    continue
                
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                face_encodings = face_recognition.face_encodings(rgb_frame)
                
                for encoding in face_encodings:
                    distance = face_recognition.face_distance([self.reference_encoding], encoding)[0]
                    if distance < 0.6:  # Match threshold
                        cap.release()
                        return True
                
                time.sleep(0.1)
            
            cap.release()
            return False
            
        except Exception:
            return False