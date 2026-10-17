# Rule: FlyonUI Patterns

## Scope

This rule applies whenever writing or modifying any React component in this project that uses
FlyonUI classes, components, or plugins.

## Critical: FlyonUI ≠ DaisyUI

FlyonUI is **not** a DaisyUI fork — it diverges in class names, JS behaviour, and component
structure. Never carry over DaisyUI muscle memory. Common traps:

| Pattern | DaisyUI (WRONG) | FlyonUI (CORRECT) |
|---------|-----------------|-------------------|
| Open a modal | `dialog.showModal()` / `.modal-open` | `fixed inset-0` overlay div, visibility controlled by React state |
| Modal wrapper | `<dialog class="modal">` + `.modal-box` | `<div class="fixed inset-0 ...">` containing a plain div |
| Join/group | `.join` | `.join` exists but check docs — behaviour differs |
| Badge | `.badge-primary` etc. | verify current class names via Context7 |

**Always** query Context7 for `flyonui` docs before writing any new component. Never assume a
DaisyUI pattern works.

## CSS Integration

With Tailwind CSS v4, FlyonUI must be loaded as a plugin, **not** as a raw CSS import:

```css
/* ✅ CORRECT — tailwind.css */
@import "tailwindcss";
@plugin "flyonui";

/* ❌ WRONG — breaks PostCSS parsing in dev */
@import "flyonui/flyonui";
```

`@import "flyonui/flyonui"` feeds minified CSS (with modern nesting) directly to PostCSS before
Tailwind has a chance to process it, causing parse errors in development mode.

## Modal Pattern

FlyonUI modals are React-state-driven overlays — not native `<dialog>` elements:

```tsx
// ✅ Correct FlyonUI modal shell
if (!isOpen) return null;

return (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative bg-base-100 rounded-box w-full max-w-lg p-6">
      {/* content */}
    </div>
  </div>
);
```

Key points:
- Return `null` when closed — never `{isOpen && ...}` wrapping the whole overlay
- Separate `absolute inset-0` backdrop div carries the `onClick={onClose}` handler (click outside = close)
- Content box needs `relative` to sit above the backdrop in stacking order

Never use `.modal`, `.modal-open`, `.modal-box`, or `<dialog>` for FlyonUI modals.

## Before Writing Any FlyonUI Component

1. Query Context7 MCP (`resolve-library-id` → `query-docs`) for the exact component class names
2. Cross-check the official FlyonUI component examples — do not rely on memory
3. If Context7 is unavailable, treat every class name as unverified and note it explicitly

## Checklist — before marking a FlyonUI component done

- [ ] No DaisyUI-only classes used (`.modal`, `.modal-open`, `.modal-box`, `.join` unless verified)
- [ ] CSS uses `@plugin "flyonui"` not `@import "flyonui/flyonui"`
- [ ] Modal (if any) uses fixed-overlay React-state pattern, not `<dialog>`
- [ ] Class names verified against Context7 or official FlyonUI docs this session
