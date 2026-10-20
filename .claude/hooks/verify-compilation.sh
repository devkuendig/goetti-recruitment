#!/usr/bin/env bash
# PostToolUse / Stop hook — runs a fast compilation sanity check whenever
# Claude edits Kotlin or frontend files.
#
# Exit 0 always: failures are printed as warnings, never block the session.

set -uo pipefail

# Always run from project root so Gradle and relative paths resolve correctly.
cd "$(git rev-parse --show-toplevel 2>/dev/null || echo /workspace/goetti-recruitment)"

MODE="${1:-stop}"

# Commit mode: skip when the staged change only touches Claude config or Markdown docs
if [ "$MODE" = "--commit" ]; then
  STAGED=$(git diff --cached --name-only 2>/dev/null)
  if [ -n "$STAGED" ] && ! grep -qvE '^\.claude/|\.md$' <<< "$STAGED"; then
    echo "⏭ Only .claude/ or Markdown files staged — skipping compile check"
    exit 0
  fi
fi

# Skip when the full working tree is identical to the last successful check
# (e.g. one verified change split into several commits — committing doesn't change the tree)
TMP_INDEX=$(mktemp)
cp "$(git rev-parse --git-path index)" "$TMP_INDEX" 2>/dev/null
TREE=$(GIT_INDEX_FILE="$TMP_INDEX" git add -A >/dev/null 2>&1 && GIT_INDEX_FILE="$TMP_INDEX" git write-tree 2>/dev/null)
rm -f "$TMP_INDEX"
STAMP=$(git rev-parse --git-path claude-compile-verified)
if [ -n "$TREE" ] && [ -f "$STAMP" ] && [ "$(cat "$STAMP")" = "$TREE" ]; then
  echo "⏭ Working tree unchanged since last successful compile check — skipping"
  exit 0
fi

# ── Detect what changed (staged + unstaged + untracked) ──────────────────
CHANGED=$(
  { git diff --cached --name-only 2>/dev/null; \
    git diff --name-only 2>/dev/null; \
    git ls-files --others --exclude-standard 2>/dev/null; } | sort -u
)

if [ -z "$CHANGED" ]; then
  exit 0
fi

HAS_KT=false
HAS_FRONTEND=false

while IFS= read -r f; do
  [[ "$f" == backend/*.kt || "$f" == *.kt ]] && HAS_KT=true
  [[ "$f" == frontend/src/*.ts  || "$f" == frontend/src/*.tsx \
  || "$f" == frontend/src/*.css || "$f" == frontend/vite.config.ts \
  || "$f" == frontend/e2e/*.ts  || "$f" == frontend/playwright*.config.ts \
  || "$f" == frontend/tsconfig*.json ]] \
    && HAS_FRONTEND=true
done <<< "$CHANGED"

RC=0

# ── Kotlin compile check ─────────────────────────────────────────────────
if $HAS_KT; then
  echo "▶ Kotlin compile check..."
  GRADLE=$(find ~/.gradle/wrapper/dists -name "gradle" -path "*/bin/gradle" \
           2>/dev/null | sort -V | tail -1)
  if [ -z "$GRADLE" ]; then
    echo "  ⚠ No Gradle binary found — skipping"
  else
    OUTPUT=$("$GRADLE" :backend:compileKotlin --quiet 2>&1 || true)
    if echo "$OUTPUT" | grep -qE "^e:|error:"; then
      echo "  ❌ Kotlin compilation FAILED:"
      echo "$OUTPUT" | grep -E "^e:|error:" | head -10
      RC=1
    else
      echo "  ✅ Kotlin OK"
    fi
  fi
fi

# ── Frontend type check ───────────────────────────────────────────────────
if $HAS_FRONTEND; then
  echo "▶ Frontend type check..."
  TSC=frontend/node_modules/.bin/tsc
  if [ ! -f "$TSC" ]; then
    echo "  ⚠ tsc not found — skipping"
  else
    # tsc -b follows tsconfig.json's project references; a bare --noEmit checks nothing ("files": [])
    OUTPUT=$(cd frontend && node_modules/.bin/tsc -b 2>&1 || true)
    if [ -n "$OUTPUT" ]; then
      echo "  ❌ TypeScript errors:"
      echo "$OUTPUT" | head -15
      RC=1
    else
      echo "  ✅ TypeScript OK"
    fi
  fi
fi

if [ $RC -eq 0 ] && [ -n "$TREE" ]; then
  echo "$TREE" > "$STAMP"
fi

exit $RC
