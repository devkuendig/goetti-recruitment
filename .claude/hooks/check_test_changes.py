##############################################
#### UNUSED ##################################
##############################################

#!/usr/bin/env python3
"""
Claude Code PreToolUse hook: block/ask when an Edit, MultiEdit, or Write
would change the body of an EXISTING unit test.

Adding new tests is always allowed. Only edits that touch an existing
test's already-written code trigger a confirmation prompt.

Install:
  1. Save this file as .claude/hooks/check_test_changes.py (chmod +x)
  2. Wire it up in .claude/settings.json (see settings.snippet.json)

How it works:
  - For Edit/MultiEdit: looks at `old_string` (the exact text being
    replaced). If that text contains a recognizable test definition
    (def test_..., it("..."), @Test, func Test..., etc.), the edit is
    modifying code that already exists in an existing test -> ask.
  - For Write: diffs test names found in the file currently on disk
    against the test names/bodies in the new content. Any existing
    test whose body changed -> ask. Brand-new test names are fine.
  - Non-test files, or edits that only ADD new test functions, are
    allowed silently.

Exit / output contract (PreToolUse):
  Prints a JSON object with hookSpecificOutput.permissionDecision set
  to "ask" (pop a confirmation with details) or omits output entirely
  to allow silently. See Claude Code hooks reference for the schema.
"""

import json
import re
import sys
from pathlib import Path

# --- config ---------------------------------------------------------------

TEST_FILE_PATTERNS = [
    r".*\.test\.[jt]sx?$", r".*\.spec\.[jt]sx?$",
    r".*Test.*\.kt$",
    r".*Test.*\..*$",
]

# language -> (definition regex, group index for the test name)
TEST_DEF_PATTERNS = [
    re.compile(r"def\s+(test_\w+)\s*\("),                          # pytest / unittest
    re.compile(r"""(?:it|test)\(\s*['"`]([^'"`]+)['"`]"""),         # jest / mocha / jasmine
    re.compile(r"func\s+(Test\w+)\s*\("),                           # go
    re.compile(r"""@Test[\s\S]{0,80}?\bvoid\s+(\w+)\s*\("""),       # junit
    re.compile(r"""it\s+['"]([^'"]+)['"]"""),                       # rspec
]


def is_test_file(path: str) -> bool:
    return any(re.search(p, path) for p in TEST_FILE_PATTERNS)


def find_test_names(code: str):
    names = set()
    for pat in TEST_DEF_PATTERNS:
        for m in pat.finditer(code):
            names.add(m.group(1))
    return names


def ask(reason: str):
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "ask",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def allow():
    # No output = silently allowed.
    sys.exit(0)


def extract_body(code: str, name: str) -> str:
    idx = code.find(name)
    if idx == -1:
        return ""
    snippet = code[idx: idx + 2000]
    return re.sub(r"\s+", " ", snippet).strip()


def main():
    payload = json.load(sys.stdin)
    tool_name = payload.get("tool_name", "")
    tool_input = payload.get("tool_input", {})

    if tool_name not in ("Edit", "MultiEdit", "Write"):
        allow()

    file_path = tool_input.get("file_path", "")
    if not is_test_file(file_path):
        allow()

    # Maps test name -> unified diff string
    changed_tests: dict[str, str] = {}

    if tool_name in ("Edit", "MultiEdit"):
        edits = tool_input.get("edits") if tool_name == "MultiEdit" else [tool_input]
        for e in edits:
            old_str = e.get("old_string", "")
            new_str = e.get("new_string", "")
            old_names = find_test_names(old_str)
            for name in old_names:
                old_body = re.sub(r"\s+", " ", old_str).strip()
                new_body = re.sub(r"\s+", " ", new_str).strip()
                if name not in new_str or old_body != new_body:
                    changed_tests[name] = ""

    elif tool_name == "Write":
        new_content = tool_input.get("content", "")
        existing = Path(file_path)
        if existing.exists():
            old_content = existing.read_text(errors="ignore")
            old_names = find_test_names(old_content)
            new_names = find_test_names(new_content)
            for name in old_names & new_names:
                if extract_body(old_content, name) != extract_body(new_content, name):
                    changed_tests[name] = ""
            for name in old_names - new_names:
                changed_tests[f"{name} (removed)"] = ""

    if changed_tests:
        names = "\n".join(f"  • {name}" for name in sorted(changed_tests))
        ask(
            f"This edit changes existing unit test(s) in {file_path}:\n\n"
            f"{names}\n\n"
            "Existing tests should describe fixed, agreed-upon behavior. "
            "Confirm this is an intentional test update (not a change made "
            "just to make failing code pass)."
        )

    allow()


if __name__ == "__main__":
    main()
