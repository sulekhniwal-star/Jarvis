from PyQt5.QtCore import QObject, pyqtSignal

class JarvisEmitter(QObject):
    """
    A QObject that emits signals for Jarvis's state changes.
    This is used to communicate with the GUI in a thread-safe way.
    """
    response_received = pyqtSignal(str)
    status_changed = pyqtSignal(str)
    listening_started = pyqtSignal()
    listening_stopped = pyqtSignal()
    is_running_changed = pyqtSignal(bool)

# Global emitter instance
emitter = JarvisEmitter()
