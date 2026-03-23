# Design System Specification: Ops Console v1.0

### 1. Overview & Creative North Star
**Creative North Star: "Brutalist Logistics"**
EOD Flow is an internal Command Center, not a consumer SaaS app. The aesthetic moves away from soft, friendly interfaces (glassmorphism and rounded corners) and strictly enforces a **utilitarian, brutalist, and data-dense** visual language.

It relies on precise grids, sharp edges, monospace typography, and micro-flourishes inspired by retro-futuristic terminals. The UI must always feel extremely fast, highly predictable, and un-distracting.

---

### 2. Colors & Surface Architecture
The palette is rooted in absolute blacks and deep charcoals, punctuated by a singular, high-energy violet and alerting tertiary colors.

*   **Background:** `#0A0A0A` (Deep Space Black) – The universal foundation.
*   **Foreground (Text):** `#e5e2e1` (Off-white) – Primary text color.
*   **Primary Accent:** `#c6bfff` (Primary) / `#6c5ce7` (Primary Container) – Used for primary actions, selections, and focus rings.
*   **Tertiary/Alerts:** `#ffb77d` (Tertiary) and `#ffb4ab` (Error) – Used for system warnings, congested states, and urgent tags.

**The "Ghost Border" Rule (`.brutalist-border`):** 
Divisions between content blocks are strictly handled by a 1px solid border at 15% white opacity: `border: 1px solid rgba(255, 255, 255, 0.15)`. No drop shadows or tonal depth.

---

### 3. Typography: Data Over Decoration
We use a dual-font strategy specifically designed for high-velocity reading and task scanning.

*   **Headlines, Labels & Data Metrics (JetBrains Mono):** Used for all structural titles, system statuses, KPIs, and button text. This ensures vertical alignment of numbers and gives the "terminal" feel.
    *   *Weight:* `400` (Regular), `700` (Bold), `800` (Extra Bold).
*   **Body Text & Paragraphs (Inter):** Used for readable, long-form content (e.g., brief descriptions, comment threads).
    *   *Weight:* `300` (Light), `400` (Regular), `600` (Semibold).

---

### 4. Layout & Grid: The `.data-grid` Protocol
The layout is rigidly structured around a 12-column CSS grid.
*   **`.data-grid` utility:** `display: grid; grid-template-columns: repeat(12, 1fr);` must be used for underlying structure.
*   Horizontal and vertical rhythm is maintained with standard 1px borders between grid cells.
*   Spacing is extremely tight or intentionally stark (zero padding on structural grid borders, heavy padding inside actual hero content).

---

### 5. Architectural Flourishes

*   **Sharp Edges (0px Radius):** All border radii must be exactly `0px`. No rounded buttons, no rounded cards. Exceptionally sharp.
*   **The CRT Scanline (`.scanline`):** A custom utility applied to the `<body>` or heavy structural containers to simulate an old monitor. It applies a repeating subtle horizontal gradient pattern.
*   **The Clipped Corner (`.mono-clip`):** Primary buttons or callout boxes must use this custom `clip-path` utility to cut off the bottom right corner (or top left), creating an angled, tactical shape instead of a boring rectangle.
*   **Custom Selection:** Highlighted text automatically uses `bg-primary-container text-white`.

---

### 6. Component Specifications For Future Pages

The below rules map exactly how the "Ops Console v1.0" design applies to incoming features (Phase 1+):

#### **Login & Sign Up Pages**
*   Must be centered within a `.data-grid` wireframe structure.
*   Inputs must have `.brutalist-border` with transparent backgrounds (`bg-transparent`). Focus states trigger a 1px solid `#6c5ce7` border, zero outline ring.
*   Primary Login/Signup button uses `.mono-clip` and `#6c5ce7` (Primary Container).
*   No marketing fluff or illustrations. Keep it strictly typographical.

#### **Onboarding Flow (Detailed)**
*   Will follow the segmented/progress bar steps but housed within distinct rectangular bordered boxes.
*   Current step active state uses the Primary color (`#6c5ce7`). 
*   No soft animations. Use immediate transitions or sharp horizontal slides.
*   Avatar uploads will be square, with a 1px ghost border.

#### **Dashboard (Agency Overview/User My Day)**
*   A strict matrix layout using `.data-grid`. 
*   KPI numbers (Team Capacity, Active Clients, Overdue Tasks) must utilize massive JetBrains Mono fonts.
*   Use System Status indicators (e.g., "CORE ENGINE: NOMINAL" in green, "API BRIDGE: CONGESTED" in tertiary orange).
*   The entire viewport is the boundary. Fill the screen.

#### **Kanban / Sprint Board**
*   Columns must be separated by `.brutalist-border`. 
*   Task cards are completely flat. 0px border radius. Hovering a card changes the border color to `#6c5ce7`, no drop shadow.
*   Priority tags on cards are represented by square colored dots or hard-angled labels.
*   Avatars on cards are square, not circular.

#### **Client Portals & Workspaces**
*   A strict left-sidebar navigation utilizing JetBrains Mono for menus.
*   Hover states on sidebar items use a solid background fill (`surface-container-high` equivalent or `rgba(255,255,255,0.05)`) with an accented left border.
*   File Vaults inside workspaces display as a stark table view, avoiding friendly icon grids in favor of data-dense lists. List headers use uppercase JetBrains Mono.

#### **Todo Lists**
*   Checkboxes are rigid squares.
*   Checking a box strikes through the Inter body text instantly and fades the row to 30% opacity. No bouncy check animations.

---

### 7. Do's and Don'ts

**Do:**
*   **Do** use `0px` border radii globally. 
*   **Do** rely heavily on `.brutalist-border` for layout boxing.
*   **Do** write labels and system text in ALL CAPS JetBrains Mono.
*   **Do** integrate `.scanline` and `.mono-clip` for tactical depth without adding shadows.

**Don't:**
*   **Don't** use any `shadow-*` utility classes. 
*   **Don't** use rounded corners (`rounded-md`, `rounded-full`). Note: Circular profile pictures are the ONLY exception if strictly required by user avatars, but square is vastly preferred.
*   **Don't** use soft gradients, except for the `.scanline` background utility. Buttons and backgrounds must be solid.
*   **Don't** use generic success greens or error reds. Use muted versions that fit dark mode (`#ffb4ab`, etc.).