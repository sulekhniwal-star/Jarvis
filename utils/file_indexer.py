import os


class FileIndexer:
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.index = []
        self.build_index()
    
    def build_index(self):
        """Build file index by walking directory tree."""
        self.index = []
        try:
            for root, dirs, files in os.walk(self.root_dir):
                for file in files:
                    full_path = os.path.join(root, file)
                    self.index.append({
                        "name": file,
                        "path": full_path
                    })
        except Exception:
            pass
    
    def search(self, query: str) -> list[str]:
        """Search for files matching query (case-insensitive, partial match)."""
        if not query:
            return []
        
        query_lower = query.lower()
        matches = []
        
        for entry in self.index:
            if query_lower in entry["name"].lower():
                matches.append(entry["path"])
        
        return matches[:5]  # Return top 5 matches