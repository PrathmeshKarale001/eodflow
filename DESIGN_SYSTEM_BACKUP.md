# EOD Flow — Previous Design System (Backup)

> **Git Reference**: Commit `fea0a01` (before the native-app transformation at `1cf6500`)
> **Date**: 2026-06-23
> **To restore**: `git checkout fea0a01 -- src/styles/globals.css`

---

## Design Philosophy

The original design system was **brutalist** — sharp edges, zero border radius, ultra-small monospace text, raw uppercase labels with underscores. Inspired by terminal UI / hacker aesthetic.

---

## Color Tokens (Dark Mode — Default)

```css
:root {
  color-scheme: dark;
  --bg: #0A0A0A;                              /* Pure black background */
  --fg: #e5e2e1;
  --clr-primary: #c6bfff;
  --clr-on-primary: #2900a0;
  --clr-primary-container: #6c5ce7;
  --clr-on-primary-container: #faf6ff;
  --clr-secondary: #c7bfff;
  --clr-on-secondary: #2c0d95;
  --clr-secondary-container: #4330ab;
  --clr-on-secondary-container: #b5abff;
  --clr-tertiary: #ffb77d;
  --clr-on-tertiary: #4d2600;
  --clr-tertiary-container: #ac5d00;
  --clr-on-tertiary-container: #fff5f1;
  --clr-surface: #131313;                     /* Neutral grey surface */
  --clr-on-surface: #e5e2e1;
  --clr-surface-lowest: #0e0e0e;
  --clr-surface-low: #1c1b1b;
  --clr-surface-container: #201f1f;
  --clr-surface-high: #2a2a2a;
  --clr-surface-highest: #353534;
  --clr-outline: #928ea0;
  --clr-outline-variant: #474554;
  --clr-error: #ffb4ab;
  --clr-on-error: #690005;
  --clr-card: #181818;                        /* Neutral grey card */
  --clr-card-muted: #1e1e1e;
  --clr-card-text: #c6bfff;
  --clr-card-border: rgba(255, 255, 255, 0.15); /* 15% white border */
}
```

## Color Tokens (Light Mode)

```css
.light {
  color-scheme: light;
  --bg: #f5f5f5;
  --fg: #1a1a1a;
  --clr-primary: #6c5ce7;
  --clr-on-primary: #ffffff;
  --clr-primary-container: #6c5ce7;
  --clr-on-primary-container: #ffffff;
  --clr-secondary: #5a4fcf;
  --clr-on-secondary: #ffffff;
  --clr-secondary-container: #e8e5ff;
  --clr-on-secondary-container: #2c0d95;
  --clr-tertiary: #c45d00;
  --clr-on-tertiary: #ffffff;
  --clr-tertiary-container: #ffead9;
  --clr-on-tertiary-container: #4d2600;
  --clr-surface: #ffffff;
  --clr-on-surface: #1a1a1a;
  --clr-surface-lowest: #ffffff;
  --clr-surface-low: #f8f8f8;
  --clr-surface-container: #f0f0f0;
  --clr-surface-high: #e8e8e8;
  --clr-surface-highest: #dcdcdc;
  --clr-outline: #6b6880;
  --clr-outline-variant: #c8c6d4;
  --clr-error: #ba1a1a;
  --clr-on-error: #ffffff;
  --clr-card: #ffffff;
  --clr-card-muted: #f4f4f5;
  --clr-card-text: #180065;
  --clr-card-border: rgba(0, 0, 0, 0.15);
}
```

---

## Border Radius

All radii were **0px** — the signature brutalist look.

```css
--radius-sm: 0px;
--radius-md: 0px;
--radius-lg: 0px;
--radius-xl: 0px;
```

---

## Typography Scale

Text sizes used extensively across all 57 components:

| Usage | Size | Notes |
|-------|------|-------|
| Smallest labels (edited markers, metadata) | `text-[7px]` | Ultra-tiny, mono uppercase |
| KPI labels, badges, section headers | `text-[8px]` | Primary label size |
| Status pills, timestamps, usernames | `text-[9px]` | Secondary info text |
| Navigation labels, button text | `text-[10px]` – `text-[11px]` | Action text |
| Body content | `text-xs` (12px) | Standard content |
| Headings | `text-sm` to `text-xl` | Section titles |
| KPI numbers | `text-3xl` – `text-5xl` | Dashboard stats |

---

## Utilities

### `brutalist-border`
```css
@utility brutalist-border {
  border: 1px solid var(--clr-card-border);
  /* No border-radius — sharp edges */
}
```

### `scanline`
```css
@utility scanline {
  background: linear-gradient(to bottom, transparent 50%, rgba(108, 92, 231, 0.05) 51%);
  background-size: 100% 4px;
  pointer-events: none;
}
```

