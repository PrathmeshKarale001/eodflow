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

---

## Phase 6: Advanced Communication & PWA
**Status**: 🔄 In Progress
**Goal:** The system replaces WhatsApp for work coordination. Team can annotate creatives, chat in-context, receive push notifications, and use the app offline.

- **Plan 6.1: Image/PDF Annotation System**
  - Canvas overlay on images/PDFs for pinning review feedback
  - Annotation data stored as JSON coordinates on Comment model
- **Plan 6.2: Team Chat (Project Channels + DMs)**
  - Project-specific chat channels (auto-created per project)
  - Direct messages between team members
  - Supabase Realtime broadcast for live chat
- **Plan 6.3: PWA Setup (Manifest + Service Worker + Offline)**
  - manifest.json, service worker via next-pwa
  - Install prompt, offline caching, app shell
- **Plan 6.4: Email Notifications (Resend Integration)**
  - Transactional emails for assignments, mentions, approvals
  - Configurable digest (realtime / daily / weekly)
- **Plan 6.5: Voice Notes on Comments**
  - MediaRecorder API for audio recording
  - Audio playback in comment thread
- **Plan 6.6: PWA Push Notifications**
  - Web Push API via service worker
  - Permission request on first interaction
  - Push channels: assignments, deadlines, mentions
