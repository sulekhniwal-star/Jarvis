"""
Project Jarvis — GitHub Operations Service.
Manages repository access validation, branch creation, commits,
and pull request generation with structured test evidence.
"""

from typing import Any, Dict, List, Optional
import httpx
from fastapi import HTTPException, status
from app.services.audit_service import log_audit_event


class GitHubService:
    def __init__(
        self,
        token: str,
        allowed_repositories: Optional[List[str]] = None,
        http_client: Optional[httpx.AsyncClient] = None
    ):
        self.token = token
        # Standardized allowed repositories list (e.g. ["my-org/allowed-repo"])
        self.allowed_repositories = [r.lower() for r in (allowed_repositories or [])]
        self._client = http_client or httpx.AsyncClient(
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=20.0
        )
        self._owns_client = http_client is None

    async def close(self):
        if self._owns_client:
            await self._client.aclose()

    def validate_repository_access(self, repository: str) -> bool:
        """
        Enforces repository-level isolation.
        Allows pre-authorized repositories and user's configured GitHub target org.
        """
        from app.core.config import settings
        rep_clean = repository.lower().strip()
        if self.allowed_repositories and rep_clean in self.allowed_repositories:
            return True
        target_org = (settings.GITHUB_TARGET_ORG or "sulekhniwal-star").lower()
        if rep_clean.startswith(f"{target_org}/"):
            return True
        return False

    async def get_default_branch_sha(self, repository: str, default_branch: str = "main") -> str:
        """Retrieves the commit SHA of the base branch head."""
        if not self.validate_repository_access(repository):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Repository '{repository}' is not authorized."
            )

        url = f"https://api.github.com/repos/{repository}/git/ref/heads/{default_branch}"
        res = await self._client.get(url)
        if res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch base ref from GitHub: {res.status_code} - {res.text}"
            )
        data = res.json()
        return data["object"]["sha"]

    async def create_branch(
        self,
        repository: str,
        branch_name: str,
        base_branch: str = "main",
        base_sha: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a dedicated task feature branch (e.g. jarvis/task-123)."""
        if not self.validate_repository_access(repository):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Repository '{repository}' is not authorized."
            )

        # Do not allow creating branch named 'main' or 'master'
        if branch_name.lower() in ["main", "master", "develop"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Direct creation or push to protected branch '{branch_name}' is forbidden."
            )

        sha = base_sha or await self.get_default_branch_sha(repository, base_branch)
        url = f"https://api.github.com/repos/{repository}/git/refs"
        payload = {
            "ref": f"refs/heads/{branch_name}",
            "sha": sha
        }

        res = await self._client.post(url, json=payload)
        if res.status_code not in (201, 200):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create branch on GitHub: {res.status_code} - {res.text}"
            )
        return res.json()

    async def create_or_update_file(
        self,
        repository: str,
        path: str,
        content: str,
        commit_message: str,
        branch: str,
        sha: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates or updates a file on a target branch."""
        import base64
        if not self.validate_repository_access(repository):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Repository '{repository}' is not authorized."
            )

        url = f"https://api.github.com/repos/{repository}/contents/{path}"
        content_b64 = base64.b64encode(content.encode("utf-8")).decode("utf-8")
        payload: Dict[str, Any] = {
            "message": commit_message,
            "content": content_b64,
            "branch": branch
        }
        if sha:
            payload["sha"] = sha
        else:
            check_res = await self._client.get(url, params={"ref": branch})
            if check_res.status_code == 200:
                payload["sha"] = check_res.json().get("sha")

        res = await self._client.put(url, json=payload)
        if res.status_code not in (200, 201):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to commit file '{path}' to branch '{branch}': {res.status_code} - {res.text}"
            )
        return res.json()

    async def create_pull_request(
        self,
        repository: str,
        title: str,
        head_branch: str,
        base_branch: str = "main",
        task_id: Optional[str] = None,
        test_evidence: Optional[Dict[str, Any]] = None,
        changes_summary: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Creates a Pull Request with structured markdown body containing
        plan summary, changed files, and honest test execution results.
        """
        if not self.validate_repository_access(repository):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied: Repository '{repository}' is not authorized."
            )

        # Construct structured pull request description
        evidence_text = "No test run recorded."
        if test_evidence:
            passed = test_evidence.get("passed", False)
            output = test_evidence.get("output", "")
            exit_code = test_evidence.get("exit_code", 0)
            status_badge = "✅ PASSED" if passed else "❌ FAILED"
            evidence_text = f"**Status:** {status_badge} (Exit code: `{exit_code}`)\n```text\n{output}\n```"

        body = (
            f"## Autonomous Task PR — Project Jarvis\n\n"
            f"**Task ID:** `{task_id or 'N/A'}`\n"
            f"**Head Branch:** `{head_branch}` ➡️ **Base Branch:** `{base_branch}`\n\n"
            f"### Changes Summary\n"
            f"{changes_summary or 'Targeted implementation according to task requirements.'}\n\n"
            f"### Verification & Test Evidence\n"
            f"{evidence_text}\n\n"
            f"---\n"
            f"*Autonomous execution via Project Jarvis. Merging and production release require explicit human approval.*"
        )

        url = f"https://api.github.com/repos/{repository}/pulls"
        payload = {
            "title": title,
            "head": head_branch,
            "base": base_branch,
            "body": body,
            "maintainer_can_modify": True,
        }

        res = await self._client.post(url, json=payload)
        if res.status_code not in (201, 200):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to create Pull Request: {res.status_code} - {res.text}"
            )
        return res.json()

    async def list_user_repositories(self, affiliation: str = "owner") -> List[Dict[str, Any]]:
        """Lists all repositories accessible to the authenticated GitHub token."""
        url = "https://api.github.com/user/repos"
        params = {"per_page": 100, "affiliation": affiliation, "sort": "updated"}
        res = await self._client.get(url, params=params)
        if res.status_code != 200:
            return []
        return res.json()

    async def get_repository_tree(
        self,
        repository: str,
        default_branch: str = "main"
    ) -> List[Dict[str, Any]]:
        """Fetches recursive tree of repository files."""
        url = f"https://api.github.com/repos/{repository}/git/trees/{default_branch}"
        res = await self._client.get(url, params={"recursive": "1"})
        if res.status_code != 200:
            return []
        data = res.json()
        return data.get("tree", [])

    async def get_file_content(
        self,
        repository: str,
        path: str,
        ref: Optional[str] = None
    ) -> Optional[str]:
        """Fetches raw or base64 decoded file content from GitHub repository."""
        import base64
        url = f"https://api.github.com/repos/{repository}/contents/{path}"
        params = {}
        if ref:
            params["ref"] = ref
        res = await self._client.get(url, params=params)
        if res.status_code != 200:
            return None
        data = res.json()
        content_b64 = data.get("content")
        if content_b64:
            try:
                return base64.b64decode(content_b64).decode("utf-8", errors="replace")
            except Exception:
                return None
        return None

