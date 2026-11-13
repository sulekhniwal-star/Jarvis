"""
Project Jarvis — Command Execution Policy & Allowlist.
Validates process arguments outside the model, rejecting shell injection,
command chaining, and unauthorized network or system utilities.
"""

import shlex

from fastapi import HTTPException, status

ALLOWED_EXECUTABLES = {"pytest", "python", "git", "npm", "pnpm", "node", "ruff", "flake8", "mypy"}

FORBIDDEN_PATTERNS = {
    "curl",
    "wget",
    "nc",
    "netcat",
    "ncat",
    "bash",
    "sh",
    "rm",
    "del",
    "chmod",
    "chown",
    "powershell",
    "cmd",
    "/dev/tcp",
    "/dev/udp",
}

FORBIDDEN_SHELL_CHARACTERS = {";", "&&", "||", "|", "`", "$", ">", "<", "\n"}


class CommandPolicyViolation(HTTPException):
    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def validate_and_tokenize_command(command_line: str) -> list[str]:
    """
    Parses a command string into tokenized arguments.
    Enforces allowlist and forbids shell meta-characters.
    """
    if not command_line or not command_line.strip():
        raise CommandPolicyViolation("Empty command is not allowed.")

    # Check for shell chaining / redirection meta-characters
    for char in FORBIDDEN_SHELL_CHARACTERS:
        if char in command_line:
            raise CommandPolicyViolation(
                f"Shell meta-character '{char}' is forbidden to prevent command injection."
            )

    try:
        tokens = shlex.split(command_line, posix=False)
    except Exception as e:
        raise CommandPolicyViolation(f"Malformed command line: {e!s}")

    if not tokens:
        raise CommandPolicyViolation("Command produced no executable tokens.")

    executable = tokens[0].lower().replace(".exe", "").split("/")[-1].split("\\")[-1]

    if executable not in ALLOWED_EXECUTABLES:
        raise CommandPolicyViolation(
            f"Executable '{executable}' is not in the approved worker allowlist: {sorted(ALLOWED_EXECUTABLES)}"
        )

    # Secondary check against arguments containing forbidden tools
    for token in tokens[1:]:
        token_lower = token.lower()
        for forbidden in FORBIDDEN_PATTERNS:
            if (
                forbidden == token_lower
                or f"/{forbidden}" in token_lower
                or f"\\{forbidden}" in token_lower
            ):
                raise CommandPolicyViolation(
                    f"Forbidden argument or utility '{forbidden}' detected in command tokens."
                )

    return tokens
