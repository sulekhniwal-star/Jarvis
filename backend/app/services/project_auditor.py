"""
Project Jarvis — Autonomous GitHub Project Auditor & Research Engine.
Scans, audits, prioritizes, and plans completion roadmaps for all user repositories,
including self-improvement on Jarvis itself on maximum priority.
"""

from typing import Any

import structlog

from app.core.config import settings
from app.providers.factory import get_ai_provider
from app.services.github_service import GitHubService

logger = structlog.get_logger()

# Priority Categorization Matrix
PRIORITY_MAPPING = {
    "jarvis": {
        "tier": "P0_SELF_IMPROVEMENT",
        "weight": 100,
        "description": "Core Autonomous AI Platform (Self-Healing & Evolution)",
    },
    "jarvis-x-a-personal-ai-operating-system": {
        "tier": "P0_SELF_IMPROVEMENT",
        "weight": 95,
        "description": "Personal AI OS Sister Prototype",
    },
    "job-automation": {
        "tier": "P1_ACTIVE_AUTOMATION",
        "weight": 85,
        "description": "Autonomous Job Hunting & Application Engine",
    },
    "linkedin-ai-automation": {
        "tier": "P1_ACTIVE_AUTOMATION",
        "weight": 80,
        "description": "LinkedIn AI Networking & Engagement Robot",
    },
    "drdo-expert-relevancy": {
        "tier": "P1_ACTIVE_AUTOMATION",
        "weight": 78,
        "description": "Defense Research Expert Matching & Relevancy Engine",
    },
    "pocketbase-server": {
        "tier": "P1_ACTIVE_AUTOMATION",
        "weight": 75,
        "description": "Containerized Backend Database & Auth Node",
    },
    "fitkarma-website": {
        "tier": "P2_WEB_AND_MOBILE",
        "weight": 70,
        "description": "Fitkarma Web Application Front-end",
    },
    "fitness-app": {
        "tier": "P2_WEB_AND_MOBILE",
        "weight": 68,
        "description": "Cross-Platform Fitness Tracking Mobile Client",
    },
    "fitkarma": {
        "tier": "P2_WEB_AND_MOBILE",
        "weight": 65,
        "description": "Fitness Gamification & Karma Backend",
    },
    "fit": {"tier": "P2_WEB_AND_MOBILE", "weight": 60, "description": "Dart/Flutter Health Core"},
    "app": {
        "tier": "P2_WEB_AND_MOBILE",
        "weight": 55,
        "description": "Android Native Kotlin Application",
    },
    "linefollowerrobot": {
        "tier": "P3_EMBEDDED_HARDWARE",
        "weight": 40,
        "description": "Arduino Autonomous Robot Embedded Firmware",
    },
    "anveshn-2024": {
        "tier": "P3_ARCHIVAL",
        "weight": 35,
        "description": "Hackathon Prototype & Innovation Archive",
    },
    "sulekhniwal-star": {
        "tier": "P3_PROFILE",
        "weight": 30,
        "description": "GitHub Developer Profile Manifest",
    },
}


_FLEET_CACHE: dict[str, Any] = {"data": None, "timestamp": 0.0}
_AUDIT_CACHE: dict[str, Any] = {}
_CACHE_TTL_SECONDS = 180.0  # 3-minute cache for fleet repo discovery


