"""
Project Jarvis — Security Boundaries & Cryptographic Test Suite.
Verifies Argon2id, Fernet encryption, payload tampering detection, and secret redaction.
"""

from app.core.security import (
    create_access_token,
    decode_access_token,
    decrypt_secret,
    encrypt_secret,
    hash_password,
    verify_password,
)
from app.services.approval_service import compute_payload_hash
from app.services.audit_service import redact_sensitive_text


def test_argon2id_hashing_and_verification():
    """Verify Argon2id hashes securely and rejects incorrect passwords."""
    raw_pass = "UltraSecretOwnerPassword2026!"
    hashed = hash_password(raw_pass)
    assert hashed != raw_pass
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw_pass, hashed) is True
    assert verify_password("WrongPassword123", hashed) is False


def test_fernet_encryption_at_rest():
    """Verify integration secrets are encrypted at rest with Fernet AES-256."""
    secret = "ghp_1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = encrypt_secret(secret)
    assert encrypted != secret
    decrypted = decrypt_secret(encrypted)
    assert decrypted == secret


def test_jwt_token_tampering():
    """Verify tampered JWT tokens fail decoding."""
    token = create_access_token("test-owner-id")
    # Tamper with token string
    tampered = token[:-5] + "XXXXX"
    decoded = decode_access_token(tampered)
    assert decoded is None


def test_approval_payload_tamper_detection():
    """Verify any parameter change changes the SHA-256 payload hash."""
    payload_a = {"action": "deploy_pr", "pr_number": 42, "target": "main"}
    payload_b = {"action": "deploy_pr", "pr_number": 43, "target": "main"}

    hash_a = compute_payload_hash(payload_a)
    hash_b = compute_payload_hash(payload_b)

    assert hash_a != hash_b
    assert len(hash_a) == 64


def test_secret_redaction_filter():
    """Verify log redaction strips GitHub tokens, JWTs, and passwords."""
    raw_log = (
        "User logged in with token eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.abcdef123456 "
        "and GitHub token ghp_abcdefghijklmnopqrstuvwxyz123456"
    )
    redacted = redact_sensitive_text(raw_log)
    assert "ghp_" not in redacted
    assert "eyJhbGci" not in redacted
    assert "[REDACTED]" in redacted
