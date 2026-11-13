"""
Project Jarvis — Application Configuration.
Uses Pydantic v2 BaseSettings to load and validate environment variables.
"""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("../.env", ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Core settings
    APP_NAME: str = "Project Jarvis"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    API_V1_STR: str = "/api/v1"

    # Security
    SECRET_KEY: str = Field(
        default="development_insecure_secret_key_change_in_production_min_32_chars",
        description="Master secret key for JWT session tokens"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    MASTER_ENCRYPTION_KEY: str = Field(
        default="e1NoZWxsT3ZlcnJpZGVLZXlGb3JMb2NhbERldkV4YW1wbGU9PQ==",
        description="Fernet 32-byte URL-safe base64 key for encrypting database secrets"
    )

    # Single-Tenant Owner Credentials
    OWNER_USERNAME: str = "jarvis_owner"
    OWNER_INITIAL_PASSWORD: str = "jarvis_secure_initial_password_2026"

    # Persistence
    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./jarvis.db",
        description="Async SQLAlchemy database connection string"
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_TIMEOUT_SECONDS: int = 30

    # AI Provider Defaults
    DEFAULT_AI_PROVIDER: str = "mock"
    ALLOW_PAID_API_CALLS: bool = False
    MAX_MONTHLY_BUDGET_INR: float = 1000.0

    # Optional External Providers
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "openrouter/auto"

    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]


settings = Settings()

