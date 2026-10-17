# Lessons — Shared Correction Log

## Purpose

This file records mistakes Claude made that a developer corrected, expressed
as concise rules to prevent recurrence. It is auto-loaded every session.

## Hard Cap: 15 entries maximum

15 entries x 4 lines = ~60 lines. Negligible token cost. Forces curation.

## Entry Format (4 lines max — no exceptions)

```
## [YYYY-MM-DD] [Category] [x1]
**Mistake:** [one sentence — exactly what went wrong]
**Rule:**    [one sentence — what to do instead, always]
**Applies:** [all tasks | specific tech | specific pattern]
```

## Categories (use exactly one per entry)

- `Scope` — touching code outside the request
- `Verification` — claiming something without reading it
- `Code Style` — formatting, comments, naming
- `Communication` — how answers are structured
- `Architecture` — structural decisions
- `Tech:[stack]` — tech-specific (e.g. Tech:Flutter, Tech:NestJS)

## Hygiene Rules

1. **Before adding:** search for an existing entry on the same topic.
   If found, increment the `[xN]` counter. Never add a duplicate.
2. **At x3:** promote the `Rule` line to the matching rules file
   (`core-behaviors.md`, `code-standards.md`, etc.), then DELETE the entry.
3. **At 15 entries:** promote oldest recurring lessons, delete
   non-recurring ones that have never triggered again.
4. **Each entry must fit in 4 lines.** No paragraphs. No explanations.

---

<!-- Entries below. Empty = no corrections recorded yet. -->

## [2026-03-28] Architecture [x1]
**Mistake:** Told sub-agent to run `/scaffold-flutter-app` as bash; agent fell back to `flutter create`, skipping the full industry-standard structure (design_system/, core/di/, clean arch layers).
**Rule:** Scaffold slash commands MUST be run by the orchestrator in the main session via Skill tool BEFORE spawning any agents — sub-agents cannot invoke slash commands.
**Applies:** All multi-agent project creation tasks (Flutter, React, Spring)

## [2026-08-10] Tech:Kotlin [x1]
**Mistake:** Left `/*` inside a KDoc block comment (`/api/**`) — Kotlin nests block comments, so the inner `/*` consumed the outer `*/`, leaving the comment unclosed until EOF.
**Rule:** Never write `/*` inside a `/** */` comment; rewrite any path pattern or URL that contains `/*` as prose (e.g. `/api routes` instead of `/api/**`).
**Applies:** All Kotlin KDoc comments containing URL or glob patterns

## [2026-08-10] Tech:Kotlin [x1]
**Mistake:** Defined `ResourceNotFoundException` extending `BusinessException`, but `BusinessException` was a plain `class` — kapt stubs it as `final`, breaking the subclass.
**Rule:** Any Kotlin class intended to be subclassed (including exception hierarchies) MUST be declared `open`; check this before writing subclasses.
**Applies:** All Kotlin exception / base-class hierarchies processed by kapt

## [2026-08-13] Scope [x1]
**Mistake:** When asked to make `name` non-null in a DTO, also changed `schoolName` to non-null without being asked.
**Rule:** In refactoring tasks, change only the exact variables named by the user — no opportunistic fixes to adjacent fields, even if they look inconsistent.
**Applies:** All DTO / model refactoring tasks

## [2026-08-13] Tech:Kotlin [x1]
**Mistake:** Used `String?` + `@NotBlank` for required string fields in a Kotlin DTO — redundant nullable type fighting the validation constraint.
**Rule:** Required string fields in Kotlin DTOs must be `String` (non-null); only use `String?` when the field is truly optional. Let Jackson enforce presence at the deserialization boundary.
**Applies:** All Kotlin `@Valid` request DTOs with string fields

## [2026-08-13] Architecture [x1]
**Mistake:** Placed locale-sensitive display-name defaulting (month/year format) in the application use case instead of the frontend.
**Rule:** Formatting, locale, and display defaults are frontend concerns — the backend must receive a concrete, validated value, never derive presentation strings.
**Applies:** Any optional field whose default is a human-readable label or formatted string

## [2026-08-15] Scope [x1]
**Mistake:** Implemented a full backend feature (Lesson domain, infra, application, API) and only wrote tests after the user explicitly asked.
**Rule:** Tests are part of the feature — write them immediately after the application layer, before declaring any layer done. Applies to both backend (use case tests) and frontend (component tests).
**Applies:** All backend use cases and frontend components

