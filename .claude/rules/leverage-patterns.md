# Leverage Patterns

## Declarative Over Imperative

Prefer success criteria over step-by-step commands:

> "I understand the goal is [success state]. I'll work toward that. Correct?"

Transform tasks into verifiable goals:

- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

## Naive Then Optimize

1. Implement the obviously-correct naive version first
2. Verify correctness
3. Then optimize while preserving behavior

Correctness first. Performance second. Never skip step 1.

### Three-Pass Development Pattern

For any non-trivial implementation, apply these passes in order. Each pass is independently testable and releasable
before moving to the next.

**Pass 1 — Make it work**

- Write the simplest code that passes the tests
- Acceptable: verbose, repetitive, naive algorithms, hardcoded values
- Not acceptable: broken tests, silent failures
- Gate: all tests pass → commit

**Pass 2 — Make it clear**

- Rename variables to reflect intent
- Extract functions where logic is non-obvious (see Rule of Three before extracting)
- Remove dead code your changes created
- No behavior change — tests must still pass identically
- Gate: tests pass, diff is only naming/structure changes → commit

**Pass 3 — Make it efficient** (only if evidence demands it)

- Profile first — identify the actual bottleneck (DevTools / EXPLAIN ANALYZE / benchmarks)
- Optimize only the proven bottleneck
- Measure before and after: "Reduced X from Yms to Zms"
- Gate: tests pass, performance improvement measured → commit

**Rules:**

- Never skip to Pass 3 without completing Passes 1 and 2
- Never run Pass 3 without profiling evidence
- If human says "just ship it" — Pass 1 output is shippable. Stop there.
- For trivial changes (renaming, config tweaks): single pass is fine — don't over-process

## Browser MCP in the Loop

When applicable, use a browser MCP for real-time validation. Verify against actual rendered output or live behavior, not
just static code analysis.

## Skill and Agent Selection

Skills and agents are lazy-loaded — load the right one before working in a domain. CLAUDE.md has the full mapping
tables, but sub-agents don't see CLAUDE.md. This section provides the selection logic.

### When to Load a Skill

```
About to write or modify code?
    |
    +-- What technology? Match to skill:
    |   Kotlin/Spring   -> kotlin-springboot
    |   React           -> vercel-react-best-practices
    |   Database schema -> database-schema-designer
    |   Architecture    -> architecture-designer
    |
    +-- Cross-cutting concern?
        Debugging       -> systematic-debugging
        Security audit  -> load skill, then dispatch security-reviewer agent
        Code review     -> load skill, then dispatch tech-specific reviewer agent
        Browser testing -> browser-testing-with-devtools
        Plan review     -> using-superpowers
```

**Rule:** Load the skill BEFORE writing code, not after. Skills contain patterns, templates, and MCP server references
that prevent mistakes.

### When to Dispatch a Reviewer Agent

Reviewer agents are dispatched AFTER code is written, not before. Match by domain:

| Signal in Changed Files                                      | Reviewer Agent                                   |
|--------------------------------------------------------------|--------------------------------------------------|
| `*.kt`, `build.gradle`, Spring annotations                   | `spring-reviewer`                                |
| SQL migrations, schema changes                               | `postgresql-database-reviewer`                   |
| Any security-sensitive change (auth, crypto, input handling) | `security-reviewer`                              |
| UI components, accessibility                                 | `ui-standards-expert` or `accessibility-auditor` |
| None of the above / mixed                                    | `code-reviewer` (general)                        |

**Rule:** When in doubt, dispatch `code-reviewer`. It covers all languages. Stack-specific reviewers add deeper checks
but are not a replacement — use both for critical changes.

### Common Mistakes

- Loading a skill after already writing code → patterns were missed, rewrite likely
- Dispatching a reviewer for the wrong stack → shallow review, false confidence
- Skipping skill load for "small changes" → small changes to Spring WebFlux or Riverpod still need the skill's patterns
  to avoid framework-specific traps

## Adaptive Depth Levels

Not every task needs the same depth of planning, testing, or documentation. Calibrate effort to the actual problem.

| Depth             | When to Use                                            | What It Means                                               |
|-------------------|--------------------------------------------------------|-------------------------------------------------------------|
| **Minimal**       | Single-file fix, clear requirement, trivial change     | Write code, run existing tests, done                        |
| **Standard**      | Multi-file change, some ambiguity, moderate complexity | Plan first, write tests, verify contracts                   |
| **Comprehensive** | Architecture change, high risk, cross-service impact   | Full plan approval, ADR, integration tests, security review |

### Factors That Push Depth Up

- Request is vague or uses undefined terms → +1 level
- Change touches shared utilities or interfaces → +1 level
- Risk of data loss or security impact → jump to Comprehensive
- Multiple components or services affected → +1 level

### Factors That Keep Depth Low

- Human has given very specific, detailed instructions
- Change is isolated to one file with no shared contracts
- Existing tests already cover the area

**Default:** Start at Minimal. Escalate only when a factor above applies. Do not gold-plate simple requests.

> **Interaction with Overconfidence Prevention** (`core-behaviors.md §10`): If any §10 Mandatory Question Trigger fires,
> ask first — even at Minimal depth. Depth controls *ceremony* (planning, testing, docs); §10 controls *clarification*.
> They are independent axes.

## Large Task Management

When a task is too large for a single context window:

- Break into self-contained subtasks with clear inputs/outputs
- Complete and verify each subtask before moving to the next
- Summarize completed work at each boundary for context carry-forward
- If losing track of earlier decisions, say so and request a recap
