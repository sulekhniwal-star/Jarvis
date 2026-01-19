from PyQt5.QtCore import QObject, pyqtSignal

class Emitter(QObject):
    """
    Global signal emitter for communication between Jarvis core and the GUI.
    """
    status_changed = pyqtSignal(str)
    response_received = pyqtSignal(str)
    listening_started = pyqtSignal()
    listening_stopped = pyqtSignal()
    is_running_changed = pyqtSignal(bool)

# Global emitter instance
emitter = Emitter()
