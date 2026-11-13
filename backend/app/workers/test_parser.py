"""
Project Jarvis — Test Result Parser.
Provides honest evaluation of test output.
Never claims a test passed unless the exit code is 0 and output confirms assertions passed.
"""

import re
from typing import Any


def parse_test_results(exit_code: int, stdout: str, stderr: str) -> dict[str, Any]:
    """
    Parses test runner output (Pytest / unittest / npm test) into structured metrics.
    Strictly verifies exit_code == 0.
    """
    output = f"{stdout}\n{stderr}".strip()

    # Rule: Non-zero exit code ALWAYS means failure
    if exit_code != 0:
        # Extract failure trace if available
        failure_summary = "Test execution failed."
        for line in output.splitlines():
            if "FAILED" in line or "AssertionError" in line or "Error:" in line:
                failure_summary = line.strip()
                break

        return {
            "passed": False,
            "exit_code": exit_code,
            "summary": failure_summary,
            "raw_output": output,
            "tests_run": 0,
            "passed_count": 0,
            "failed_count": 1,
        }

    # Exit code is 0: verify positive evidence
    passed_match = re.search(r"(\d+)\s+passed", output, re.IGNORECASE)
    failed_match = re.search(r"(\d+)\s+failed", output, re.IGNORECASE)

    passed_count = int(passed_match.group(1)) if passed_match else 0
    failed_count = int(failed_match.group(1)) if failed_match else 0

    is_truly_passed = (failed_count == 0) and (passed_count > 0 or "ok" in output.lower())

    summary = (
        f"{passed_count} passed, {failed_count} failed (exit code: 0)"
        if passed_count
        else "Tests executed successfully (exit code: 0)"
    )

    return {
        "passed": is_truly_passed,
        "exit_code": 0,
        "summary": summary,
        "raw_output": output,
        "tests_run": passed_count + failed_count,
        "passed_count": passed_count,
        "failed_count": failed_count,
    }