## [2026-10-02] Communication [x2]
**Mistake:** Wrote project artifacts (a rule; a plan file) into the global `~/.claude/` dir instead of the project's `.claude/` dir.
**Rule:** Write everything (rules, plans, memory, notes) under `/workspace/goetti-recruitment/.claude/` (e.g. plans → `.claude/plans/`); never write to global `~/.claude/`.
**Applies:** All file writes for rules, plans, memory, or session artifacts

## [2026-08-18] Architecture [x1]
**Mistake:** Made `gradeSystemId` required (non-null, typed value class) but never validated that the submitted ID actually exists in the grade system catalog at the application layer.
**Rule:** When a field references another aggregate by ID and is made required, add an `existsById` existence check in the use case — non-null ≠ valid within the domain.
**Applies:** All use cases that accept a cross-aggregate reference ID as input

## [2026-09-15] Tech:CLI [x1]
**Mistake:** Used plain `gh issue view` which opens a pager and returns empty output in non-interactive Bash tool calls.
**Rule:** Use plain `gh … --json <fields>` (no `GH_PAGER=` prefix, no `| cat` — both trigger permission prompts); if output is still empty, ask the user to run it via `! gh …`.
**Applies:** All Bash tool calls that read GitHub issue content

## [2026-10-02] Scope [x1]
**Mistake:** Applied the "icon only" header request to the new bug button but left the sibling feature-request button labelled.
**Rule:** When a UI styling request targets one of several sibling controls, apply it to all siblings for consistency or ask — never leave them diverging.
**Applies:** Header/toolbar buttons and other sibling UI controls

## [2026-10-02] Tech:CLI [x1]
**Mistake:** Ran `cd <dir> && cat relative/...` — paths resolved at run time can't be checked against the read block, and the `cd` left the shell CWD in a subdirectory.
**Rule:** Never `cd`; pass every file to `cat`/`grep`/tools as an absolute literal path, one simple command per Bash call (prefer the Read tool).
**Applies:** All Bash calls that read or search files

## [2026-10-04] Tech:CLI [x1]
**Mistake:** Ran `python3 -c "..."` to validate YAML — inline interpreter code always prompts under `blockReadsOutsideWorkingDirectories`.
**Rule:** Never run inline interpreter code (`python3 -c`, `node -e`, heredoc scripts); verify with Read/search tools or the project's own build commands instead.
**Applies:** All Bash calls during verification

## [2026-10-04] Tech:CLI [x1]
**Mistake:** Appended a multi-line HCL block via `cat >> file <<'EOF'` — the shell parser can't analyze heredoc content with braces/quotes, so it prompted.
**Rule:** Never write or append file content via Bash (heredoc, `echo >>`, `tee`); use Edit (append = replace the file's last lines) or Write — they never prompt for project files.
**Applies:** All file creation/modification

## [2026-10-06] Verification [x1]
**Mistake:** Recommended Neon's free tier for a 24/7 app without checking its compute-hour quota against always-on usage and the app's polling schedulers.
**Rule:** Before recommending any free/usage-based tier, multiply its quota against 730 h/month of the app's real load (schedulers, connection pools) and state the math.
**Applies:** All hosting/pricing recommendations

## [2026-10-14] Communication [x1]
**Mistake:** Read "combine mock and background with bee" as one merged design and removed the variant switch, though the user wanted each variant to get the bee.
**Rule:** When a request to "combine" options is ambiguous between merging them and extending each one, keep the existing variants and ask before collapsing them.
**Applies:** UI variant / design comparison tasks

## [2026-10-14] Code Style [x1]
**Mistake:** Built a custom chevron toggle for "Contact me" instead of reusing the shared `Collapse` component.
**Rule:** Before writing any UI pattern (collapse, stepper, modal), search `shared/components` for an existing one and reuse it.
**Applies:** All React UI components

## [2026-10-16] Verification [x1]
**Mistake:** Reported a new landing subtitle as done although the `sed` replace silently matched nothing in en/de.json.
**Rule:** After any `sed` edit, grep for the new value before reporting it; prefer the Edit tool for text changes (it fails loudly).
**Applies:** All `sed` / scripted file edits, especially locale files

## [2026-10-14] Tech:Gradle [x2]
**Mistake:** Ran Gradle from `/home/lukas/.gradle/wrapper/dists/...` instead of the project's committed wrapper.
**Rule:** Always run Gradle via the project wrapper: `/workspace/goetti-recruitment/gradlew -p /workspace/goetti-recruitment <task>` (version from `gradle/wrapper/gradle-wrapper.properties`); never call a binary under `~/.gradle`.
**Applies:** All Gradle invocations
