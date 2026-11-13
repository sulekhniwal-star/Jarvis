"""
Project Jarvis — Sandboxed Filesystem Worker.
Enforces strict directory boundary isolation, blocking directory traversal,
symbolic link attacks, and access outside the assigned workspace.
"""

from pathlib import Path
from typing import List
from fastapi import HTTPException, status


class SecurityException(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class SandboxedFilesystem:
    def __init__(self, workspace_root: Path):
        self.workspace_root = workspace_root.resolve()
        if not self.workspace_root.exists():
            self.workspace_root.mkdir(parents=True, exist_ok=True)

    def resolve_safe_path(self, relative_path: str) -> Path:
        """
        Resolves path and guarantees it resides within workspace_root.
        Prevents directory traversal attacks (../, absolute paths, symlink escapes).
        """
        if not relative_path or not relative_path.strip():
            raise SecurityException("Empty path is invalid.")

        target = (self.workspace_root / relative_path).resolve()

        # Strict containment check
        try:
            target.relative_to(self.workspace_root)
        except ValueError:
            raise SecurityException(
                f"Path traversal detected: Target '{relative_path}' is outside workspace '{self.workspace_root}'."
            )

        return target

    def read_file(self, relative_path: str) -> str:
        """Reads content from a sandboxed file."""
        safe_path = self.resolve_safe_path(relative_path)
        if not safe_path.exists() or not safe_path.is_file():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"File not found: '{relative_path}'"
            )
        return safe_path.read_text(encoding="utf-8")

    def write_file(self, relative_path: str, content: str) -> int:
        """Writes content to a sandboxed file, creating parent directories if needed."""
        safe_path = self.resolve_safe_path(relative_path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        safe_path.write_text(content, encoding="utf-8")
        return len(content)

    def list_files(self, sub_dir: str = "") -> List[str]:
        """Lists files inside the sandboxed workspace relative to workspace root."""
        target_dir = self.resolve_safe_path(sub_dir) if sub_dir else self.workspace_root
        if not target_dir.exists() or not target_dir.is_dir():
            return []

        results: List[str] = []
        for p in target_dir.rglob("*"):
            if p.is_file():
                rel = p.relative_to(self.workspace_root).as_posix()
                results.append(rel)
        return sorted(results)
