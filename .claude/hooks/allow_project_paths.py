"""PreToolUse hook: auto-allow Bash commands that only touch the project and the Gradle home.

- Single command, every path argument resolves under ALLOWED_ROOTS, cwd inside them -> allow (no prompt)
- `sed` with a file operand outside ALLOWED_ROOTS                                    -> deny
- Anything else (unquoted shell syntax, URLs, paths outside, unparsable)            -> no decision (normal flow)

A path argument is any token containing `/` (absolute, relative or `~`), including the value of `--opt=/path`.
Relative paths resolve against the tool call's cwd. Tokens without `/` (flags, globs like `*.jar`, subcommands)
are not paths. Note: this approves any command — including rm, mv and git push — as long as its paths qualify.
"""
import json
import os
import re
import shlex
import sys

ALLOWED_ROOTS = ("/workspace/goetti-recruitment", "/home/lukas/.gradle")
SHELL_OPERATOR_CHARS = set(";|&<>()")
SED_OPTIONS_WITH_VALUE = {"-e", "--expression", "-f", "--file", "-l", "--line-length"}


def decide(decision: str, reason: str) -> None:
    output = {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }
    print(json.dumps({"hookSpecificOutput": output}))
    sys.exit(0)


def has_unquoted_shell_syntax(command: str) -> bool:
    """True if the shell would interpret part of the command (operators, expansions, newlines).

    Text inside quotes is passed to the program literally, so `;`, `|`, `&` there are just arguments.
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


def is_allowed(path: str, cwd: str) -> bool:
    resolved = os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))
    return any(resolved == root or resolved.startswith(root + os.sep) for root in ALLOWED_ROOTS)


def path_arguments(arguments: list[str]) -> list[str]:
    paths: list[str] = []
    for argument in arguments:
        value = argument.split("=", 1)[1] if argument.startswith("-") and "=" in argument else argument
        if "/" in value or value.startswith("~"):
            paths.append(value)
    return paths


def sed_script_arguments(arguments: list[str]) -> list[str]:
    """The sed script (first operand or -e/--expression values) — not a path, even if it contains `/`."""
    scripts: list[str] = []
    script_file_given = False
    index = 0
    while index < len(arguments):
        argument = arguments[index]
        if argument in SED_OPTIONS_WITH_VALUE:
            if argument in ("-e", "--expression"):
                scripts.append(arguments[index + 1])
            if argument in ("-f", "--file"):
                script_file_given = True
            index += 2
            continue
        if argument.startswith("--expression="):
            scripts.append(argument.split("=", 1)[1])
        elif not argument.startswith("-") and not scripts and not script_file_given:
            scripts.append(argument)
        index += 1
    return scripts


def main() -> None:
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "").strip()
    cwd = payload.get("cwd") or os.getcwd()
    if not command or has_unquoted_shell_syntax(command):
        sys.exit(0)
    try:
        tokens = shlex.split(command)
        program, arguments = tokens[0], tokens[1:]
        scripts = sed_script_arguments(arguments) if program == "sed" else []
    except (ValueError, IndexError):
        sys.exit(0)
    candidates = [program] + [argument for argument in arguments if argument not in scripts]
    if any("://" in token for token in candidates):
        sys.exit(0)
    outside = [path for path in path_arguments(candidates) if not is_allowed(path, cwd)]
    if program == "sed" and outside:
        decide("deny", f"sed is only allowed on files under {' or '.join(ALLOWED_ROOTS)}: {', '.join(outside)}")
    if outside or not is_allowed(cwd, "/"):
        sys.exit(0)
    decide("allow", f"all paths under {' or '.join(ALLOWED_ROOTS)}")


if __name__ == "__main__":
    main()