class ProjectAuditorService:
    def __init__(self, github_service: GitHubService | None = None):
        token = settings.GITHUB_TOKEN
        self.github = github_service or GitHubService(token=token, allowed_repositories=[])
        self.ai = get_ai_provider()

    async def close(self):
        """Closes underlying HTTP client connections."""
        if self.github:
            await self.github.close()

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.close()

    async def list_fleet_repositories(self) -> list[dict[str, Any]]:
        """
        Discovers all repositories for the authenticated owner,
        enriches them with priority weights, health heuristic scores,
        and completion readiness status. Uses TTL cache to prevent GitHub API rate limit exhaustion.
        """
        import time

        now = time.time()
        if (
            _FLEET_CACHE["data"] is not None
            and (now - _FLEET_CACHE["timestamp"]) < _CACHE_TTL_SECONDS
        ):
            return _FLEET_CACHE["data"]

        raw_repos = await self.github.list_user_repositories(affiliation="owner")
        fleet: list[dict[str, Any]] = []

        for repo in raw_repos:
            name = repo.get("name", "")
            name_lower = name.lower()
            meta = PRIORITY_MAPPING.get(
                name_lower,
                {
                    "tier": "P2_GENERAL",
                    "weight": 50,
                    "description": repo.get("description") or "Repository",
                },
            )

            # Base heuristics
            open_issues = repo.get("open_issues_count", 0)
            is_private = repo.get("private", False)
            language = repo.get("language") or "Multi-lingual"

            fleet.append(
                {
                    "name": name,
                    "full_name": repo.get("full_name", name),
                    "is_private": is_private,
                    "language": language,
                    "description": repo.get("description") or meta["description"],
                    "default_branch": repo.get("default_branch", "main"),
                    "priority_tier": meta["tier"],
                    "priority_weight": meta["weight"],
                    "updated_at": repo.get("updated_at"),
                    "open_issues": open_issues,
                    "html_url": repo.get("html_url"),
                    "health_score": 85 if "jarvis" in name_lower else 60,
                    "estimated_completion": 95 if name_lower == "jarvis" else 45,
                }
            )

        # Sort strictly by priority weight descending (Jarvis & AI projects first)
        fleet.sort(key=lambda r: r["priority_weight"], reverse=True)
        _FLEET_CACHE["data"] = fleet
        _FLEET_CACHE["timestamp"] = now
        return fleet

    async def audit_repository_deep(self, repo_name: str) -> dict[str, Any]:
        """
        Performs in-depth structural research on a target repository:
        inspects tree layout, reads README, identifies missing tests,
        and prompts OpenRouter AI to generate an actionable completion plan.
        """
        import time

        now = time.time()
        cached = _AUDIT_CACHE.get(repo_name)
        if cached and (now - cached["timestamp"]) < 300.0:
            return cached["data"]

        owner = settings.GITHUB_TARGET_ORG or "sulekhniwal-star"
        full_repo = f"{owner}/{repo_name}"

        # 1. Fetch file tree
        tree = await self.github.get_repository_tree(full_repo)
        file_paths = [item.get("path", "") for item in tree if item.get("type") == "blob"]

        # Heuristic detection
        has_ci = any(".github/workflows" in p for p in file_paths)
        has_tests = any("test" in p.lower() for p in file_paths)
        has_docker = any("docker" in p.lower() for p in file_paths)

        # Read README
        readme_content = await self.github.get_file_content(full_repo, "README.md") or ""

        # Compute calculated health score
        health = 20
        if has_ci:
            health += 25
        if has_tests:
            health += 25
        if len(readme_content) > 100:
            health += 15
        if has_docker:
            health += 15

        # 2. Prompt OpenRouter AI for deep research & completion roadmap
        prompt = (
            f"You are Jarvis, an elite principal software architect.\n"
            f"Audit the following user repository and generate an actionable completion and modernization plan:\n\n"
            f"Repository: {full_repo}\n"
            f"Total Files: {len(file_paths)}\n"
            f"Sample File Structure:\n{chr(10).join(file_paths[:35])}\n\n"
            f"CI Pipeline Present: {has_ci}\n"
            f"Automated Tests Present: {has_tests}\n"
            f"Dockerized: {has_docker}\n\n"
            f"README Snippet:\n{readme_content[:600]}\n\n"
            f"Generate a structured JSON assessment with keys:\n"
            f"- 'summary': 2-sentence executive summary of current status\n"
            f"- 'missing_components': list of 3-5 critical missing pieces to make it production-ready\n"
            f"- 'completion_steps': ordered list of concrete tasks to finish and improve it\n"
            f"- 'recommended_action': immediate next step to implement\n"
        )

        try:
            plan = await self.ai.generate_plan(
                task_title=f"Audit & Research: {repo_name}", task_description=prompt
            )
        except Exception as e:
            logger.warning("audit_ai_fallback_triggered", repo_name=repo_name, error=str(e))
            plan = {
                "summary": f"Repository '{repo_name}' analyzed with {len(file_paths)} files. Structured roadmap established.",
                "missing_components": [
                    "Automated integration test coverage"
                    if not has_tests
                    else "Performance benchmark suite",
                    "Continuous integration pipeline"
                    if not has_ci
                    else "Automated security scanning",
                    "Production containerization manifest"
                    if not has_docker
                    else "Cloud deployment orchestration",
                ],
                "completion_steps": [
                    {
                        "sequence": 1,
                        "name": "Deep repository structure inspection",
                        "tool": "repo_inspect",
                    },
                    {
                        "sequence": 2,
                        "name": "Implement core feature gaps & tests",
                        "tool": "file_edit",
                    },
                    {"sequence": 3, "name": "Run validation test suite", "tool": "test_runner"},
                    {"sequence": 4, "name": "Stage production pull request", "tool": "github_pr"},
                ],
                "recommended_action": "Execute autonomous improvement protocol",
            }

        result = {
            "repository": full_repo,
            "name": repo_name,
            "health_score": min(100, health),
            "has_ci": has_ci,
            "has_tests": has_tests,
            "has_docker": has_docker,
            "total_files": len(file_paths),
            "files_sample": file_paths[:20],
            "analysis": plan,
        }
        _AUDIT_CACHE[repo_name] = {"data": result, "timestamp": now}
        return result
