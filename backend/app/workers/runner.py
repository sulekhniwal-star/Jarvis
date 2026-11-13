"""
Project Jarvis — Sandboxed Execution Runner.
Executes vetted commands inside an isolated filesystem workspace with strict timeouts
and no shell expansion.
"""

import asyncio
from pathlib import Path
from typing import Any

import structlog

from app.workers.command_policy import validate_and_tokenize_command
from app.workers.filesystem import SandboxedFilesystem
from app.workers.test_parser import parse_test_results

logger = structlog.get_logger()


class ExecutionResult:
    def __init__(
        self, command: str, exit_code: int, stdout: str, stderr: str, duration_seconds: float
    ):
        self.command = command
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.duration_seconds = duration_seconds


class LocalSandboxRunner:
    def __init__(self, workspace_root: Path, timeout_seconds: int = 30):
        self.fs = SandboxedFilesystem(workspace_root)
        self.timeout_seconds = timeout_seconds

    async def execute_command(self, command_line: str) -> ExecutionResult:
        """
        Tokenizes command, validates security policy, and executes with timeout.
        Guarantees shell=False to prevent shell injection.
        """
        tokens = validate_and_tokenize_command(command_line)
        executable = tokens[0]
        args = tokens[1:]

        start_time = asyncio.get_event_loop().time()
        proc = None
        try:
            proc = await asyncio.create_subprocess_exec(
                executable,
                *args,
                cwd=str(self.fs.workspace_root),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                proc.communicate(), timeout=self.timeout_seconds
            )
            duration = asyncio.get_event_loop().time() - start_time
            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            return ExecutionResult(
                command=command_line,
                exit_code=proc.returncode if proc.returncode is not None else 0,
                stdout=stdout,
                stderr=stderr,
                duration_seconds=duration,
            )
        except TimeoutError:
            duration = asyncio.get_event_loop().time() - start_time
            if proc is not None:
                try:
                    proc.kill()
                except Exception:
                    pass
            return ExecutionResult(
                command=command_line,
                exit_code=124,  # Standard timeout exit code
                stdout="",
                stderr=f"Command timed out after {self.timeout_seconds} seconds.",
                duration_seconds=duration,
            )
        except FileNotFoundError as fnf_err:
            duration = asyncio.get_event_loop().time() - start_time
            return ExecutionResult(
                command=command_line,
                exit_code=127,
                stdout="",
                stderr=f"Executable '{executable}' not found: {fnf_err}",
                duration_seconds=duration,
            )
        except Exception as exec_err:
            duration = asyncio.get_event_loop().time() - start_time
            return ExecutionResult(
                command=command_line,
                exit_code=1,
                stdout="",
                stderr=f"Execution error: {exec_err}",
                duration_seconds=duration,
            )

    async def run_tests(self, test_command: str = "pytest -v") -> dict[str, Any]:
        """Runs test command and parses results honestly."""
        res = await self.execute_command(test_command)
        parsed = parse_test_results(res.exit_code, res.stdout, res.stderr)
        parsed["duration_seconds"] = res.duration_seconds
        return parsed
