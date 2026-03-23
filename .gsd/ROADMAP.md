# EOD Flow — GSD Execution Roadmap

> **Methodology:** Get Shit Done (GSD)
> **Approach:** Goal-backward planning, vertical slices, 2-gate workflow

---

## Phase 1: Database Foundation & Auth Expansion
**Status**: ✅ Complete
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
**Status**: ✅ Complete
**Goal:** Admins can structure incoming work and centralize all assets, eliminating WhatsApp dependence.

---

## Phase 3: Task Delegation & Delivery (The Core Loop)
**Status**: ✅ Complete
**Goal:** Managers can break down briefs, assign work, and employees can submit deliverables for the two-gate review.

---

## Phase 4: Accountability & Oversight
**Status**: ✅ Complete
**Goal:** Directors have real-time visibility and bottlenecks are flagged.

---

## Phase 5: Communication layer & Realtime Sync
**Status**: ✅ Complete
**Goal:** The system feels alive. Zero reloading necessary. All context stays in-app.
