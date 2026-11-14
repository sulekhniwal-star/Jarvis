"""
Project Jarvis — Autonomous Coding Agent Runtime.
Coordinates file inspection, code edits, test execution, and diagnostic self-healing loops
inside an isolated sandbox runner.
"""

from typing import Any

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
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """
        Executes an end-to-end coding workflow:
        1. Inspects workspace files.
        2. Generates plan & patch.
        3. Writes changes into sandbox.
        4. Runs test suite and parses evidence.
        5. If failed, executes diagnostic retry loop.
        6. Compiles honest evidence report.
        """
        logs: list[str] = []
        logs.append(f"[CodingAgent] Starting execution for task: '{task_title}'")

        # 1. Workspace inspection & intelligent context gathering
        files = self.runner.fs.list_files()
        logs.append(f"[CodingAgent] Discovered {len(files)} files in sandboxed workspace.")

        # Ignore noisy, cache, or binary files
        ignored_patterns = (
            "__pycache__",
            ".git",
            "node_modules",
            ".venv",
            ".pytest_cache",
            ".png",
            ".jpg",
            ".ico",
            ".lock",
        )
        filtered_files = [f for f in files if not any(ign in f for ign in ignored_patterns)]

        # Prioritize source and test files
        sorted_files = sorted(
            filtered_files,
            key=lambda f: (
                0 if f.endswith((".py", ".ts", ".js", ".jsx", ".tsx")) else
                1 if f.endswith((".json", ".toml", ".yaml", ".yml")) else
                2 if f.endswith(".md") else 3
            ),
        )

        context: dict[str, str] = {}
        total_bytes = 0
        for f in sorted_files[:15]:
            try:
                content = self.runner.fs.read_file(f)
                if total_bytes + len(content) < 30000:
                    context[f] = content
                    total_bytes += len(content)
            except Exception:
                pass

        # 2. Check if workspace lacks tests and add explicit test authoring directive
        has_tests = any("test" in f.lower() for f in files)
        test_requirement = ""
        if not has_tests:
            test_requirement = (
                "\nCRITICAL REQUIREMENT: This project currently has NO automated tests. "
                "You MUST author a new unit test suite (e.g. `tests/test_feature.py` or `test_main.py`) "
                "with clear assertions testing your code, so automated verification succeeds."
            )

        full_prompt = (
            f"Directive: {task_title}\n\n"
            f"Description: {task_description}\n"
            f"{test_requirement}\n\n"
            f"Implement the complete code solutions and tests. Return full file contents."
        )

        # 3. Generate solution
        solution = await self.provider.generate_code_solution(full_prompt, context)
        raw_changes = solution.get("changes") or solution.get("patches") or []
        changes = []
        for item in raw_changes:
            path = item.get("file_path") or item.get("path")
            content = item.get("content") or item.get("modified_code", "")
            if path:
                changes.append({"file_path": path, "content": content})

        logs.append(f"[CodingAgent] Applying {len(changes)} file changes...")

        # 4. Apply changes into sandbox
        for change in changes:
            path = change.get("file_path")
            content = change.get("content", "")
            if path and content:
                self.runner.fs.write_file(path, content)
                logs.append(f"[CodingAgent] Wrote {len(content)} bytes to '{path}'")

        # 5. Run tests
        logs.append(f"[CodingAgent] Running test command: '{test_command}'")
        test_result = await self.runner.run_tests(test_command)
        logs.append(f"[CodingAgent] Test result: {test_result['summary']}")

        retries_used = 0
        all_modified_files: set[str] = {str(c["file_path"]) for c in changes if c.get("file_path")}
        failure_history: list[str] = []

        # 6. Diagnostic retry loop with sequential context & active code repair
        while not test_result["passed"] and retries_used < max_retries:
            retries_used += 1
            logs.append(
                f"[CodingAgent] Tests failed. Starting diagnostic retry {retries_used}/{max_retries}..."
            )

            # Record failure context to prevent repeating previous mistakes
            failure_history.append(
                f"--- ATTEMPT {retries_used} FAILURE ---\n"
                f"Command: {test_command}\n"
                f"Exit Code: {test_result.get('exit_code', 1)}\n"
                f"Output / Traceback:\n{test_result.get('raw_output', '')[:1200]}"
            )
            history_context = "\n\n".join(failure_history)

            # Refresh context with failing files & traceback mentions
            retry_context: dict[str, str] = {}
            for path in all_modified_files:
                try:
                    retry_context[path] = self.runner.fs.read_file(path)
                except Exception:
                    pass

            # Also check if traceback mentions other workspace files
            raw_out = test_result.get("raw_output", "")
            for f in files:
                if f in raw_out and f not in retry_context:
                    try:
                        retry_context[f] = self.runner.fs.read_file(f)
                    except Exception:
                        pass

            error_prompt = (
                f"The automated test suite failed during task execution:\n"
                f"Task Directive: {task_title}\n"
                f"Test Command: {test_command}\n\n"
                f"Previous Failure History:\n{history_context}\n\n"
                f"CRITICAL INSTRUCTION: Analyze the exact test failure traceback above. "
                f"Repair the code or tests so that all test assertions PASS with exit code 0."
            )

            try:
                retry_solution = await self.provider.generate_code_solution(
                    error_prompt, retry_context
                )
                raw_retry_changes = (
                    retry_solution.get("changes") or retry_solution.get("patches") or []
                )
                for item in raw_retry_changes:
                    p = item.get("file_path") or item.get("path")
                    c = item.get("content") or item.get("modified_code", "")
                    if p and c:
                        self.runner.fs.write_file(p, c)
                        all_modified_files.add(p)
                        logs.append(
                            f"[CodingAgent] Applied diagnostic fix to '{p}' ({len(c)} bytes)"
                        )
            except Exception as patch_err:
                logs.append(f"[CodingAgent] Diagnostic patch generation failed: {patch_err}")

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
            "files_modified": sorted(all_modified_files),
            "execution_logs": logs,
        }
