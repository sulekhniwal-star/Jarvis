"""
Project Jarvis — GitHub App Authentication Service.
Implements asymmetric RS256 JWT generation and short-lived installation access token acquisition.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
import httpx
from fastapi import HTTPException, status
from app.core.config import settings


def generate_github_app_jwt(
    app_id: str,
    private_key_pem: str,
    expiration_minutes: int = 10
) -> str:
    """Generates an RS256 signed JWT for authenticating as a GitHub App."""
    now = datetime.now(timezone.utc)
    # GitHub permits iat up to 60 seconds in the past to account for clock drift
    payload = {
        "iat": int((now - timedelta(seconds=60)).timestamp()),
        "exp": int((now + timedelta(minutes=expiration_minutes)).timestamp()),
        "iss": str(app_id),
    }

    try:
        return jwt.encode(payload, private_key_pem, algorithm="RS256")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate GitHub App JWT: {str(e)}"
        )


async def get_installation_access_token(
    installation_id: str,
    app_jwt: str,
    repository_names: Optional[list] = None,
    http_client: Optional[httpx.AsyncClient] = None
) -> Dict[str, Any]:
    """
    Exchanges GitHub App JWT for a repository-scoped installation access token (ghs_...).
    Token expires automatically after 60 minutes.
    """
    url = f"https://api.github.com/app/installations/{installation_id}/access_tokens"
    headers = {
        "Authorization": f"Bearer {app_jwt}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    payload: Dict[str, Any] = {}
    if repository_names:
        payload["repositories"] = repository_names

    client = http_client or httpx.AsyncClient()
    try:
        res = await client.post(url, headers=headers, json=payload, timeout=15.0)
        if res.status_code != 201:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"GitHub token exchange failed: {res.status_code} - {res.text}"
            )
        return res.json()
    finally:
        if not http_client:
            await client.aclose()

