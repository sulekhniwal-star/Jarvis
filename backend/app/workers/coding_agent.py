"""
Project Jarvis — Autonomous Coding Agent Runtime.
Coordinates file inspection, code edits, test execution, and diagnostic self-healing loops
inside an isolated sandbox runner.
"""

from typing import Any, Dict, List, Optional
import structlog

from app.providers.base import AIProvider
from app.workers.runner import LocalSandboxRunner

logger = structlog.get_logger()


class CodingAgent:
    def __init__(self, runner: LocalSandboxRunner, ai_provider: AIProvider):
        self.runner = runner
        self.provider = ai_provider

    async def execute_task(
        self,
        task_title: str,
        task_description: str,
        test_command: str = "pytest",
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Executes an end-to-end coding workflow:
        1. Inspects workspace files.
        2. Generates plan & patch.
        3. Writes changes into sandbox.
        4. Runs test suite and parses evidence.
        5. If failed, executes diagnostic retry loop.
        6. Compiles honest evidence report.
        """
        logs: List[str] = []
        logs.append(f"[CodingAgent] Starting execution for task: '{task_title}'")

        # 1. Workspace inspection
        files = self.runner.fs.list_files()
        logs.append(f"[CodingAgent] Discovered {len(files)} files in sandboxed workspace.")

        # Read context
        context: Dict[str, str] = {}
        for f in files[:5]:  # Scope first few files
            try:
                context[f] = self.runner.fs.read_file(f)
            except Exception:
                pass

        # 2. Generate solution
        solution = await self.provider.generate_code_solution(task_description, context)
        changes = solution.get("changes", [])
        logs.append(f"[CodingAgent] Applying {len(changes)} file changes...")

        # 3. Apply changes into sandbox
        for change in changes:
            path = change.get("file_path")
            content = change.get("content", "")
            if path and content:
                self.runner.fs.write_file(path, content)
                logs.append(f"[CodingAgent] Wrote {len(content)} bytes to '{path}'")

        # 4. Run tests
        logs.append(f"[CodingAgent] Running test command: '{test_command}'")
        test_result = await self.runner.run_tests(test_command)
        logs.append(f"[CodingAgent] Test result: {test_result['summary']}")

        retries_used = 0
        # 5. Diagnostic retry loop
        while not test_result["passed"] and retries_used < max_retries:
            retries_used += 1
            logs.append(f"[CodingAgent] Tests failed. Starting diagnostic retry {retries_used}/{max_retries}...")

            # In later provider integration, error trace is fed to provider:
            # retry_solution = await self.provider.generate_code_solution(f"Fix this test error: {test_result['raw_output']}")
            # Re-test
            test_result = await self.runner.run_tests(test_command)
            logs.append(f"[CodingAgent] Retry {retries_used} result: {test_result['summary']}")

        # 6. Final summary
        status_label = "COMPLETED" if test_result["passed"] else "FAILED"
        logs.append(f"[CodingAgent] Finished with status: {status_label}")

        return {
            "status": status_label,
            "test_evidence": test_result,
            "retries_used": retries_used,
            "files_modified": [c.get("file_path") for c in changes],
            "execution_logs": logs
        }

