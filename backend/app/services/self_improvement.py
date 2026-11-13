"""
Project Jarvis — Supervised Self-Improvement Service.
Allows Jarvis to analyze its own repository, identify maintainability or test enhancements,
and generate self-improvement pull requests while strictly forbidding modifications to core security boundaries.
"""

from pathlib import Path
from typing import Any, Dict, List, Optional
import os
import re

from app.workers.command_policy import validate_and_tokenize_command
from app.workers.filesystem import SandboxedFilesystem, SecurityException
from app.workers.runner import LocalSandboxRunner
from app.workers.test_parser import parse_test_results

# Files that autonomous self-improvement workflows are NEVER permitted to modify
PROTECTED_CORE_COMPONENTS = {
    "app/core/security.py",
    "app/services/approval_service.py",
    "app/services/audit_service.py",
    "app/api/v1/system.py",
    "app/workers/command_policy.py",
    "app/workers/filesystem.py",
}


class ProtectedComponentViolation(Exception):
    """Raised when an autonomous agent attempts to modify a protected security file."""
    pass


class SelfImprovementService:
    """
    Coordinates read-only repository inspection and supervised self-enhancement workflows.
    """

    @staticmethod
    def is_protected_file(relative_path: str) -> bool:
        """Checks if a file belongs to the protected core security components."""
        norm = relative_path.replace("\\", "/").lstrip("/")
        return any(p in norm for p in PROTECTED_CORE_COMPONENTS)

    @staticmethod
    def analyze_codebase_health(repo_root: Path | str) -> Dict[str, Any]:
        """
        Performs read-only inspection of the repository.
        Returns metrics on file counts, test coverage inventory, and TODO annotations.
        """
        root = Path(repo_root).resolve()
        py_files: List[str] = []
        test_files: List[str] = []
        todo_items: List[Dict[str, Any]] = []
        protected_inventory: List[str] = []

        for p in root.rglob("*.py"):
            rel = str(p.relative_to(root)).replace("\\", "/")
            if ".venv" in rel or "__pycache__" in rel:
                continue

            py_files.append(rel)
            if "test_" in p.name:
                test_files.append(rel)

            if SelfImprovementService.is_protected_file(rel):
                protected_inventory.append(rel)

            try:
                content = p.read_text(encoding="utf-8", errors="ignore")
                for line_idx, line in enumerate(content.splitlines(), start=1):
                    if "# TODO" in line or "# FIXME" in line:
                        todo_items.append({
                            "file": rel,
                            "line": line_idx,
                            "annotation": line.strip()
                        })
            except Exception:
                pass

        return {
            "total_python_files": len(py_files),
            "total_test_files": len(test_files),
            "protected_components_count": len(protected_inventory),
            "protected_components": protected_inventory,
            "open_annotations_count": len(todo_items),
            "open_annotations": todo_items[:10],
            "health_status": "HEALTHY" if len(test_files) >= 5 else "NEEDS_TESTS"
        }

    @staticmethod
    def validate_modification_target(target_path: str) -> None:
        """
        Validates that a proposed file modification target does NOT touch protected core systems.
        Raises ProtectedComponentViolation if target is restricted.
        """
        if SelfImprovementService.is_protected_file(target_path):
            raise ProtectedComponentViolation(
                f"Security Policy Violation: Autonomous self-improvement cannot modify "
                f"protected security component '{target_path}'. Changes require human-authored commits."
            )

    @staticmethod
    def prepare_pull_request_payload(
        branch_name: str,
        title: str,
        description: str,
        changed_files: List[str],
        test_passed: bool,
        test_output: str
    ) -> Dict[str, Any]:
        """
        Generates structured Pull Request data requiring human approval before merge.
        Embeds honest test execution evidence.
        """
        badge = "![Tests Passed](https://img.shields.io/badge/Tests-PASSED-brightgreen)" if test_passed else "![Tests Failed](https://img.shields.io/badge/Tests-FAILED-red)"

        body = (
            f"## Autonomous Self-Improvement Proposal\n\n"
            f"**Status:** {badge}\n\n"
            f"### Rationale\n{description}\n\n"
            f"### Modified Files\n"
            + "\n".join(f"- `{f}`" for f in changed_files)
            + f"\n\n### Verification Evidence\n"
            f"```text\n{test_output[-1000:] if len(test_output) > 1000 else test_output}\n```\n\n"
            f"> [!IMPORTANT]\n"
            f"> **Human Review Required:** In accordance with `SELF_IMPROVEMENT.md`, this pull request "
            f"cannot be automatically merged. An authenticated human owner must review and approve."
        )

        return {
            "title": f"[Jarvis Self-Improvement] {title}",
            "branch": branch_name,
            "base": "main",
            "body": body,
            "requires_human_approval": True,
            "tests_verified": test_passed
        }
