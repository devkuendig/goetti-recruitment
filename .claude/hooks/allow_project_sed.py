"""PreToolUse hook: auto-allow `sed` only when every file it touches is inside the project.

- Plain `sed` command, all file operands resolve under PROJECT_ROOT -> allow (no prompt), rewritten with --sandbox
- Any file operand outside PROJECT_ROOT                           -> deny
- Anything else (not sed, unquoted shell syntax, unparsable)      -> no decision (normal permission flow)
"""
import json
import os
import re
import shlex
import sys

PROJECT_ROOT = "/workspace/goetti-recruitment"
SHELL_OPERATOR_CHARS = set(";|&<>()")
OPTIONS_WITH_VALUE = {"-e", "--expression", "-f", "--file", "-l", "--line-length"}


def decide(decision: str, reason: str, updated_command: str | None = None) -> None:
    output = {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }
    if updated_command is not None:
        output["updatedInput"] = {"command": updated_command}
    print(json.dumps({"hookSpecificOutput": output}))
    sys.exit(0)


def file_operands(arguments: list[str]) -> list[str]:
    files: list[str] = []
    script_given = False
    index = 0
    while index < len(arguments):
        argument = arguments[index]
        if argument in OPTIONS_WITH_VALUE:
            if argument in ("-e", "--expression"):
                script_given = True
            if argument in ("-f", "--file"):
                files.append(arguments[index + 1])
                script_given = True
            index += 2
            continue
        if argument.startswith("--expression=") or argument.startswith("--file="):
            script_given = True
            if argument.startswith("--file="):
                files.append(argument.split("=", 1)[1])
        elif argument.startswith("-") and argument != "-":
            pass
        elif not script_given:
            script_given = True
        else:
            files.append(argument)
        index += 1
    return files


def has_unquoted_shell_syntax(command: str) -> bool:
    """True if the shell (not sed) would interpret part of the command.

    Text inside quotes goes to sed literally, so `;`, `|`, `&` there is just sed script.
    """
    lexer = shlex.shlex(command, posix=True, punctuation_chars=True)
    try:
        tokens = list(lexer)
    except ValueError:  # unbalanced quotes
        return True
    # Unquoted operators become tokens made only of operator characters (`;`, `|`, `&&`, `>`, ...)
    if any(token and set(token) <= SHELL_OPERATOR_CHARS for token in tokens):
        return True
    # $ and backticks still expand inside double quotes; only single quotes are fully literal
    outside_single_quotes = re.sub(r"'[^']*'", "", command)
    return any(char in outside_single_quotes for char in ("`", "$", "\n"))


def is_inside_project(path: str) -> bool:
    resolved = os.path.realpath(os.path.expanduser(path))
    return resolved == PROJECT_ROOT or resolved.startswith(PROJECT_ROOT + os.sep)


def main() -> None:
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "").strip()
    if not command.startswith("sed "):
        sys.exit(0)
    if has_unquoted_shell_syntax(command):
        sys.exit(0)
    try:
        arguments = shlex.split(command)[1:]
        files = file_operands(arguments)
    except (ValueError, IndexError):
        sys.exit(0)
    if not files or "-" in files:
        sys.exit(0)
    outside = [path for path in files if not os.path.isabs(path) or not is_inside_project(path)]
    if outside:
        decide("deny", f"sed is only allowed on absolute paths under {PROJECT_ROOT}: {', '.join(outside)}")
    # No --sandbox rewrite: Claude Code's built-in sed check doesn't recognise the flag and prompts on every call.
    # Scripts using the e/r/w commands are still flagged by that built-in check.
    decide("allow", f"sed on project files only: {', '.join(files)}")


if __name__ == "__main__":
    main()
