"""Ad-hoc check of allow_project_sed.py decisions. Run: python3 .claude/tmp/test_allow_project_sed.py"""
import json
import subprocess

HOOK = "/workspace/planbee/.claude/hooks/allow_project_sed.py"
FILE = "/workspace/planbee/frontend/src/app/pages/useDashboard.test.ts"

CASES = [
    # (expected decision, command)
    ("allow", f"sed -n 50,80p {FILE}"),
    ("allow", f"sed -i 's/, SEMESTER, WEEK_/, WEEK_/g' {FILE}"),
    ("allow", f"sed -i -E 's/a\\.(Foo|Bar)/b.\\1/; s/x/&y/' {FILE}"),
    ("allow", f"sed -n '/start/,$p' {FILE}"),
    ("none", f"sed -n 1,5p {FILE}; ls /tmp"),
    ("none", f"sed -n 1,5p {FILE} | sort"),
    ("none", f"sed -n 1,5p {FILE} > /tmp/out"),
    ("none", f"sed -n \"$(cat /tmp/x)\" {FILE}"),
    ("none", f"sed -n `whoami` {FILE}"),
    ("deny", "sed -n 1,5p /etc/passwd"),
    ("none", "grep -n foo /workspace/planbee/README.md"),
]


def decision(command: str) -> str:
    payload = json.dumps({"tool_input": {"command": command}})
    output = subprocess.run(["python3", HOOK], input=payload, capture_output=True, text=True).stdout.strip()
    return json.loads(output)["hookSpecificOutput"]["permissionDecision"] if output else "none"


failures = 0
for expected, command in CASES:
    actual = decision(command)
    status = "ok  " if actual == expected else "FAIL"
    failures += actual != expected
    print(f"{status} expected={expected:5} actual={actual:5} {command}")
print(f"{len(CASES) - failures}/{len(CASES)} passed")
