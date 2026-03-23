# EOD Flow — GSD Execution Roadmap

> **Methodology:** Get Shit Done (GSD)
> **Approach:** Goal-backward planning, vertical slices, 2-gate workflow

---

## Phase 1: Database Foundation & Auth Expansion
**Goal:** The underlying data layer exists, roles are enforced via RBAC, and users can log in to distinct base views.

- **Plan 1.1: Core Schema & RBAC**
  - Define `User`, `Client`, `Project`, `Task`, `File` models in Prisma.
  - Implement the `Role` enum (SUPER_ADMIN, ADMIN, MANAGER, EMPLOYEE).
  - Define the `permissions.ts` utility and hook it into middleware.
- **Plan 1.2: Client & User Seed Data**
  - Scaffold 3-5 users across the 4 roles.
  - Scaffold initial clients (Arome World, Solitario Diamonds, Goosebumps Arena).
- **Plan 1.3: Role-Based Routing Architecture**
  - Create the base layout scaffolding for the 4 distinct dashboards.
  - Enforce permission boundaries on API routes.

---

## Phase 2: The Brief Intake & Media Library
**Goal:** Admins can structure incoming work and centralize all assets, eliminating WhatsApp dependence.

- **Plan 2.1: Client Workspaces & Brand Assets**
  - Implement Supabase Storage buckets.
  - Build the Admin view for managing permanent `Brand Assets` (fonts, logos, PDF guidelines).
- **Plan 2.2: Structured Brief Creation**
  - Build the "New Project" intake form for Admins (objective, deliverables, deadlines, manager assignment).
  - Implement the file upload dropzone for "Brief Attachments."

---

## Phase 3: Task Delegation & Delivery (The Core Loop)
**Goal:** Managers can break down briefs, assign work, and employees can submit deliverables for the two-gate review.

- **Plan 3.1: Manager Breakdown View**
  - UI for turning a Project Brief into individual Tasks (assignees, priorities, subtasks).
- **Plan 3.2: Kanban & Employee "My Day"**
  - Implement `@dnd-kit/core` Kanban board for Managers.
  - Implement the "My Day" priority list for Employees.
- **Plan 3.3: Execution & File Upload**
  - Task details slide-over pane.
  - Employee capability to upload Draft deliverables.
- **Plan 3.4: The Two-Gate Review System**
  - Manager -> `In Review` approval/rejection interface.
  - Admin -> `Client Approval` transition logic.

---

## Phase 4: Accountability & Oversight
**Goal:** Directors have real-time visibility and bottlenecks are flagged.

- **Plan 4.1: Activity Log & Time Tracking**
  - Implement the immutable `ActivityLog` table tracking all state changes.
  - Add start/stop timer component to Employee task views.
- **Plan 4.2: Super Admin "Agency Overview"**
  - Read-only dashboard charting active projects, overdue tasks, and delivery rates.
  - Workload heatmap (Hours active vs available per team member).

---

## Phase 5: Communication layer & Realtime Sync
**Goal:** The system feels alive. Zero reloading necessary. All context stays in-app.

- **Plan 5.1: Task-Level Comments**
  - Basic threaded comments on tasks.
- **Plan 5.2: Supabase Realtime Bindings**
  - Subscribe Kanban boards to `postgres_changes`.
  - Add presence indicators ("Priya is viewing this task").

---

## Final Validation (GSD Goal-Backward Check)
*If we complete Phase 3, does it solve the #1 Pain point?* 
**Yes.** Files are no longer in WhatsApp; they live permanently inside the assigned brief flow, governed by explicit status states.

*How to proceed:*
Use the command **`/plan {Phase #}`** to break down a specific phase into execution prompts, or **`/execute {Phase #}`** if the plans are already derived.
