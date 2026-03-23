---
phase: 3
plan: 3
wave: 3
depends_on: ["1", "2"]
files_modified: ["src/components/tasks/review-panel.tsx", "src/app/actions/review.ts", "src/app/(dashboard)/projects/[id]/page.tsx"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use server-cache-react for deduplicating review fetch calls. Use after() for non-blocking notification side-effects (server-after-nonblocking)."
  - "frontend-design: The review panel is the most critical UI surface. It must feel authoritative — approval buttons are bold green .mono-clip, rejection/revision buttons are stark red .brutalist-border outlines. File previews use image thumbnails or PDF icons. Revision notes use a monospace textarea."
must_haves:
  truths:
    - "Managers can approve or request revision on tasks in IN_REVIEW status."
    - "Admins can perform the second gate (CLIENT_APPROVAL → APPROVED or CLIENT_REVISION)."
    - "Revision count increments on each revision request."
  artifacts:
    - "src/components/tasks/review-panel.tsx built with role-conditional actions."
    - "src/app/actions/review.ts handles approveTask, requestRevision, clientApprove, clientRequestRevision."
---

# Plan 3.3: Two-Gate Review & Approval Flow

<objective>
Implement the two-gate review system:
- **Gate 1 (Manager Review):** When an employee submits work (IN_REVIEW), the Manager can APPROVE (moves to CLIENT_APPROVAL) or REQUEST_REVISION (moves to REVISION, increments revisionCount).
- **Gate 2 (Client Approval):** When Manager approves, Admin can forward to client. Admin marks CLIENT_APPROVAL → APPROVED (done) or CLIENT_REVISION (back to employee).

This is the accountability backbone of the entire system.

**Skill Directives:**
- **Vercel React**: Non-blocking notification triggers via `after()`. Review data is cached per-request via `React.cache()`.
- **Frontend Design**: The review panel must feel authoritative and final — like a stamp of approval. APPROVE = bold green `.mono-clip` button with checkmark icon. REVISION = stark red outline button. File previews render as thumbnail grids. Revision notes use a monospace textarea with `.brutalist-border`.
</objective>

<context>
- prisma/schema.prisma (Task status flow, revisionCount)
- src/lib/permissions.ts (reviewTask, approveForClient, requestRevision)
- src/components/tasks/task-card.tsx (from Plan 3.1)
</context>

<tasks>

<task type="auto">
  <name>Review Server Actions</name>
  <files>src/app/actions/review.ts</files>
  <action>
    Create server actions:
    1. `approveTask(taskId)` — Manager gate. Moves IN_REVIEW → CLIENT_APPROVAL. Verifies `reviewTask` permission.
    2. `requestRevision(taskId, notes)` — Manager gate. Moves IN_REVIEW → REVISION. Increments `revisionCount`. Stores revision notes in ActivityLog metadata.
    3. `clientApproveTask(taskId)` — Admin gate. Moves CLIENT_APPROVAL → APPROVED. Verifies `approveForClient` permission.
    4. `clientRequestRevision(taskId, notes)` — Admin gate. Moves CLIENT_APPROVAL → CLIENT_REVISION. Increments `revisionCount`.

    All actions:
    - Authenticate via session.
    - Validate current task status before transition (no skipping gates).
    - Create ActivityLog entries for audit trail.
    - Revalidate relevant paths.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>All four review actions compile, enforce correct permission checks, and validate status transitions.</done>
</task>

<task type="auto">
  <name>Review Panel UI</name>
  <files>src/components/tasks/review-panel.tsx, src/app/(dashboard)/projects/[id]/page.tsx</files>
  <action>
    Build the ReviewPanel component:
    1. Renders inside the Kanban task detail view (or as a drawer extension).
    2. Shows submitted deliverables (file thumbnails/icons grid).
    3. Conditionally renders actions based on user role and task status:
       - If `IN_REVIEW` + user hasPermission(`reviewTask`): Show APPROVE (green) and REQUEST_REVISION (red) buttons.
       - If `CLIENT_APPROVAL` + user hasPermission(`approveForClient`): Show CLIENT_APPROVE and CLIENT_REVISION buttons.
       - If `REVISION` or `CLIENT_REVISION`: Show "Awaiting updated deliverables" status badge.
    4. Revision notes textarea appears when REQUEST_REVISION is clicked.
    5. Show revision count badge on the task card.

    Adhere to:
    - `rendering-conditional-render`: Use ternary for role-based rendering.
    - Frontend Design: Green approval = `.mono-clip bg-green-700 text-white`. Red revision = `.brutalist-border border-red-600 text-red-600 hover:bg-red-600 hover:text-white`.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Review panel renders correct actions per role and status. Revision count badge displays on task cards.</done>
</task>

</tasks>

<success_criteria>
- [ ] Gate 1: Manager can approve (→ CLIENT_APPROVAL) or request revision (→ REVISION).
- [ ] Gate 2: Admin can client-approve (→ APPROVED) or client-revise (→ CLIENT_REVISION).
- [ ] Revision count increments correctly on each revision request.
- [ ] ActivityLog entries created for all review actions.
</success_criteria>
