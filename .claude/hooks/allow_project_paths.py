"""PreToolUse hook: auto-allow Bash commands that only touch the project and the Gradle home.

- Every path argument resolves under ALLOWED_ROOTS, cwd inside them -> allow (no prompt)
- `sed` with a file operand outside ALLOWED_ROOTS                 -> deny
- Anything else (paths outside, URLs, unparsable, see below)      -> no decision (normal flow)

Compound commands (`&&`, `||`, `;`, `|`, `for ... do ... done`, newlines) are split into simple commands and
every one of them is checked. `cd <dir>` changes the directory used to resolve later relative paths.

Never auto-allowed, because the paths are not visible in the command text:
command substitution (`$(...)`, backticks), heredocs (`<<`), and `$VAR` references to variables that the
command itself does not define (`for VAR in`, `VAR=value`, `read VAR`).

A path argument is any token containing `/` (absolute, relative or `~`), including the value of `--opt=/path`
and `VAR=/path`. The script of `sed`/`awk` is not a path. Note: this approves any command — including rm, mv
and git push — as long as its paths qualify; deny rules in settings.json still apply.
"""
import json
import os
import re
import shlex
import sys

ALLOWED_ROOTS = ("/workspace/goetti-recruitment", "/home/lukas/.gradle")
SEPARATOR_CHARS = set(";|&()\n")
REDIRECT_CHARS = set("<>&")
SED_OPTIONS_WITH_VALUE = {"-e", "--expression", "-f", "--file", "-l", "--line-length"}
AWK_OPTIONS_WITH_VALUE = {"-F", "-v", "-f"}
SHELL_KEYWORDS = {"for", "in", "do", "done", "while", "until", "if", "then", "elif", "else", "fi", "!", "{", "}"}
VARIABLE_REFERENCE = re.compile(r"\$\{?([A-Za-z_][A-Za-z0-9_]*|[0-9#?@*!$-])")
VARIABLE_DEFINITIONS = (
    re.compile(r"\bfor\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\b"),
    re.compile(r"(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)="),
    re.compile(r"\bread\s+(?:-[A-Za-z]+\s+)*([A-Za-z_][A-Za-z0-9_]*)"),
)
ASSIGNMENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*=")


def decide(decision: str, reason: str) -> None:
    output = {
        "hookEventName": "PreToolUse",
        "permissionDecision": decision,
        "permissionDecisionReason": reason,
    }
    print(json.dumps({"hookSpecificOutput": output}))
    sys.exit(0)


def has_hidden_paths(command: str) -> bool:
    """True if the command computes text the hook cannot see: substitutions, heredocs, unknown variables."""
    outside_single_quotes = re.sub(r"'[^']*'", "", command)
    if "`" in outside_single_quotes or "$(" in outside_single_quotes or "<<" in outside_single_quotes:
        return True
    defined = {name for pattern in VARIABLE_DEFINITIONS for name in pattern.findall(command)}
    return any(name not in defined for name in VARIABLE_REFERENCE.findall(outside_single_quotes))


def simple_commands(command: str) -> list[list[str]]:
    """Split a compound command into the token lists of its simple commands (redirect operators dropped)."""
    lexer = shlex.shlex(command, posix=True, punctuation_chars=";|&()<>\n")
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    commands: list[list[str]] = [[]]
    for token in lexer:
        if token and set(token) <= SEPARATOR_CHARS:
            commands.append([])
        elif token and set(token) <= REDIRECT_CHARS:
            continue
        else:
            commands[-1].append(token)
    return [tokens for tokens in commands if tokens]


def without_keywords(tokens: list[str]) -> list[str]:
    index = 0
    while index < len(tokens) and tokens[index] in SHELL_KEYWORDS:
        index += 1
    return tokens[index:]


def script_arguments(program: str, arguments: list[str]) -> list[str]:
    """The sed/awk script (first operand or -e values) — not a path, even if it contains `/`."""
    options_with_value = SED_OPTIONS_WITH_VALUE if program == "sed" else AWK_OPTIONS_WITH_VALUE
    scripts: list[str] = []
    script_file_given = False
    index = 0
    while index < len(arguments):
        argument = arguments[index]
        if argument in options_with_value:
            if program == "sed" and argument in ("-e", "--expression") and index + 1 < len(arguments):
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


def is_allowed(path: str, cwd: str) -> bool:
    resolved = os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))
    return any(resolved == root or resolved.startswith(root + os.sep) for root in ALLOWED_ROOTS)


def path_arguments(arguments: list[str]) -> list[str]:
    paths: list[str] = []
    for argument in arguments:
        has_value = (argument.startswith("-") or ASSIGNMENT.match(argument)) and "=" in argument
        value = argument.split("=", 1)[1] if has_value else argument
        if "/" in value or value.startswith("~"):
            paths.append(value)
    return paths


def main() -> None:
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "").strip()
    start_cwd = payload.get("cwd") or os.getcwd()
    if not command or has_hidden_paths(command) or not is_allowed(start_cwd, "/"):
        sys.exit(0)
    try:
        commands = [without_keywords(tokens) for tokens in simple_commands(command)]
    except ValueError:  # unbalanced quotes
        sys.exit(0)
    # Subshells and pipes may not keep a `cd`, so every relative path must qualify against every directory seen
    cwds = [start_cwd]
    outside_all: list[str] = []
    for tokens in commands:
        if not tokens:
            continue
        program, arguments = tokens[0], tokens[1:]
        scripts = script_arguments(program, arguments) if program in ("sed", "awk") else []
        candidates = [program] + [argument for argument in arguments if argument not in scripts]
        if any("://" in token for token in candidates):
            sys.exit(0)
        outside = [path for path in path_arguments(candidates) if not all(is_allowed(path, cwd) for cwd in cwds)]
        if program == "sed" and outside:
            decide("deny", f"sed is only allowed on files under {' or '.join(ALLOWED_ROOTS)}: {', '.join(outside)}")
        outside_all.extend(outside)
        if program == "cd" and arguments:
            target = os.path.realpath(os.path.join(cwds[-1], os.path.expanduser(arguments[-1])))
            if not is_allowed(target, "/"):
                sys.exit(0)
            cwds.append(target)
    if outside_all:
        sys.exit(0)
    decide("allow", f"all paths under {' or '.join(ALLOWED_ROOTS)}")


if __name__ == "__main__":
    main()
