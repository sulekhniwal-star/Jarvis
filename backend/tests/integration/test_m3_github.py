"""
Project Jarvis — Milestone 3 GitHub Integration & Acceptance Test Suite.
Verifies RS256 GitHub App JWT generation, strict repository access isolation,
branch creation with protected branch guards, PR creation with test evidence,
and cryptographic webhook HMAC-SHA256 signature verification.
"""

import hashlib
import hmac
import json

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app.api.v1.webhooks import verify_github_signature
from app.core.config import settings
from app.models.audit import AuditEvent
from app.models.task import Task
from app.services.github_app_auth import generate_github_app_jwt
from app.services.github_service import GitHubService
from sqlalchemy import select
from tests.conftest import test_session_factory as db_session_factory


@pytest.fixture(scope="module")
def rsa_keypair():
    """Generates an ephemeral 2048-bit RSA keypair for testing GitHub App JWTs."""
    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")

    public_pem = (
        private_key.public_key()
        .public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        )
        .decode("utf-8")
    )

    return private_pem, public_pem


def test_github_app_jwt_generation(rsa_keypair):
    """Verify RS256 JWT generation with valid claims and cryptographic signature."""
    private_pem, public_pem = rsa_keypair
    app_id = "jarvis-app-9876"

    token = generate_github_app_jwt(
        app_id=app_id, private_key_pem=private_pem, expiration_minutes=10
    )
    assert token is not None

    # Decode and verify with public key
    decoded = jwt.decode(token, public_pem, algorithms=["RS256"])
    assert decoded["iss"] == app_id
    assert decoded["exp"] > decoded["iat"]


def test_repository_access_allowlist_enforcement():
    """
    CRITICAL ACCEPTANCE TEST:
    Verify that the GitHub service strictly blocks access to unauthorized repositories.
    """
    allowed_repo = "my-private-org/allowed-app"
    unauthorized_repo = "other-org/top-secret-repo"

    service = GitHubService(token="test_token", allowed_repositories=[allowed_repo])

    # Allowed repo is permitted
    assert service.validate_repository_access(allowed_repo) is True

    # Unauthorized repo is strictly denied
    assert service.validate_repository_access(unauthorized_repo) is False


@pytest.mark.asyncio
async def test_protected_branch_guard():
    """Verify that the service strictly rejects creating or targeting protected branches."""
    service = GitHubService(token="test_token", allowed_repositories=["my-org/my-repo"])

    with pytest.raises(HTTPException) as exc_info:
        await service.create_branch(
            repository="my-org/my-repo",
            branch_name="main",  # Protected branch forbidden!
            base_sha="abcdef123456",
        )
    assert exc_info.value.status_code == 400
    assert "protected branch 'main' is forbidden" in exc_info.value.detail


@pytest.mark.asyncio
async def test_pull_request_creation_with_test_evidence():
    """
    CRITICAL ACCEPTANCE TEST:
    Verify Pull Request creation generates structured markdown containing honest test evidence.
    """
    captured_requests = []

    def mock_transport_handler(request: httpx.Request) -> httpx.Response:
        captured_requests.append(request)
        if "/pulls" in str(request.url):
            return httpx.Response(
                status_code=201,
                json={
                    "id": 101,
                    "number": 42,
                    "html_url": "https://github.com/my-org/my-repo/pull/42",
                    "title": "Fix memory leak in buffer pool",
                    "state": "open",
                },
            )
        return httpx.Response(status_code=404)

    mock_client = httpx.AsyncClient(transport=httpx.MockTransport(mock_transport_handler))
    service = GitHubService(
        token="ghs_mock_token_12345",
        allowed_repositories=["my-org/my-repo"],
        http_client=mock_client,
    )

    test_evidence = {"passed": True, "exit_code": 0, "output": "5 passed, 0 failed in 0.42s"}

    pr = await service.create_pull_request(
        repository="my-org/my-repo",
        title="Fix memory leak in buffer pool",
        head_branch="jarvis/task-001",
        base_branch="main",
        task_id="task-uuid-001",
        test_evidence=test_evidence,
        changes_summary="Patched memory deallocation in buffer_pool.py",
    )

    assert pr["number"] == 42
    assert pr["html_url"] == "https://github.com/my-org/my-repo/pull/42"

    # Inspect the captured HTTP payload sent to GitHub
    assert len(captured_requests) == 1
    sent_payload = json.loads(captured_requests[0].content)
    assert sent_payload["head"] == "jarvis/task-001"
    assert "✅ PASSED (Exit code: `0`)" in sent_payload["body"]
    assert "5 passed, 0 failed in 0.42s" in sent_payload["body"]
    assert "Merging and production release require explicit human approval" in sent_payload["body"]


