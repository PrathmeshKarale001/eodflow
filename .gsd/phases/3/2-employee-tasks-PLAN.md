---
phase: 3
plan: 2
wave: 2
depends_on: ["1"]
files_modified: ["src/app/(dashboard)/tasks/page.tsx", "src/components/tasks/my-tasks-list.tsx", "src/components/tasks/task-detail-drawer.tsx", "src/app/actions/task-submissions.ts"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use startTransition for status updates (rerender-transitions). Use functional setState (rerender-functional-setstate). Defer heavy renders with useDeferredValue (rerender-use-deferred-value)."
  - "frontend-design: Employee task list must feel like a mission control manifest — compact rows, stark priority indicators, inline status chips. Task Detail drawer is a full-height side panel with scanline texture background."
must_haves:
  truths:
    - "Employees see only their assigned tasks on /tasks."
    - "Employees can upload deliverables (files) against a Task."
    - "Employees can move their task to IN_REVIEW to trigger the first gate."
  artifacts:
    - "src/app/(dashboard)/tasks/page.tsx renders the Employee task list, filtered by session user."
    - "src/components/tasks/task-detail-drawer.tsx shows full task context and a file upload zone."
---

# Plan 3.2: Employee Task View & Deliverable Submissions

<objective>
Build the Employee's `/tasks` page showing only their assigned tasks. Employees can open a task detail drawer/panel to view the brief context, upload deliverables, and move their task status to `IN_REVIEW` — initiating the first gate of the two-gate approval flow.

**Skill Directives:**
- **Vercel React**: Use `startTransition` for status updates to keep the UI responsive. Use Suspense for the task list loading state. Minimize client bundle by keeping data fetching in Server Components.
- **Frontend Design**: The task list should feel like a mission control flight manifest — compact single-line rows with inline priority chips (URGENT = red, HIGH = orange), assignee initials, and due-date countdowns. The detail drawer slides in from the right with a `.scanline` textured background header.
</objective>

<context>
- prisma/schema.prisma (Task, File models)
- src/lib/permissions.ts (moveOwnTask, uploadFiles)
- src/lib/storage.ts
- src/app/actions/tasks.ts (from Plan 3.1)
</context>

<tasks>

<task type="auto">
  <name>Employee Task List Page</name>
  <files>src/app/(dashboard)/tasks/page.tsx, src/components/tasks/my-tasks-list.tsx</files>
  <action>
    Build the `/tasks` route:
    1. Server Component fetches tasks WHERE `assignedToId = session.user.id`.
    2. Group by status: TODO, IN_PROGRESS, IN_REVIEW, DONE.
    3. Each group is a collapsible section with count badge.
    4. Each row shows: title (truncated), priority chip, due date, status chip.
    5. Clicking a row opens the Task Detail Drawer.

    Adhere to:
    - `server-parallel-fetching`: Fetch tasks and user profile in parallel.
    - `rendering-content-visibility`: Use `content-visibility: auto` for long lists.
    - Frontend Design: Compact rows, no gaps — industrial density. Priority chips use solid color fills (not outline).
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Employee task list renders only assigned tasks grouped by status.</done>
</task>

<task type="auto">
  <name>Task Detail Drawer with Deliverable Upload</name>
  <files>src/components/tasks/task-detail-drawer.tsx, src/app/actions/task-submissions.ts</files>
  <action>
    Build a slide-in drawer component:
    1. Shows task title, description, brief context, subtasks checklist.
    2. Includes a "DELIVERABLES" section with file dropzone (reuse pattern from brand-assets-manager).
    3. Upload files via `storage.ts`, create `File` records tagged with `taskId`.
    4. "SUBMIT_FOR_REVIEW" button moves task to `IN_REVIEW` status via server action.
    5. Use `startTransition` for the status update to keep drawer responsive.

    Server action `submitForReview(taskId)`:
    - Validates the user is the assignee.
    - Updates task status to `IN_REVIEW`.
    - Revalidates `/tasks` and `/projects/[projectId]`.

    Adhere to:
    - `rerender-transitions`: Wrap status update in startTransition.
    - `bundle-dynamic-imports`: Lazy-load the drawer component.
    - Frontend Design: Drawer has a dark header with `.scanline` overlay, white body with `.brutalist-border` sections.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Drawer opens, shows task detail, accepts file uploads, and the submit-for-review button transitions the task status.</done>
</task>

</tasks>

<success_criteria>
- [ ] /tasks page shows only the logged-in employee's tasks.
- [ ] File uploads against tasks persist in Supabase + Prisma.
- [ ] IN_REVIEW status transition works via server action.
</success_criteria>
