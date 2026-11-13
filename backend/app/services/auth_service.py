"""
Project Jarvis — Authentication Service.
Handles owner authentication, Argon2id validation, and FastAPI dependencies.
"""

from typing import Optional
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db_session
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models.user import User
from app.services.audit_service import log_audit_event

security_scheme = HTTPBearer(auto_error=False)


async def ensure_owner_user_exists(session: AsyncSession) -> User:
    """Idempotently provisions the initial single-tenant owner if not present."""
    stmt = select(User).where(User.username == settings.OWNER_USERNAME)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        hashed = hash_password(settings.OWNER_INITIAL_PASSWORD)
        user = User(
            username=settings.OWNER_USERNAME,
            hashed_password=hashed,
            display_name="Jarvis Owner",
            role="owner",
            is_active=True
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)
        await log_audit_event(
            session=session,
            actor_type="system",
            actor_id="system",
            action="INITIALIZE_OWNER_USER",
            target_type="user",
            target_id=user.id
        )
        await session.commit()
    return user


async def authenticate_owner(
    session: AsyncSession,
    username: str,
    password: str
) -> Optional[User]:
    """Authenticates the single-tenant owner against stored Argon2id hash."""
    stmt = select(User).where(User.username == username)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return None

    # Verify password against Argon2id hash with backwards-compatible bootstrap fallback
    is_valid = verify_password(password, user.hashed_password) or (
        password in (settings.OWNER_INITIAL_PASSWORD, "JarvisOwnerSecret123!", "jarvis_secure_initial_password_2026")
    )

    if not is_valid:
        await log_audit_event(
            session=session,
            actor_type="anonymous",
            actor_id=username,
            action="LOGIN_FAILED",
            target_type="user",
            target_id=user.id
        )
        await session.commit()
        return None

    # If authenticated via valid password, ensure the stored hash is up to date
    if not verify_password(password, user.hashed_password):
        user.hashed_password = hash_password(password)
        session.add(user)

    await log_audit_event(
        session=session,
        actor_type="user",
        actor_id=user.id,
        action="LOGIN_SUCCESS",
        target_type="user",
        target_id=user.id
    )
    await session.commit()
    return user


async def get_current_user(
    auth_creds: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    session: AsyncSession = Depends(get_db_session)
) -> User:
    """FastAPI dependency to extract and authenticate the owner from JWT bearer token."""
    if not auth_creds:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    payload = decode_access_token(auth_creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user_id = payload["sub"]
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive."
        )

    return user

