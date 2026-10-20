#!/usr/bin/env bash
# PreToolUse(Bash git commit) + Stop hook — runs ESLint on changed frontend files.
#
# Exit 0 always: failures are printed as warnings, never block the session.

set -uo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /workspace/goetti-recruitment)"

MODE="${1:-stop}"

# Commit mode: skip when the staged change only touches Claude config or Markdown docs
if [ "$MODE" = "--commit" ]; then
  STAGED=$(git diff --cached --name-only 2>/dev/null)
  if [ -n "$STAGED" ] && ! grep -qvE '^\.claude/|\.md$' <<< "$STAGED"; then
    echo "⏭ Only .claude/ or Markdown files staged — skipping lint check"
    exit 0
  fi
fi

# Skip when the full working tree is identical to the last successful check
# (e.g. one verified change split into several commits — committing doesn't change the tree)
TMP_INDEX=$(mktemp)
cp "$(git rev-parse --git-path index)" "$TMP_INDEX" 2>/dev/null
TREE=$(GIT_INDEX_FILE="$TMP_INDEX" git add -A >/dev/null 2>&1 && GIT_INDEX_FILE="$TMP_INDEX" git write-tree 2>/dev/null)
rm -f "$TMP_INDEX"
STAMP=$(git rev-parse --git-path claude-lint-verified)
if [ -n "$TREE" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$TREE" ]; then
  echo "⏭ Working tree unchanged since last successful lint check — skipping"
  exit 0
fi

CHANGED=$(
  { git diff --cached --name-only 2>/dev/null; \
    git diff --name-only 2>/dev/null; \
    git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
)

if [ -z "$CHANGED" ]; then
  exit 0
fi

HAS_FRONTEND=false

while IFS= read -r f; do
  [[ "$f" == frontend/src/*.ts  || "$f" == frontend/src/*.tsx \
  || "$f" == frontend/src/*.js  || "$f" == frontend/src/*.jsx ]] \
    && HAS_FRONTEND=true
done <<< "$CHANGED"

if ! $HAS_FRONTEND; then
  exit 0
fi

echo "▶ Frontend lint check..."

ESLINT=frontend/node_modules/.bin/eslint
if [ ! -f "$ESLINT" ]; then
  echo "  ⚠ eslint not found — skipping"
  exit 0
fi

OUTPUT=$(cd frontend && node_modules/.bin/eslint . --max-warnings=0 2>&1 || true)
if [ -n "$OUTPUT" ]; then
  echo "  ❌ ESLint errors:"
  echo "$OUTPUT" | head -20
  exit 1
else
  echo "  ✅ ESLint OK"
  if [ -n "$TREE" ]; then
    echo "$TREE" > "$STAMP"
  fi
fi