def test_github_webhook_hmac_signature_validation():
    """Verify cryptographic HMAC-SHA256 signature verification on GitHub webhooks."""
    secret = "my_super_secret_webhook_token_2026"
    raw_payload = b'{"action": "opened", "issue": {"number": 1}}'

    # Compute valid signature
    valid_digest = hmac.new(
        secret.encode("utf-8"), msg=raw_payload, digestmod=hashlib.sha256
    ).hexdigest()
    valid_header = f"sha256={valid_digest}"

    # Verify matching signature passes
    assert verify_github_signature(raw_payload, valid_header, secret) is True

    # Tampered payload fails
    tampered_payload = b'{"action": "opened", "issue": {"number": 999}}'
    assert verify_github_signature(tampered_payload, valid_header, secret) is False

    # Invalid secret fails
    assert verify_github_signature(raw_payload, valid_header, "wrong_secret") is False

    # Missing or malformed header fails
    assert verify_github_signature(raw_payload, "invalid_header", secret) is False


@pytest.mark.asyncio
async def test_github_issue_opened_webhook_dispatches_task(client):
    """
    Verify that an incoming GitHub 'issues.opened' webhook automatically
    dispatches an autonomous task in Jarvis and logs an audit event.
    """
    secret = settings.GITHUB_WEBHOOK_SECRET or "development_test_webhook_secret_key"
    payload = {
        "action": "opened",
        "repository": {"full_name": "sulekhniwal-star/job-automation"},
        "issue": {
            "number": 42,
            "title": "Fix crash on job scraper pagination",
            "body": "The job scraper crashes with index error when pagination exceeds 10 pages.",
            "labels": [{"name": "bug"}, {"name": "jarvis"}],
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = "sha256=" + hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256).hexdigest()

    response = await client.post(
        "/api/v1/webhooks/github",
        content=raw_body,
        headers={
            "X-Hub-Signature-256": signature,
            "X-GitHub-Event": "issues",
            "X-GitHub-Delivery": "delivery-uuid-001",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "processed"
    assert res_data["event"] == "issues"
    assert res_data["action"] == "opened"
    assert res_data["task_id"] is not None

    task_id = res_data["task_id"]
    async with db_session_factory() as session:
        task = await session.get(Task, task_id)
        assert task is not None
        assert "[ISSUE #42]" in task.title
        assert "sulekhniwal-star/job-automation" in task.title
        assert task.created_by == "github_automation"
        assert task.priority == "HIGH"
        assert task.idempotency_key == "gh-issue-sulekhniwal-star/job-automation-42"

        # Verify audit log
        stmt = select(AuditEvent).where(AuditEvent.action == "GITHUB_EVENT_ISSUES")
        result = await session.execute(stmt)
        audit_events = result.scalars().all()
        assert len(audit_events) >= 1
        assert any(
            (json.loads(e.metadata_json) if isinstance(e.metadata_json, str) else (e.metadata_json or {})).get("delivery_id") == "delivery-uuid-001"
            for e in audit_events
        )


@pytest.mark.asyncio
async def test_github_issue_comment_mention_dispatches_task(client):
    """
    Verify that an issue comment mentioning '@jarvis' triggers an autonomous task dispatch.
    """
    secret = settings.GITHUB_WEBHOOK_SECRET or "development_test_webhook_secret_key"
    payload = {
        "action": "created",
        "repository": {"full_name": "sulekhniwal-star/fitkarma-website"},
        "issue": {
            "number": 88,
            "title": "Optimize responsive layout on mobile",
        },
        "comment": {
            "id": 55512,
            "body": "Hey @jarvis please fix this mobile header overflow issue.",
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = "sha256=" + hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256).hexdigest()

    response = await client.post(
        "/api/v1/webhooks/github",
        content=raw_body,
        headers={
            "X-Hub-Signature-256": signature,
            "X-GitHub-Event": "issue_comment",
            "X-GitHub-Delivery": "delivery-uuid-002",
            "Content-Type": "application/json",
        },
    )

    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "processed"
    assert res_data["task_id"] is not None

    async with db_session_factory() as session:
        task = await session.get(Task, res_data["task_id"])
        assert task is not None
        assert "[COMMENT FIX #88]" in task.title
        assert task.idempotency_key == "gh-comment-55512"


@pytest.mark.asyncio
async def test_github_issue_webhook_idempotency(client):
    """
    Verify duplicate deliveries of the same GitHub event return the existing task without duplicate creation.
    """
    secret = settings.GITHUB_WEBHOOK_SECRET or "development_test_webhook_secret_key"
    payload = {
        "action": "opened",
        "repository": {"full_name": "sulekhniwal-star/pocketbase-server"},
        "issue": {
            "number": 19,
            "title": "Add CORS whitelist for admin dashboard",
            "body": "Need CORS config for local dev.",
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    signature = "sha256=" + hmac.new(secret.encode("utf-8"), msg=raw_body, digestmod=hashlib.sha256).hexdigest()

    headers = {
        "X-Hub-Signature-256": signature,
        "X-GitHub-Event": "issues",
        "X-GitHub-Delivery": "delivery-uuid-003",
        "Content-Type": "application/json",
    }

    res1 = await client.post("/api/v1/webhooks/github", content=raw_body, headers=headers)
    assert res1.status_code == 200
    task_id_1 = res1.json()["task_id"]

    res2 = await client.post("/api/v1/webhooks/github", content=raw_body, headers=headers)
    assert res2.status_code == 200
    task_id_2 = res2.json()["task_id"]

    assert task_id_1 == task_id_2

