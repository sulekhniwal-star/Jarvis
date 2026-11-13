"""
Project Jarvis — Milestone 7 Supervised Self-Improvement Integration Tests.
Verifies read-only repository health inspection, protected security component guards,
and end-to-end self-enhancement workflows with mandatory human approval gating.
"""

import tempfile
from pathlib import Path

import pytest

from app.services.self_improvement import (
    ProtectedComponentViolation,
    SelfImprovementService,
)
from app.workers.runner import LocalSandboxRunner


def test_self_analysis_codebase_health():
    """
    CRITICAL ACCEPTANCE TEST (M7.1):
    Jarvis inspects its own codebase in read-only mode and discovers structure,
    identifying protected core security files.
    """
    repo_root = Path(__file__).resolve().parent.parent.parent  # f:\Javis\backend
    health = SelfImprovementService.analyze_codebase_health(repo_root)

    assert health["total_python_files"] > 15
    assert health["total_test_files"] >= 7
    assert health["protected_components_count"] >= 4
    assert health["health_status"] == "HEALTHY"

    # Verify protected security components are detected
    protected = health["protected_components"]
    assert any("security.py" in p for p in protected)
    assert any("command_policy.py" in p for p in protected)


def test_protected_component_modification_rejected():
    """
    CRITICAL SECURITY TEST (M7.2 / M7.3):
    Self-improvement workflows are strictly forbidden from modifying core security policies,
    kill switches, and approval services.
    """
    forbidden_targets = [
        "backend/app/core/security.py",
        "backend/app/workers/command_policy.py",
        "backend/app/services/approval_service.py",
        "backend/app/api/v1/system.py",
        "backend/app/workers/filesystem.py",
    ]

    for target in forbidden_targets:
        assert SelfImprovementService.is_protected_file(target) is True
        with pytest.raises(ProtectedComponentViolation, match="Security Policy Violation"):
            SelfImprovementService.validate_modification_target(target)


@pytest.mark.asyncio
async def test_end_to_end_supervised_self_improvement_workflow():
    """
    CRITICAL ACCEPTANCE TEST (M7.2 / M7.3):
    Executes an autonomous self-enhancement workflow on a sample module:
    1. Validates target is permitted (non-protected).
    2. Applies improved implementation in isolated workspace.
    3. Runs tests to verify zero regressions.
    4. Generates structured PR with verified evidence and mandatory human review requirement.
    """
    with tempfile.TemporaryDirectory() as temp_dir:
        workspace = Path(temp_dir)

        # 1. Create a module to improve: utils.py
        utils_py = workspace / "utils.py"
        utils_py.write_text(
            "def calculate_total(prices):\n    return sum(prices)\n", encoding="utf-8"
        )

        test_utils_py = workspace / "test_utils.py"
        test_utils_py.write_text(
            "import sys\n"
            "from pathlib import Path\n"
            "sys.path.insert(0, str(Path(__file__).parent))\n"
            "from utils import calculate_total\n\n"
            "def test_calculate_total():\n"
            "    assert calculate_total([10, 20, 30]) == 60\n"
            "    assert calculate_total([]) == 0\n",
            encoding="utf-8",
        )

        # 2. Validate target is non-protected
        SelfImprovementService.validate_modification_target("utils.py")

        # 3. Autonomous improvement: add type hints and input validation
        improved_code = (
            "from typing import Sequence\n\n"
            "def calculate_total(prices: Sequence[float]) -> float:\n"
            '    """Calculates sum with type hints and empty check."""\n'
            "    if not prices:\n"
            "        return 0.0\n"
            "    return float(sum(prices))\n"
        )

        runner = LocalSandboxRunner(workspace)
        runner.fs.write_file("utils.py", improved_code)

        # 4. Verify tests pass via runner using active python venv
        import sys

        test_cmd = f"{sys.executable} -m pytest test_utils.py"
        test_res = await runner.execute_command(test_cmd)
        assert test_res.exit_code == 0

        # 5. Generate Pull Request payload
        pr_payload = SelfImprovementService.prepare_pull_request_payload(
            branch_name="jarvis/self-improve-utils-typing",
            title="Add type hints and documentation to utils module",
            description="Enhanced `calculate_total` with PEP 484 type annotations.",
            changed_files=["utils.py"],
            test_passed=(test_res.exit_code == 0),
            test_output=test_res.stdout,
        )

        # 6. Verify PR enforcement rules
        assert pr_payload["requires_human_approval"] is True
        assert pr_payload["tests_verified"] is True
        assert "Human Review Required" in pr_payload["body"]
        assert "![Tests Passed]" in pr_payload["body"]
        assert "- `utils.py`" in pr_payload["body"]
