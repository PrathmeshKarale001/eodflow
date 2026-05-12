---
phase: 3
plan: 1
wave: 1
depends_on: []
files_modified: ["src/app/(dashboard)/projects/[id]/page.tsx", "src/components/tasks/task-column.tsx", "src/components/tasks/task-card.tsx", "src/app/actions/tasks.ts"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use Server Components for data fetching (server-parallel-fetching). Use Suspense boundaries (async-suspense-boundaries). Avoid barrel imports (bundle-barrel-imports). Use ternary, not && for conditionals (rendering-conditional-render)."
  - "frontend-design: Follow the established brutalist-border/data-grid/mono-clip/scanline design system. Typography must use font-headline (JetBrains Mono) for labels and font-body (Inter) for content. No rounded corners. No generic AI aesthetics."
must_haves:
  truths:
    - "A Project detail page displays Tasks grouped by TaskStatus as vertical columns (Kanban layout)."
    - "Managers can create Tasks within a Project and assign them to Employees."
    - "Each Task Card shows title, priority badge, assignee avatar, and due date."
  artifacts:
    - "src/app/(dashboard)/projects/[id]/page.tsx renders a full-width Kanban board."
    - "src/app/actions/tasks.ts contains createTask and updateTaskStatus server actions."
---

# Plan 3.1: Kanban Board & Task Creation

<objective>
Build the Project Detail view as a horizontal Kanban board where Tasks are displayed in status columns. Managers can create new Tasks and assign them to Employees. This is the core operational surface where work gets delegated after a Brief is submitted.

**Skill Directives:**
- **Vercel React**: Data fetching happens in the Server Component. Task columns are RSC-rendered. Only the drag-drop and create-task interactions are Client Components.
- **Frontend Design**: The Kanban must feel like a brutalist operations terminal — `.brutalist-border` card containers, uppercase `font-headline` status column headers, `.mono-clip` action buttons. No soft rounded corners. Cards have stark contrast.
</objective>

<context>
- prisma/schema.prisma (Task, Subtask, Project models)
- src/lib/permissions.ts (createTask, assignTask permissions)
- src/lib/storage.ts (for task file attachments)
</context>

<tasks>

<task type="auto">
  <name>Server Actions for Task CRUD</name>
  <files>src/app/actions/tasks.ts</files>
  <action>
    Create server actions:
    1. `createTask({ projectId, title, description, priority, assignedToId, dueDate })` — inserts into Prisma, revalidates `/projects/[id]`.
    2. `updateTaskStatus({ taskId, status })` — updates the `status` field, revalidates.
    3. `getProjectTasks(projectId)` — parallel fetch with Promise.all for tasks + team members.

    Adhere to:
    - `server-auth-actions`: Verify session before mutating.
    - `async-parallel`: Use Promise.all for independent fetches.
    - `js-early-exit`: Return early on auth failure.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>All three server actions compile without errors and enforce auth checks.</done>
</task>

<task type="auto">
  <name>Kanban Board UI</name>
  <files>src/app/(dashboard)/projects/[id]/page.tsx, src/components/tasks/task-column.tsx, src/components/tasks/task-card.tsx</files>
  <action>
    Build the Project Detail page:
    1. Server Component fetches project + tasks + team members via parallel Promise.all.
    2. Group tasks by `status` into columns: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE.
    3. Each column is a `TaskColumn` component with a `.brutalist-border` header and vertical list.
    4. Each task is a `TaskCard` displaying title, priority chip, assignee, and due date.
    5. Include a "CREATE_TASK" `.mono-clip` button at the top that opens a modal/inline form.
    6. The create-task form uses `react-hook-form` + `zod` for validation.

    Adhere to:
    - `rendering-conditional-render`: Use ternary for conditional renders.
    - `rerender-no-inline-components`: Define all components at module level.
    - Frontend Design: Brutalist card aesthetic — no `rounded-*`, stark 1px borders, uppercase labels.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Kanban board renders columns with grouped task cards and the create form validates inputs.</done>
</task>

</tasks>

<success_criteria>
- [ ] Project detail renders horizontal Kanban columns grouped by TaskStatus.
- [ ] Managers can create tasks with validated inputs and assign to team members.
- [ ] Server actions enforce auth and use parallel data fetching.
</success_criteria>