### `mono-clip`
```css
@utility mono-clip {
  clip-path: polygon(0 0, 100% 0, 100% 90%, 95% 100%, 0 100%);
}
```

### `data-grid`
```css
@utility data-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}
```

**Utilities that DID NOT exist:**
- ~~`card-hover-lift`~~ — cards used `hover:bg-card/80` or `hover:translate-x-[1px] hover:translate-y-[1px]` (translate DOWN, brutalist push effect)
- ~~`shimmer`~~ — skeletons used `animate-pulse` (Tailwind's basic opacity blink)
- ~~`accent-glow`~~ — no text glow effects

---

## Skeleton Component

```tsx
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-surface-container-high/40 brutalist-border",
        className
      )}
      {...props}
    />
  );
}
```

All skeleton wrappers in `dashboard-skeleton.tsx` used `className="space-y-6 animate-pulse"`.

---

## Transitions

Only `background-color`, `color`, and `border-color` were transitioned:

```css
a, button, [role="button"], input, select, textarea, .brutalist-border {
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;
}
```

**No transitions for:** `transform`, `box-shadow`, `opacity`
**No page transition animations** — hard cuts between routes.

---

## Component Patterns

### KPI Cards (Dashboard)
```tsx
/* Brutalist push-down on hover + flat color change */
className={`brutalist-border bg-card p-4 border-t-4 ${k.border}
  hover:bg-card/80 transition-colors group block`}
```

### Task Cards (Kanban)
```tsx
/* Brutalist: translate DOWN + remove shadow on hover */
className="brutalist-border bg-card p-3 cursor-pointer
  hover:bg-surface-container-high
  hover:translate-x-[1px] hover:translate-y-[1px]
  hover:shadow-none
  shadow-[2px_2px_0px_rgba(0,0,0,0.1)]
  transition-all group border-black/10"
```

### Sidebar Nav Items
```tsx
className={cn(
  "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors
   font-label uppercase text-[11px] tracking-widest",
  isActive
    ? "bg-primary-container/20 text-primary border-l-2 border-l-primary"
    : "text-outline hover:bg-card/5 hover:text-foreground
       border-l-2 border-l-transparent"
)}
```

### Tech-Style Labels
Labels used `SCREAMING_SNAKE_CASE` format:
- `DIRECT_MESSAGES`, `NEW_DM`, `NO_MESSAGES_YET`
- `CREATE_CHANNEL`, `SELECT_MEMBERS`, `DESELECT_ALL`
- `HOURS_LOGGED`, `TEAM_PRODUCTIVITY_SNAPSHOT`
- `ACTIVE_PROJECTS`, `DUE_THIS_WEEK`, `IN_REVIEW`

---

## Performance Config

### Dashboard Layout
```tsx
export const dynamic = "force-dynamic";
// Every navigation re-fetched brands, channels, allClients, unreadCount
```

### Overview Page
```tsx
export const dynamic = "force-dynamic";
// 12+ parallel DB queries on every load
```

### next.config.ts
- **No `staleTimes`** — Next.js 15 defaulted to zero client-side router cache
- Every link click triggered a full server round-trip

---

## Chat Behavior

### Auto-scroll (Buggy)
```tsx
// Fired on EVERY message state change — including history loads
useEffect(() => {
  if (scrollRef.current) {
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }
}, [messages, typingUsers]);
```

### DM Channel Creation (Race Condition)
```tsx
// Non-atomic: findFirst → create could produce duplicates
const existing = await db.chatChannel.findFirst({ ... });
if (existing) return existing;
const channel = await db.chatChannel.create({ ... });
```

### Chat Empty State
```tsx
<span className="material-symbols-outlined text-4xl text-on-surface/20 mb-2">
  chat_bubble_outline
</span>
<p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">
  NO_MESSAGES_YET
</p>
```

---

## Root Layout Theme Color

```tsx
{ media: "(prefers-color-scheme: dark)", color: "#0A0A0A" }
```

---

## How to Restore

To fully revert to the previous design system:

```bash
# Restore from the pre-transformation commit
git checkout fea0a01 -- src/styles/globals.css
git checkout fea0a01 -- src/components/ui/skeleton.tsx
git checkout fea0a01 -- src/components/layout/main-content-container.tsx
git checkout fea0a01 -- next.config.ts
git checkout fea0a01 -- src/app/layout.tsx
git checkout fea0a01 -- src/app/(dashboard)/layout.tsx
git checkout fea0a01 -- src/app/(dashboard)/overview/page.tsx

# Remove new file
git rm src/components/layout/page-transition.tsx

# Restore all component text sizes (bulk)
git checkout fea0a01 -- src/components/
git checkout fea0a01 -- src/app/

# Commit the restoration
git add -A && git commit -m "restore: revert to previous brutalist design system"
```

Or simply:
```bash
git revert 1cf6500
```
