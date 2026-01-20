"""Time and date skills."""

from datetime import datetime

def get_time_date() -> str:
    """Get the current date and time as a formatted string."""
    now = datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S")
