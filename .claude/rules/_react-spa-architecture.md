# Rule: React SPA Architecture

## Scope

This rule applies whenever creating or modifying React frontend applications, components, hooks, or frontend modules.

## UI Responsibility

- Keep the frontend simple and focused on presentation and user interaction.
- Do not implement complex business logic in the frontend.
- Business rules must be implemented in the backend/domain layer whenever possible.

## Business Logic

- The frontend may contain UI-specific logic such as:
    - component state management
    - form handling
    - input validation for user experience
    - display formatting
    - navigation state
    - loading and error states

- The frontend must not contain:
    - domain rules
    - business calculations
    - workflow orchestration
    - authorization decisions
    - duplicated backend validation logic

## Component Design

- Components should have a single responsibility.
- Prefer small, reusable components with clear purposes.
- Avoid large components that combine:
    - data fetching
    - business decisions
    - state management
    - rendering logic

## State Management

- Keep state as local as possible.
- Introduce global state only when multiple unrelated parts of the application require shared state.
- Avoid using global state as a replacement for proper backend/domain design.

## API Communication

- Treat backend APIs as the source of truth for business data and rules.
- Keep API communication isolated from presentation components.
- Use dedicated hooks, services, or adapters for API interaction.
- Read server data with TanStack Query through the query catalogue (`src/app/core/query/queries.ts`) — never
  `apiClient.get` in a `useEffect`. Full rules: `_server-data-queries.md` (ADR-008).

## General Principles

- Prefer simple solutions over unnecessary abstractions.
- Avoid premature frontend architecture complexity.
- The frontend should support the business domain, not recreate it.

## TypeScript Conventions

- Prefer `undefined` over `null` for absent values in all TypeScript/React code. Default to `T | undefined` and
  `useState<T>()` (no initializer).
- **Exception:** `createContext<T | null>(null)` keeps `null` as the "no provider" sentinel — this is the established
  React convention. Do not change this to `undefined`.
- Only use `null` when an external API, DOM API, or library explicitly requires it.

## CSS Architecture

The frontend uses a deliberate two-file CSS split — **never merge these files**:

| File | Contents | Pipeline |
|------|----------|----------|
| `src/tailwind.css` | `@import "tailwindcss"` + `@plugin "flyonui"` | PostCSS |
| `src/styles.scss` | Custom SCSS (variables, mixins, overrides) | Sass |

Both files are imported in `src/main.tsx`. Sass cannot resolve PostCSS-only directives (`@import "tailwindcss"`);
merging them breaks the Tailwind/FlyonUI build step.

## API Path Constants

All API endpoint paths must be defined in `src/app/core/http/apiPaths.ts` — never hardcode path strings at the call site.

**Pattern:**
- `SEG` object holds raw path segment strings (`API`, `V1`, `AUTH`, etc.)
- `seg(...parts)` utility joins segments into an absolute path string
- `ApiPaths` typed const tree groups full paths by resource (`auth.login`, `auth.register`, …)
- Parameterized paths are arrow functions: `users: { byId: (id: string) => seg(SEG.API, SEG.V1, 'users', id) }`
- `globOf(path)` prepends `**` for Playwright `page.route()` globs — E2E tests import from the same file

**Why:** Single source of truth — renaming an endpoint is a one-line change; interceptor skip-checks use exact
constant comparison instead of fragile `includes()` substrings.
