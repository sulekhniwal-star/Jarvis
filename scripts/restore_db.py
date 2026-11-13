#!/usr/bin/env python3
"""
Project Jarvis — Database Encrypted Restore Utility.
Decrypts and restores an AES-256 encrypted database backup.
"""

import argparse
import hashlib
import os
import shutil
import sqlite3
import sys
from cryptography.fernet import Fernet


def decrypt_data(encrypted_data: bytes, key: str) -> bytes:
    """Decrypts AES-256 Fernet ciphertext."""
    fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return fernet.decrypt(encrypted_data)


def restore_backup(
    backup_file: str,
    target_db: str,
    key: str
) -> dict:
    """
    Decrypts backup file and writes to target database path.
    """
    if not os.path.exists(backup_file):
        raise FileNotFoundError(f"Backup file not found: {backup_file}")

    with open(backup_file, "rb") as f:
        encrypted_data = f.read()

    enc_sha256 = hashlib.sha256(encrypted_data).hexdigest()
    raw_data = decrypt_data(encrypted_data, key)
    raw_sha256 = hashlib.sha256(raw_data).hexdigest()

    # Backup existing target if it exists
    if os.path.exists(target_db):
        pre_restore_backup = f"{target_db}.pre_restore"
        shutil.copy2(target_db, pre_restore_backup)

    # If raw_data starts with SQLite format 3 or is SQL text dump
    if raw_data.startswith(b"SQLite format 3"):
        with open(target_db, "wb") as f:
            f.write(raw_data)
    else:
        # Text SQL script
        if os.path.exists(target_db):
            os.remove(target_db)
        con = sqlite3.connect(target_db)
        con.executescript(raw_data.decode("utf-8", errors="replace"))
        con.close()

    return {
        "restored_db": target_db,
        "raw_size_bytes": len(raw_data),
        "raw_sha256": raw_sha256,
        "encrypted_sha256": enc_sha256,
    }


def main():
    parser = argparse.ArgumentParser(description="Restore encrypted Jarvis database backup.")
    parser.add_argument("--backup", required=True, help="Path to .enc backup file")
    parser.add_argument("--db", required=True, help="Target restore database path")
    parser.add_argument("--key", required=True, help="Fernet decryption key")
    args = parser.parse_args()

    result = restore_backup(args.backup, args.db, args.key)
    print("=== JARVIS RESTORE COMPLETE ===")
    print(f"Restored to: {result['restored_db']}")
    print(f"Raw Size:    {result['raw_size_bytes']} bytes")
    print(f"Integrity:   {result['raw_sha256']}")


if __name__ == "__main__":
    main()

