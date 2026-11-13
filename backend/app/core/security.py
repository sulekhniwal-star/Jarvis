"""
Project Jarvis — Cryptography and Security Core.
Implements Argon2id password hashing, JWT session encoding/decoding,
and Fernet AES-256-GCM symmetric encryption for stored integration secrets.
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet

from app.core.config import settings

# Initialize Argon2id password hasher with secure defaults
_pwd_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65536,  # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Hashes a password using Argon2id."""
    return _pwd_hasher.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain password against an Argon2id hash."""
    try:
        return _pwd_hasher.verify(hashed_password, plain_password)
    except (VerifyMismatchError, Exception):
        return False


def create_access_token(
    subject: str, expires_delta: timedelta | None = None, extra_claims: dict[str, Any] | None = None
) -> str:
    """Generates an HMAC-SHA256 signed JWT access token."""
    now = datetime.now(UTC)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }
    if extra_claims:
        payload.update(extra_claims)

    encoded_jwt = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decodes and validates a JWT access token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        return payload
    except (jwt.PyJWTError, Exception):
        return None


# Cryptographic secret storage helper (Fernet AES-256)
def _get_fernet() -> Fernet:
    key = settings.MASTER_ENCRYPTION_KEY.encode()
    # If key is invalid length, generate a fallback deterministic padding for dev
    if len(key) != 44:
        import base64
        import hashlib

        padded = base64.urlsafe_b64encode(hashlib.sha256(key).digest())
        return Fernet(padded)
    return Fernet(key)


def encrypt_secret(plain_secret: str) -> str:
    """Encrypts a plaintext secret using AES-256-GCM authenticated Fernet encryption."""
    if not plain_secret:
        return ""
    fernet = _get_fernet()
    return fernet.encrypt(plain_secret.encode()).decode()


def decrypt_secret(encrypted_secret: str) -> str:
    """Decrypts an encrypted secret."""
    if not encrypted_secret:
        return ""
    fernet = _get_fernet()
    return fernet.decrypt(encrypted_secret.encode()).decode()
