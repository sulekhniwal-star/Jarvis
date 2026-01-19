import sqlite3
import json
import os
from datetime import datetime
from typing import Dict, List, Any

class EnhancedJarvisMemory:
    """A class to manage Jarvis's memory using an SQLite database."""

    def __init__(self, db_path="jarvis.db", memory_file="memory.json"):
        """
        Initializes the memory, connects to the database, and creates tables if they don't exist.
        """
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()
        self._create_tables()
        if not self._is_migrated():
            self.migrate_from_json(memory_file)

    def _create_tables(self):
        """
        Creates the necessary tables in the database if they don't already exist.
        """
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS key_value_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        ''')

        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                user_input TEXT NOT NULL,
                response TEXT NOT NULL,
                intent TEXT
            )
        ''')

        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS contacts (
                name TEXT PRIMARY KEY,
                phone TEXT,
                email TEXT
            )
        ''')

        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS notes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                content TEXT NOT NULL
            )
        ''')
        
        # Table to track migration status
        self.cursor.execute('''
            CREATE TABLE IF NOT EXISTS migration (
                migrated INTEGER
            )
        ''')
        self.conn.commit()
    
    def _is_migrated(self):
        """Checks if the migration from JSON has already been done."""
        self.cursor.execute("SELECT migrated FROM migration")
        result = self.cursor.fetchone()
        return result is not None

    def migrate_from_json(self, memory_file: str):
        """Migrates data from the old JSON memory file to the database."""
        if not os.path.exists(memory_file):
            return

        try:
            with open(memory_file, 'r') as f:
                memory_data = json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return

        for key, value in memory_data.items():
            if isinstance(value, dict):
                for sub_key, sub_value in value.items():
                    if isinstance(sub_value, (str, int, float, bool)):
                        self.set_preference(f"{key}.{sub_key}", sub_value)
            elif isinstance(value, list):
                if key == "notes":
                    for note in value:
                        self.add_note(note.get("content", ""))
            else:
                 self.set_preference(key, value)
        
        # Mark migration as done
        self.cursor.execute("INSERT INTO migration (migrated) VALUES (1)")
        self.conn.commit()


    def set_preference(self, key: str, value: Any):
        """Saves or updates a preference in the key_value_store."""
        self.cursor.execute("INSERT OR REPLACE INTO key_value_store (key, value) VALUES (?, ?)", (key, str(value)))
        self.conn.commit()

    def get_preference(self, key: str, default: Any = None) -> Any:
        """Retrieves a preference from the key_value_store."""
        self.cursor.execute("SELECT value FROM key_value_store WHERE key = ?", (key,))
        result = self.cursor.fetchone()
        return result[0] if result else default

    def add_conversation(self, user_input: str, response: str, intent: str = None):
        """Adds a conversation to the history."""
        timestamp = datetime.now().isoformat()
        self.cursor.execute('''
            INSERT INTO conversation_history (timestamp, user_input, response, intent)
            VALUES (?, ?, ?, ?)
        ''', (timestamp, user_input, response, intent))
        self.conn.commit()

    def get_recent_conversations(self, count: int = 5) -> List[Dict]:
        """Retrieves recent conversations from the history."""
        self.cursor.execute('''
            SELECT timestamp, user_input, response, intent FROM conversation_history
            ORDER BY id DESC
            LIMIT ?
        ''', (count,))
        rows = self.cursor.fetchall()
        return [
            {"timestamp": r[0], "user_input": r[1], "response": r[2], "intent": r[3]}
            for r in rows
        ]

    def add_contact(self, name: str, phone: str = None, email: str = None):
        """Adds or updates a contact."""
        self.cursor.execute('''
            INSERT OR REPLACE INTO contacts (name, phone, email)
            VALUES (?, ?, ?)
        ''', (name.lower(), phone, email))
        self.conn.commit()

    def get_contact(self, name: str) -> Dict:
        """Retrieves contact information."""
        self.cursor.execute("SELECT name, phone, email FROM contacts WHERE name = ?", (name.lower(),))
        row = self.cursor.fetchone()
        return {"name": row[0], "phone": row[1], "email": row[2]} if row else {}

    def add_note(self, note: str):
        """Adds a note."""
        timestamp = datetime.now().isoformat()
        self.cursor.execute("INSERT INTO notes (timestamp, content) VALUES (?, ?)", (timestamp, note))
        self.conn.commit()

    def get_notes(self) -> List[Dict]:
        """Retrieves all notes."""
        self.cursor.execute("SELECT timestamp, content FROM notes ORDER BY id DESC")
        rows = self.cursor.fetchall()
        return [{"timestamp": r[0], "content": r[1]} for r in rows]

    def get_context_summary(self) -> str:
        """Generates a context summary from the memory."""
        owner = self.get_preference("owner", "Sir")
        city = self.get_preference("city", "")
        recent_conv = self.get_recent_conversations(2)
        
        current_hour = datetime.now().hour
        time_context = "morning" if 5 <= current_hour < 12 else "afternoon" if 12 <= current_hour < 17 else "evening" if 17 <= current_hour < 21 else "night"

        summary = f"User: {owner}, Location: {city}, Time: {time_context}. "
        
        if recent_conv:
            summary += "Recent: "
            for conv in recent_conv:
                summary += f"'{conv['user_input']}' -> {conv.get('intent', 'unknown')}. "
        
        return summary

    def close(self):
        """Closes the database connection."""
        self.conn.close()

if __name__ == '__main__':
    # This block can be used for testing the EnhancedJarvisMemory class
    memory = EnhancedJarvisMemory(db_path="jarvis_test.db", memory_file="memory.json")
    print("Database and tables created successfully.")
    
    # Test data migration
    if not memory._is_migrated():
        print("Migrating data from memory.json...")
        memory.migrate_from_json("memory.json")
        print("Migration complete.")

    # Test adding and getting data
    memory.set_preference("test_pref", "test_value")
    print(f"Get preference 'test_pref': {memory.get_preference('test_pref')}")
    
    memory.add_conversation("Hello Jarvis", "Hello Sir", "greeting")
    print(f"Recent conversations: {memory.get_recent_conversations(1)}")

    memory.add_contact("John Doe", "1234567890", "john.doe@example.com")
    print(f"Get contact 'john doe': {memory.get_contact('john doe')}")
    
    memory.add_note("This is a test note.")
    print(f"Notes: {memory.get_notes()}")

    print(f"Context summary: {memory.get_context_summary()}")
    
    memory.close()
    os.remove("jarvis_test.db")
