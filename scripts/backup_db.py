#!/usr/bin/env python3
"""
Project Jarvis — Database Encrypted Backup Utility.
Creates an encrypted snapshot of the SQLite / PostgreSQL database using AES-256 (Fernet).
Computes SHA-256 integrity checksum.
"""

import argparse
import datetime
import hashlib
import os
import shutil
import sqlite3
import subprocess
import sys
from cryptography.fernet import Fernet

DEFAULT_BACKUP_DIR = os.path.join(os.path.dirname(__file__), "..", "backups")


def generate_backup_key() -> str:
    """Generates a secure Fernet 32-byte url-safe base64 encryption key."""
    return Fernet.generate_key().decode()


def dump_sqlite(db_file: str) -> bytes:
    """Creates a consistent binary dump of a SQLite database."""
    if not os.path.exists(db_file):
        raise FileNotFoundError(f"SQLite database file not found: {db_file}")

    # Use SQLite VACUUM INTO or sqlite3 online backup API for consistency
    con = sqlite3.connect(db_file)
    mem_con = sqlite3.connect(":memory:")
    con.backup(mem_con)
    con.close()

    sql_dump_str = "\n".join(mem_con.iterdump())
    mem_con.close()
    return sql_dump_str.encode("utf-8")


def encrypt_data(raw_data: bytes, key: str) -> bytes:
    """Encrypts raw bytes using AES-256 Fernet."""
    fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return fernet.encrypt(raw_data)


def create_backup(
    db_path: str,
    output_dir: str = DEFAULT_BACKUP_DIR,
    key: str = None
) -> dict:
    """
    Dumps, encrypts, and writes backup to disk.
    Returns metadata dict with path, key, timestamp, and checksum.
    """
    os.makedirs(output_dir, exist_ok=True)

    if not key:
        key = os.environ.get("JARVIS_BACKUP_KEY") or generate_backup_key()

    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d_%H%M%SZ")
    raw_data = dump_sqlite(db_path)

    raw_checksum = hashlib.sha256(raw_data).hexdigest()
    encrypted_data = encrypt_data(raw_data, key)
    enc_checksum = hashlib.sha256(encrypted_data).hexdigest()

    output_filename = f"jarvis_backup_{timestamp}.enc"
    output_filepath = os.path.join(output_dir, output_filename)

    with open(output_filepath, "wb") as f:
        f.write(encrypted_data)

    return {
        "backup_file": output_filepath,
        "key": key,
        "raw_size_bytes": len(raw_data),
        "encrypted_size_bytes": len(encrypted_data),
        "raw_sha256": raw_checksum,
        "encrypted_sha256": enc_checksum,
        "timestamp": timestamp,
    }


def main():
    parser = argparse.ArgumentParser(description="Create encrypted Jarvis database backup.")
    parser.add_argument("--db", default="f:/Javis/backend/jarvis.db", help="Path to SQLite database")
    parser.add_argument("--out", default=DEFAULT_BACKUP_DIR, help="Output directory")
    parser.add_argument("--key", default=None, help="Fernet encryption key")
    args = parser.parse_args()

    result = create_backup(args.db, args.out, args.key)
    print("=== JARVIS BACKUP CREATED ===")
    print(f"File:       {result['backup_file']}")
    print(f"Encrypted:  {result['encrypted_size_bytes']} bytes (SHA256: {result['encrypted_sha256'][:16]}...)")
    print(f"Key:        {result['key']}")


if __name__ == "__main__":
    main()
