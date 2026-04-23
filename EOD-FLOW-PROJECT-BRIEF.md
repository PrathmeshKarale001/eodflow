# EOD Flow — Complete Project Brief

> **Internal Task Management System for End Of Day Media**
> Version 2.0 | March 2026 | Confidential — Internal Use Only

---

## Table of contents

1. [Agency context](#1-agency-context)
2. [Problem statement](#2-problem-statement)
3. [Product vision](#3-product-vision)
4. [User roles and hierarchy](#4-user-roles-and-hierarchy)
5. [Landing page and onboarding](#5-landing-page-and-onboarding)
6. [Brief lifecycle — how work flows](#6-brief-lifecycle--how-work-flows)
7. [Task status lifecycle](#7-task-status-lifecycle)
8. [Feature specifications](#8-feature-specifications)
9. [Database schema](#9-database-schema)
10. [Tech stack](#10-tech-stack)
11. [Realtime architecture](#11-realtime-architecture)
12. [Session and multi-device strategy](#12-session-and-multi-device-strategy)
13. [RBAC implementation](#13-rbac-implementation)
14. [File management strategy](#14-file-management-strategy)
15. [UI/UX design system](#15-uiux-design-system)
16. [PWA requirements](#16-pwa-requirements)
17. [Development roadmap](#17-development-roadmap)
18. [Launch strategy](#18-launch-strategy)
19. [Success metrics](#19-success-metrics)
20. [Future roadmap (post v1)](#20-future-roadmap-post-v1)

---

## 1. Agency context

### About End Of Day Media

- **Full name:** End Of Day Media — "We Get It Done"
- **Type:** 360° integrated marketing, advertising, and production agency
- **Parent company:** Lokshahi Group
- **Location:** Pune, Maharashtra, India
- **Team size:** 25–50 employees
- **Active clients:** 9–11 simultaneous accounts
- **Typical structure:** ~3–5 people per client account

### Services offered

- Social media creatives (design + copy)
- Branding and brand identity
- Performance marketing (Meta Ads, Google Ads)
- Website development
- Content strategy
- Production (video, photography)

### Known client accounts (for seed data and testing)

| Client | Industry | POC Type | Notes |
|--------|----------|----------|-------|
| Arome World (aromeworld.com) | Fragrance & Lifestyle | Content-heavy | Attars, EDPs, deos, air care. SEO blogs, social media |
| Solitario Diamonds | Luxury Jewellery (Lab-grown) | Campaign-driven | Pune/Dubai. Warner Bros. DC IP collection. Festive campaigns |
| Urban Katta | Live Music & Entertainment | Promotional | Premium venue. Event-based content |
| Goosebumps Arena | Indoor Entertainment (Hinjawadi) | Onboarding phase | New client |
| Reliteaur Foods | Gluten-free food (Kerala) | Research phase | AOECS certified |
| ImperaStack | Business Ventures | Pitch/strategy | TAM/SAM/SOM deck work |
| Aeromall Pune | Retail mall | Onboarding phase | New client |
| Innato Paints | Sustainable paint (cow dung-based) | LinkedIn content | Data-driven tone |
| CS Jewels | Heritage jewellery (est. 1827) | Anniversary campaign | 200th anniversary strategic presentation |

### Agency departments

- Design
- Copywriting
- Development
- Ads / Performance Marketing
- Strategy / Account Management
- Management (Directors)

---

## 2. Problem statement

### Current pain points

**1. File chaos (CRITICAL)**
Client briefs, brand assets, and deliverables are scattered across:
- WhatsApp groups (raw JPGs shared casually)
- Google Drive (disorganized folders)
- Email attachments
- Direct file shares

There is NO single source of truth for any client's assets. Team members waste significant time hunting for the right version of a file. This is the #1 pain point to solve.

**2. No visibility for leadership**
Directors and co-directors have no real-time view of:
- Which projects are on track vs. overdue
- How team workload is distributed
- Which clients are being over-serviced or under-serviced
Status updates happen through verbal check-ins and sporadic WhatsApp messages.

**3. Lost context at every handoff**
When a brief passes from Client → Admin (POC) → Manager → Employee, information degrades at each step. Requirements get lost, reference materials go missing, and feedback is scattered across different chat threads.

**4. No accountability trail**
No record of who assigned what, when tasks were completed, how many revision cycles a deliverable went through, or how much time was spent on each client.

**5. Manual coordination overhead**
Managers spend disproportionate time chasing status updates, re-sending files, and coordinating between team members instead of doing actual quality control.

### Target state

A centralized digital workspace where every brief, task, file, conversation, and decision is captured in context. The system automates coordination and gives each role exactly the visibility they need — no more, no less. The mantra: **"If it's not on the board, it doesn't exist."**

---

## 3. Product vision

### What is EOD Flow?

EOD Flow is a custom-built, internal-only task management system designed specifically for End Of Day Media's workflow. It is NOT a generic project management tool — it's built around the exact way an Indian marketing agency operates: client briefs come in, POCs refine them, managers break them down, employees execute, deliverables go through internal review then client approval, and directors maintain oversight.

### Core principles

1. **Brief-centric:** Everything starts from a client brief. The system is organized around the brief lifecycle, not abstract project management concepts.
2. **Role-aware:** Each person sees exactly what they need. An employee sees their tasks. A director sees the entire agency.
3. **File-first:** Solving the scattered file problem is the immediate value proposition. Every file has a home.
4. **Real agency workflow:** Two review gates (internal manager review + external client approval), revision loops, multi-client juggling — built for how agencies actually work.
5. **Mobile-ready:** Many team members check work on their phones. The PWA must feel native.

### What EOD Flow is NOT

- Not a client-facing tool (that's v2)
- Not a replacement for Slack/WhatsApp for casual chat (it has focused work chat)
- Not a time-billing or invoicing tool (time tracking feeds into analytics, not invoices)
- Not an external SaaS product (purely internal — though white-label is a future possibility)

---

## 4. User roles and hierarchy

### The four-tier system

```
┌─────────────────────────────────────────┐
│           CLIENT (External)             │
│    Gives brief + assets to Admin/POC    │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│         SUPER ADMIN (Tier 1)            │
│    Director / Co-Director               │
│    Sees EVERYTHING. Manages users,      │
│    settings, org-wide analytics.        │
│    Updated by Admins regularly.         │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│           ADMIN / POC (Tier 2)          │
│    Client point of contact              │
│    Sees only THEIR assigned clients.    │
│    Creates projects/briefs.             │
│    Reviews deliverables before client.  │
│    Manages client media library.        │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│          MANAGER (Tier 3)               │
│    Team lead / Department head          │
│    Sees THEIR TEAM's tasks.             │
│    Breaks projects into tasks.          │
│    Assigns to employees.               │
│    Reviews work quality internally.     │
│    Tracks team workload.               │
└──────────────────┬──────────────────────┘
                   ▼
┌─────────────────────────────────────────┐
│         EMPLOYEE (Tier 4)               │
│    Designer / Copywriter / Developer /  │
│    Ads Executive                        │
│    Sees ONLY their assigned tasks.      │
│    Uploads deliverables.               │
│    Logs time. Communicates via comments.│
└─────────────────────────────────────────┘
```

### Detailed permission matrix

| Action | Super Admin | Admin | Manager | Employee |
|--------|:-----------:|:-----:|:-------:|:--------:|
| View all clients | ✅ | ❌ (own only) | ❌ | ❌ |
| Create client workspace | ✅ | ❌ | ❌ | ❌ |
| Create project/brief | ✅ | ✅ | ❌ | ❌ |
| Assign projects to managers | ✅ | ✅ | ❌ | ❌ |
| Create and assign tasks | ✅ | ✅ | ✅ | ❌ |
| Move own tasks through status | ✅ | ✅ | ✅ | ✅ |
| Upload files/deliverables | ✅ | ✅ | ✅ | ✅ |
| Internal review (Manager gate) | ✅ | ✅ | ✅ | ❌ |
| Client approval (Admin gate) | ✅ | ✅ | ❌ | ❌ |
| Request revision | ✅ | ✅ | ✅ | ❌ |
| View team workload | ✅ | ✅ (own clients) | ✅ (own team) | ❌ |
| Access analytics/reports | ✅ | Limited | Limited | ❌ |
| Manage system settings | ✅ | ❌ | ❌ | ❌ |
| Manage users/invite team | ✅ | ❌ | ❌ | ❌ |
| Manage brand assets library | ✅ | ✅ | ❌ | ❌ |
| Delete projects/tasks | ✅ | ❌ | ✅ (tasks only) | ❌ |
| View full audit log | ✅ | ❌ | ❌ | ❌ |
| Manage templates | ✅ | ✅ | ❌ | ❌ |
| Export reports | ✅ | ❌ | ❌ | ❌ |

### What each role sees on login (default dashboard)

**Super Admin → "Agency overview"**
- All clients at a glance (card grid with brand colors)
- KPIs: active projects, overdue tasks, team utilization, delivery rate
- Workload heatmap across all teams
- Weekly trend charts
- Auto-generated weekly PDF reports

**Admin (POC) → "My clients"**
- Only their assigned client workspaces
- Per-client: project status, upcoming deadlines, pending approvals
- Brief inbox (structured brief creation from client requests)
- Client media library access
- Project timeline (Gantt view across their clients)

**Manager → "Sprint board"**
- Their team's task distribution (Kanban)
- Review queue: tasks waiting for their approval
- Team capacity meter (allocated vs. available hours)
- Burndown chart for active sprint
- Annotation/feedback tools

**Employee → "My day"**
- Today's priority tasks, sorted by deadline
- Task detail with brief context, attachments, subtask checklists
- Recent comments and @mentions
- Time logged today
- Read-only view of full project brief for context

---

## 5. Landing page and onboarding

### Landing / home page (pre-login)

EOD Flow needs a proper landing page — not just a login form. This is the first thing team members see. It should:

**Structure:**
1. **Hero section** — App name "EOD Flow" with tagline, brief description, and prominent "Get Started" / "Sign In" CTA
2. **Feature highlights** — 3-4 key value props with icons/illustrations (e.g., "Everything in one place", "Know who's doing what", "Never lose a file again", "Built for agencies")
3. **How it works** — Simple 3-step visual (Brief comes in → Tasks get assigned → Work gets delivered)
4. **Screenshot/preview** — A polished mockup of the dashboard showing the Kanban board or overview
5. **Footer** — "Built by End Of Day Media" with version, Lokshahi Group mention

**Design direction:**
- Should feel premium, modern, and on-brand with EOD Media's identity
- Can be a dark-themed hero (like the Hybrid Mind reference the user shared — dark bg, clean white typography, elegant layout)
- Should have smooth scroll animations and micro-interactions
- Must be responsive (desktop + mobile)
- "Get Started" leads to login page; for new users, shows an invite-required message

### Login page

- Clean, centered form with email + password
- EOD Flow logo/icon at top
- "End Of Day Media — We Get It Done" tagline
- Error handling for invalid credentials
- Redirect to role-appropriate dashboard on success
- "Contact your admin for an account" note (no self-signup — invite only)

### Onboarding flow (first login for invited users)

When a Super Admin invites a new team member:
1. They receive an email with an invite link
2. Link opens a setup page: set password, upload avatar, confirm department
3. On completion, they land on their role-appropriate dashboard with a brief guided tour (tooltip-style walkthrough of key areas)

---

## 6. Brief lifecycle — how work flows

This is the core workflow the entire system is built around:

```
Step 1: BRIEF INTAKE
Client sends brief (email, call, WhatsApp) → Admin logs into EOD Flow →
Creates a new Project under that client's workspace →
Fills structured brief form (objective, deliverables, references, deadline) →
Attaches all reference files (images, docs, videos, brand guidelines) →
Sets priority and deadline → Assigns a Manager

Step 2: BREAKDOWN
Manager receives notification → Opens the project →
Decomposes into individual tasks:
  "Design 10 Instagram posts"
  "Write 5 blog articles"
  "Set up Meta ad campaign"
Each task gets: assignee, due date, priority, estimated hours, subtasks

Step 3: EXECUTION
Employee sees task in "My Day" dashboard →
Opens task, reads brief + attachments →
Works on deliverable →
Uploads draft to the task →
Moves task status: To Do → In Progress → In Review

Step 4: INTERNAL REVIEW (Manager gate)
Manager gets notification →
Reviews deliverable quality →
Either:
  ✅ Approves → Moves to "Client Approval" (Admin gets notified)
  ❌ Revision needed → Moves to "Revision" with specific feedback
     (can annotate directly on images)

Step 5: CLIENT APPROVAL (Admin gate)
Admin reviews internally-approved deliverable →
Presents to client (outside the system for now; inside via client portal in v2) →
Either:
  ✅ Client approves → Moves to "Approved" → "Done"
  ❌ Client wants changes → Moves to "Client Revision"
     (feedback attached, bounces back to Employee)

Step 6: REPORTING (continuous)
Super Admins see real-time dashboards →
All actions logged in activity trail →
Weekly auto-generated PDF reports →
Time tracking data feeds into workload and profitability views
```

### Key insight: two review gates

This is what makes EOD Flow different from generic tools. Work goes through TWO approval checkpoints:
1. **Internal quality check (Manager)** — Catches errors before client sees anything
2. **Client-facing approval (Admin/POC)** — Ensures client satisfaction

Both gates can bounce work back with specific, annotated feedback.

---

## 7. Task status lifecycle

### Status flow diagram

```
BACKLOG → TODO → IN PROGRESS → IN REVIEW → CLIENT APPROVAL → APPROVED → DONE
                      ↑              ↓              ↓
                      └── REVISION ←─┘    CLIENT REVISION
                      ↑                         ↓
                      └─────────────────────────┘
```

### Status definitions

| Status | Owner | Description | Valid next statuses |
|--------|-------|-------------|-------------------|
| Backlog | Manager | Identified but not prioritized for current sprint | Todo |
| Todo | Employee | Assigned and ready to pick up | In Progress |
| In Progress | Employee | Actively being worked on | In Review |
| In Review | Manager | Employee submitted; Manager checks quality | Revision, Client Approval |
| Revision | Employee | Manager flagged issues with specific feedback | In Progress |
| Client Approval | Admin (POC) | Passed internal review; Admin presents to client | Approved, Client Revision |
| Client Revision | Employee | Client requested changes | In Progress |
| Approved | System | Client signed off | Done |
| Done | System | Completed and archived | Terminal (no further transitions) |

### Automated triggers on status change

- **→ In Review:** Notify Manager (push + in-app)
- **→ Client Approval:** Notify Admin/POC with deliverable preview
- **→ Revision / Client Revision:** Notify Employee, increment revision counter
- **→ Done (all tasks in project):** Auto-update project status to "Completed"
- **24h before due date + task is still "Todo":** Urgent reminder to Employee + Manager
- **Task overdue by 24h:** Red flag escalation on Manager's dashboard

### Status transition enforcement

Transitions are validated server-side. Invalid jumps (e.g., Backlog → Done, or Employee trying to move to Client Approval) return 400/403 errors. Role restrictions:
- Only Managers+ can move to "Client Approval"
- Only Admins+ can mark as "Approved"
- Employees can only move their own tasks through: Todo → In Progress → In Review

---

## 8. Feature specifications

### 8.1 Kanban task boards (Phase 1)

Primary task view using drag-and-drop. Each project has its own board with columns mapped to task status.

**Task card displays:**
- Task title
- Assignee avatar(s)
- Priority badge (color-coded: urgent=red, high=orange, medium=amber, low=gray)
- Due date (turns red if overdue)
- Attachment count icon
- Subtask completion progress (e.g., "3/5")
- Client brand color dot

**Additional views:**
- List view (table with sortable columns)
- Calendar view (tasks on due dates — like the Ofspace reference screenshots)
- Timeline / Gantt view (horizontal bars showing duration)
- Board view (default Kanban)

All views respect RBAC — employees see only their tasks, managers see their team's tasks, etc. Toggle between views with tabs (like the "Overview | Board | Calendar | File" tabs in the user's reference screenshots).

### 8.2 Structured brief intake (Phase 1)

When an Admin creates a new project, they fill a structured form, NOT free text. Fields:
- Project title
- Client (dropdown from their assigned clients)
- Objective — "What does the client want to achieve?"
- Deliverables — Checklist of expected outputs
- Reference materials — Drag-and-drop file upload area
- Brand guidelines link — Auto-populated from client workspace
- Priority (Urgent / High / Medium / Low)
- Deadline (date picker)
- Assigned manager (dropdown)
- Notes / additional context

Brief templates available for common work (e.g., "Monthly Social Media Retainer" auto-fills tasks).

### 8.3 File management and media library (Phase 1 — CRITICAL)

This directly solves the #1 pain point.

**Two-tier file organization:**

1. **Client brand assets (permanent)**
   - Logos (all formats), brand guidelines PDF, font files, color palette, templates
   - Uploaded once, accessible across ALL projects for that client
   - Managed by Admins only
   - Lives in the client workspace under a dedicated "Brand Assets" tab

2. **Project/task files (per-project)**
   - Brief attachments and reference materials
   - Deliverable uploads (drafts, finals)
   - Organized by project → task hierarchy
   - Version history: uploading v2 doesn't overwrite v1
   - Every version is accessible

**File capabilities:**
- Drag-and-drop upload (multi-file)
- Inline preview: images render directly, PDFs open in viewer, video plays in HTML5 player
- NO downloading required to review files
- Search across filenames and tags
- Filter by type (image, document, video), project, date
- Storage quota indicator per client
- Supported: JPG, PNG, SVG, PDF, DOCX, MP4, MOV, PSD, AI, ZIP

**Migration plan:** In week 1 of launch, each Admin uploads their client's core brand assets into the media library. From then on, the rule is enforced: if a file isn't in EOD Flow, it doesn't exist.

### 8.4 Communication layer (Phase 2)

**Task-level comments:**
- Threaded replies
- @mentions (trigger notifications to mentioned users)
- Rich text formatting
- Image annotations — pin a marker on a specific location of an image/PDF ("Move this logo 2px left" with a dot on the exact spot). Annotation data stored as JSON coordinates.
- Voice note attachments (designers prefer verbal feedback)

**Team chat (lightweight Slack alternative):**
- Project-specific channels (auto-created when project is made)
- Direct messages between team members
- File sharing within chat
- NOT meant to replace WhatsApp for casual conversation — focused on work coordination

### 8.5 Notification system (Phase 1-3, progressive)

| Channel | Use case | Phase |
|---------|----------|-------|
| In-app notification bell | All notifications: assignments, mentions, status changes, approvals | 1 |
| PWA push notifications | Urgent tasks, deadline reminders, DMs | 2 |
| Email digest | Configurable: real-time, daily, or weekly summary | 2 |
| WhatsApp (Business API) | Critical deadline reminders only ("You have 3 tasks due tomorrow") | 3 |

**Smart notification batching:** Don't spam. If 5 tasks are assigned at once, batch into one notification. Digest frequency is configurable per user.

### 8.6 Time tracking and workload (Phase 3)

**Per-task timer:**
- Built-in start/stop timer on each task
- Manual time entry as fallback
- Timer persists across page navigation (stores in state/localStorage)

**Workload heatmap (Manager view):**
- Grid: team members × days of current week
- Each cell shows allocated hours
- Color-coded: green (under capacity), amber (near capacity), red (overloaded)
- Drag tasks between team members to rebalance

**Client profitability (Super Admin view):**
- Time spent per client vs. retainer value
- Flags clients where agency is over-servicing
- Monthly trend chart

### 8.7 Dashboards and reporting (Phase 3)

Role-specific dashboards as described in Section 4.

**Weekly auto-report (emailed to Super Admins every Monday):**
- Completed tasks count
- New projects started
- Overdue items list
- Team hours logged
- Client-wise delivery status
- Generated as PDF via server-side rendering

### 8.8 AI-powered features (Phase 4)

Using Claude API (Anthropic):
- **Brief parser:** Paste raw client email → get structured brief (objective, deliverables, deadline)
- **Task description generator:** Given a brief, auto-generate individual task descriptions
- **Smart deadline estimation:** Based on historical task completion data
- **Weekly narrative summaries:** Natural language activity reports for Super Admins
- **Content suggestions:** For copywriting tasks, generate initial caption/copy drafts

### 8.9 Templates and automation (Phase 4)

**Project templates:**
- "Monthly Social Media Retainer" → auto-creates: 10 post designs, 10 captions, 5 stories, 1 reel, 1 content calendar, 1 performance report
- "Campaign Launch" → hero creatives, ad copy, ad setup, landing page
- "New Client Onboarding" → brand audit, competitor analysis, strategy deck, initial content batch

**Automation rules (when X → do Y):**
- When task status = "In Review" → notify assigned Manager
- When all subtasks completed → move parent task to "In Review"
- When task overdue by 24h → escalate to Manager dashboard as red flag
- When project created → auto-create project chat channel

### 8.10 Activity log and audit trail (Phase 1)

Every action logged with:
- Who (user)
- What (action type: created, updated, assigned, status_changed, commented, file_uploaded, approved, etc.)
- When (timestamp)
- Where (which task/project)
- Details (metadata: old value → new value)

Filterable by: user, project, client, action type, date range.
Immutable — no one (not even Super Admins) can edit or delete log entries.

### 8.11 Search and filters (Phase 1)

**Global search (Cmd+K / Ctrl+K):**
- Searches across: tasks, projects, clients, comments, filenames
- Results grouped by type
- Recent searches saved

**Advanced filters on boards:**
- By client, assignee, status, priority, date range, tags
- Saved filter views per user (e.g., "My overdue tasks", "Arome urgent")

---

## 9. Database schema

### Entity relationship overview

```
USERS ──< PROJECTS (creator, manager)
USERS ──< TASKS (assignee, creator)
USERS ──< COMMENTS
USERS ──< TIME_ENTRIES
USERS ──< FILES (uploader)

CLIENTS ──< PROJECTS
CLIENTS ──< FILES (brand assets)

PROJECTS ──< TASKS
PROJECTS ──< FILES (brief attachments)

TASKS ──< SUBTASKS
TASKS ──< COMMENTS
TASKS ──< FILES (deliverables)
TASKS ──< TIME_ENTRIES
TASKS ──< ACTIVITY_LOG
TASKS >──< TAGS (many-to-many via TagsOnTasks)
```

### Models (14 total)

**User** — id, name, email, passwordHash, image, role (enum), department (enum), isActive, invitedBy, lastLoginAt, createdAt, updatedAt

**Client** — id, companyName, brandColor, logoUrl, pocAdminId (FK→User), brandGuidelines (JSON), industry, retainerValue, website, isActive, createdAt, updatedAt

**Project** — id, clientId (FK), createdById (FK), assignedManagerId (FK), title, briefDescription, briefObjective, briefDeliverables, status (enum), priority (enum), deadline, templateId (FK), createdAt, updatedAt

**Task** — id, projectId (FK), assignedToId (FK), assignedById (FK), title, description, status (enum: 9 states), priority (enum), dueDate, estimatedHours, sortOrder, isRecurring, recurrenceRule, revisionCount, createdAt, updatedAt

**Subtask** — id, taskId (FK), title, isDone, sortOrder

**File** — id, uploadedById (FK), clientId (FK, nullable), projectId (FK, nullable), taskId (FK, nullable), filename, originalName, fileUrl, mimeType, fileSize, version, parentFileId (FK→File for versioning), createdAt

**Comment** — id, taskId (FK), userId (FK), parentId (FK→Comment for threading), content, annotationData (JSON: {x, y, width, height, fileId}), createdAt, updatedAt

**TimeEntry** — id, taskId (FK), userId (FK), durationMins, notes, entryDate, startedAt, stoppedAt, createdAt

**ActivityLog** — id, userId (FK), taskId (FK, nullable), projectId (FK, nullable), action (enum), metadata (JSON), createdAt

**Notification** — id, userId (FK), type (enum), title, body, linkUrl, isRead, metadata (JSON), createdAt

**Tag** — id, name (unique), color

**TagsOnTasks** — taskId + tagId (composite PK)

**ProjectTemplate** — id, name, description, defaultTasks (JSON array), createdAt

**Account / Session / VerificationToken** — NextAuth.js standard tables for authentication

### Key enums

```
Role: SUPER_ADMIN | ADMIN | MANAGER | EMPLOYEE

Department: DESIGN | COPY | DEVELOPMENT | ADS | STRATEGY | MANAGEMENT

ProjectStatus: DRAFT | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED

TaskStatus: BACKLOG | TODO | IN_PROGRESS | IN_REVIEW | REVISION |
            CLIENT_APPROVAL | CLIENT_REVISION | APPROVED | DONE

Priority: URGENT | HIGH | MEDIUM | LOW

ActivityAction: CREATED | UPDATED | DELETED | ASSIGNED | STATUS_CHANGED |
                COMMENTED | FILE_UPLOADED | FILE_VERSIONED | APPROVED |
                REJECTED | REVISION_REQUESTED | TIME_LOGGED

NotificationType: TASK_ASSIGNED | TASK_STATUS_CHANGED | COMMENT_ADDED |
                  MENTION | FILE_UPLOADED | DEADLINE_REMINDER |
                  APPROVAL_REQUESTED | REVISION_REQUESTED | PROJECT_CREATED
```

---

## 10. Tech stack

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | Next.js 15 (App Router, Turbopack) | SSR, file-based routing, API routes built-in, excellent AI-assisted coding support |
| **UI components** | shadcn/ui + Tailwind CSS v4 | Fully customizable, professional components. Avoids generic look |
| **Language** | TypeScript (strict) | Type safety across full stack, fewer runtime bugs |
| **Database** | PostgreSQL via Supabase | Free tier handles 25-50 users. Built-in realtime, storage, row-level security |
| **ORM** | Prisma 6 | Type-safe queries, auto-generated from schema, migrations |
| **Authentication** | NextAuth.js v5 | JWT sessions (24h), credentials provider, role injection |
| **Realtime** | Supabase Realtime | Task sync, presence, broadcast — single WebSocket per user |
| **File storage** | Supabase Storage (S3-compatible) | Signed URLs, CDN, per-client bucket isolation |
| **Drag-and-drop** | @dnd-kit/core + sortable | Modern, accessible, works with server components |
| **Image annotation** | Fabric.js | Lightweight canvas for pinning feedback on images/PDFs |
| **PDF preview** | react-pdf | Inline document viewing without downloads |
| **Charts** | Recharts | React-native charting for dashboards |
| **Icons** | Lucide React | 1000+ icons, same set as shadcn/ui |
| **Validation** | Zod | Runtime schema validation for API inputs |
| **State management** | Zustand | Lightweight, no boilerplate |
| **PWA** | next-pwa + Workbox | Install prompt, offline caching, push notifications |
| **Email** | Resend | Transactional emails for notifications and digests |
| **AI** | Claude API (Anthropic) | Brief parsing, task generation, summaries (Phase 4) |
| **Deployment** | Vercel (frontend) + Supabase (backend) | Zero-config deploys, preview URLs, auto-scaling |
| **CI/CD** | GitHub Actions | Automated testing, linting, type checking |
| **Dev tool** | Cursor + Stitch MCP | AI-assisted coding with visual UI generation |

---

## 11. Realtime architecture

### Three types of realtime, one provider

All handled by Supabase Realtime through a single WebSocket connection per user:

**Type A — Database changes (task sync)**
When anyone updates a task (drags a Kanban card, changes status, uploads a file), all connected clients viewing that project board update instantly. No refresh needed.
- Subscribe to: `postgres_changes` on `tasks` table filtered by `project_id`
- Latency: ~100ms

**Type B — Broadcast (chat + typing)**
For team chat messages and typing indicators. Ephemeral messages broadcast to all channel subscribers.
- Subscribe to: `broadcast` events on project channels
- No database writes for typing indicators

**Type C — Presence (online status)**
Track who's online, who's viewing the same board, "Priya is viewing this task" indicators. Green dots on avatars.
- Subscribe to: `presence` on page/view channels
- Auto-tracks join/leave events

### Scale consideration

At 25-50 concurrent users, Supabase Realtime handles this effortlessly (supports up to 200 concurrent connections on free tier, 10,000+ on paid). No need for Pusher, Ably, or Socket.io unless chat volume grows significantly later.

---

## 12. Session and multi-device strategy

### JWT-based authentication (not database sessions)

- Token strategy: JWT stored in HTTP-only cookie
- Session duration: 24 hours
- Auto-refresh: when token is within 4 hours of expiry, silently refresh in background
- Multi-device: each device gets its own independent JWT. Logging out of phone doesn't log out laptop.

### Practical experience

- Employee opens PWA on phone at 8:30am → logged in
- Works on laptop all day → separate session, same data
- Checks phone at 7pm → still logged in, tasks synced via realtime
- No re-login needed for daily active users (24h window resets on activity)

### PWA offline behavior

- Service worker caches app shell (JS, CSS, HTML)
- Task list cached for offline viewing
- File thumbnails cached
- Changes made offline queue and sync when connectivity returns
- Login page works offline (shows cached state or "no connection" message)

---

## 13. RBAC implementation

### Architecture: single source of truth

The RBAC system uses a simple, non-over-engineered approach:

**Layer 1 — Database:** Single `role` enum field on the User model. No permission tables, no role-action mapping tables.

**Layer 2 — Permissions file:** One TypeScript object (`permissions.ts`) defines what each role can do. 33 permission keys covering every action in the system. Change a permission here → applies everywhere.

**Layer 3 — Middleware:** Next.js middleware reads JWT role, blocks unauthorized route access before any page renders.

**Layer 4 — Row-level security:** Supabase RLS policies at the database level. Even if app code has a bug, Admins can never query another Admin's client data.

### Usage pattern

```typescript
// In React components:
const { can, isAtLeast } = usePermissions()
if (can('createProject')) → show button
if (isAtLeast('MANAGER')) → show workload view

// In API routes:
if (!hasPermission(role, 'assignTask')) → return 403 Forbidden

// In middleware:
if (path.startsWith('/settings') && role !== 'SUPER_ADMIN') → redirect
```

### Why NOT a complex ACL system

EOD has exactly 4 roles that won't change. There's no need for dynamic permission graphs, role-to-action mapping tables, or admin panels to manage permissions. The roles are hardcoded because the agency hierarchy is stable. When someone joins, a Super Admin invites them with a role dropdown — done.

---

## 14. File management strategy

### Solving the WhatsApp/Drive chaos

**Current state:** Files scattered across WhatsApp groups, Google Drive, email attachments, raw JPG shares. No organization, no versioning, no searchability.

**EOD Flow approach:**

```
Client Workspace
├── Brand Assets (permanent)
│   ├── Logos/
│   ├── Brand Guidelines.pdf
│   ├── Font Files/
│   └── Templates/
│
├── Project: April Social Media
│   ├── Brief Attachments/ (reference materials from client)
│   ├── Task: Instagram Posts/
│   │   ├── draft-v1.jpg (uploaded by Ananya)
│   │   ├── draft-v2.jpg (revision after feedback)
│   │   └── final-approved.jpg
│   └── Task: Blog Articles/
│       └── blog-attars.docx
│
└── Project: Gudi Padwa Campaign
    ├── Brief Attachments/
    └── Task: Hero Creatives/
        ├── hero-v1.psd
        └── hero-v2.psd
```

**File access rules:**
- Brand assets: accessible across all projects for that client (read by all team members on that account, write by Admins only)
- Project files: accessible by anyone with access to that project (per RBAC)
- Task files: accessible by task assignee + manager + admin + super admin

**Version tracking:**
- Each file has a `version` field and `parentFileId` for version chain
- Uploading a new version links to the parent — v1, v2, v3 all accessible
- "Compare versions" view for creatives (side-by-side)

---

## 15. UI/UX design system

### Design references (from user)

The user shared 4 reference screenshots:
1. **Ofspace LLC task board** — Calendar view with pastel task cards, left sidebar with project list, clean layout with generous whitespace
2. **Ofspace mobile + board** — Responsive design with collapsible sidebar, task cards with assignee avatars
3. **Hybrid Mind** — Dark premium aesthetic, elegant serif + sans typography mix, true black background, minimal layout
4. **EXLM Dashboard** — Clean light theme, card-based layout, subtle borders, minimal sidebar with icons

### Design DNA (what all references share)

- **Extremely generous whitespace** — content breathes
- **Subtle borders** — 0.5-1px, never heavy lines
- **Soft pastel task cards** — light fill + dark text from same color family
- **Large rounded corners** — 12-16px radius consistently
- **Clean sans-serif typography** — large sizes, high contrast
- **Minimal left sidebar** — icon + text, collapsible
- **Content-first** — no decorative clutter

### Color system

**Brand palette:**
| Token | Light mode | Dark mode | Usage |
|-------|-----------|-----------|-------|
| Primary | #6C5CE7 | #8B7CF7 | Brand accent, CTAs, active states |
| Background | #FAFAF8 | #0A0A0A | Page background (true black for dark) |
| Card | #FFFFFF | #141414 | Card/surface background |
| Border | #E8E8E4 | #2A2A28 | Subtle dividers |
| Text primary | #1A1A2E | #E8E8E4 | Headings, body text |
| Text secondary | #888880 | #707068 | Labels, metadata |
| Destructive | #E24B4A | #F09595 | Errors, overdue, urgent |

**Status colors (pastel badges):**
| Status | Background | Text |
|--------|-----------|------|
| Backlog | #F1EFE8 | #5F5E5A |
| Todo | #EEEDFE | #534AB7 |
| In Progress | #E6F1FB | #185FA5 |
| In Review | #FAEEDA | #854F0B |
| Revision | #FAECE7 | #993C1D |
| Client Approval | #FBEAF0 | #993556 |
| Client Revision | #FCEBEB | #A32D2D |
| Approved | #EAF3DE | #3B6D11 |
| Done | #D4F5E9 | #0F6E56 |

**Priority colors:**
| Priority | Badge color | Text |
|----------|-----------|------|
| Urgent | #FCEBEB | #E24B4A |
| High | #FAECE7 | #D85A30 |
| Medium | #FAEEDA | #BA7517 |
| Low | #F1EFE8 | #888780 |

**Client brand colors** (each client gets a dot/accent):
- Arome: #8B6914 (gold)
- Solitario: #1A1A2E (navy/luxury)
- Urban Katta: #E24B4A (red/energetic)

### Typography

- **Primary font:** Inter (or DM Sans) — clean, highly legible, used by Linear/Vercel
- **Heading scale:** 24px/500 (h1), 18px/500 (h2), 16px/500 (h3)
- **Body:** 14px/400
- **Meta text:** 13px/400 in secondary color
- **Overline labels:** 11px/500 uppercase with letter-spacing
- **Monospace (code/IDs):** JetBrains Mono

### Layout structure

```
┌──────────────────────────────────────────────────────────────┐
│ [Logo] EOD Flow          [Search] [🔔] [Avatar]              │ ← Top bar
├──────────┬───────────────────────────────────────────────────┤
│          │                                                    │
│ Sidebar  │  Main content area                                │
│ (240px)  │  Adapts to current view:                          │
│          │  - Kanban board                                   │
│ Overview │  - List / Table                                   │
│ My tasks │  - Calendar                                       │
│ Projects │  - Timeline / Gantt                               │
│ Clients  │  - Dashboard                                      │
│ Files    │                                                    │
│ Chat     │                          ┌────────────────────────┤
│ Reports  │                          │ Task detail panel      │
│ Settings │                          │ (slides in from right) │
│          │                          │ Comments, files,       │
│ ──────── │                          │ subtasks, activity     │
│ Clients: │                          │                        │
│ • Arome  │                          │                        │
│ • Solit. │                          │                        │
│ • Urban  │                          └────────────────────────┤
│          │                                                    │
│ [User]   │                                                    │
└──────────┴───────────────────────────────────────────────────┘
```

### Mobile layout (PWA)

- Sidebar collapses to **bottom tab bar** (5 tabs: Home, Tasks, Files, Chat, Profile)
- Kanban columns become **horizontally swipeable**
- Task detail opens as **full-screen bottom sheet** (slides up)
- Calendar view uses compact single-column layout
- Touch targets minimum 44px

### Key design rules

1. **Border radius: 12px everywhere** — cards, modals, dropdowns, inputs
2. **Borders: 0.5px or none** — hair-thin. Cards use subtle borders, not shadows
3. **Pastel task tags** — light fill + dark text from same color family, never saturated solid backgrounds
4. **Whitespace as UI element** — 32px+ between sections, 16px card padding
5. **Dark mode: true black (#0A0A0A)** — not gray-dark. Cards float with subtle borders
6. **Animations: 200ms ease** — micro-interactions on hover, drag, sidebar collapse
7. **No gradients, no shadows** — flat surfaces with border hierarchy (except functional focus rings)
8. **Client color dots** — every task card shows a small colored dot matching the client's brand color for instant visual grouping

### Micro-interactions

- Task cards lift slightly on hover (`translateY(-1px)`)
- Sidebar items have 150ms background fade on hover
- Status change triggers brief checkmark animation
- File upload shows smooth progress bar
- Toast notifications slide in from bottom-right with spring ease
- Drag-and-drop: card gets `scale(1.02)` and light elevation while dragging
- Kanban column placeholder shows dashed border pulse

---

## 16. PWA requirements

### Installation

- `manifest.json` with proper icons (192px, 512px)
- Service worker via `next-pwa` + Workbox
- Install prompt on first visit (dismissed if user says "not now")
- App name: "EOD Flow"
- Theme color: #6C5CE7

### Offline capabilities

- App shell (JS, CSS, HTML) fully cached
- Task list cached for offline viewing
- File thumbnails cached
- New task creation / status changes queue offline and sync on reconnect
- "You're offline" banner with pending changes count

### Push notifications

- Web Push API via service worker
- Permission request on first meaningful interaction (not immediately on load)
- Channels: task assignments, deadline reminders, mentions, approval requests
- Configurable per user (which types, which channels)

---

## 17. Development roadmap

### Phase 1 — Foundation (Weeks 1-6)

**Goal:** Team can create clients, log briefs, assign tasks, upload files, and track everything.

- Landing page + login/onboarding flow
- Authentication (NextAuth v5 with JWT, 24h sessions)
- RBAC (4-tier permissions, middleware, RLS)
- Client workspace management
- Projects + structured brief intake
- Task boards (Kanban drag-drop + List view)
- File uploads + media library with version history
- Activity log (audit trail)
- Global search (Cmd+K)
- Basic notification bell (in-app)

### Phase 2 — Communication (Weeks 7-10)

**Goal:** Team stops using WhatsApp for work coordination.

- Task comments with @mentions + threaded replies
- Image/PDF annotation (pin feedback on creatives)
- Full notification system (in-app + email digest + PWA push)
- Team chat (project channels + DMs)
- PWA setup (install prompt, offline caching, push)
- Voice note attachments on comments

### Phase 3 — Insights (Weeks 11-14)

**Goal:** Leadership has full visibility.

- Time tracking (built-in timer + manual entry)
- Workload heatmap (team capacity view)
- Role-specific dashboards with KPI widgets
- Calendar view + Timeline/Gantt view
- Weekly auto-generated PDF reports
- Client profitability tracking
- WhatsApp notification integration (Business API)

### Phase 4 — Intelligence (Weeks 15-18)

**Goal:** System becomes predictive and self-automating.

- AI brief parsing (Claude API)
- AI task description generation
- Automation rules engine (when X → do Y)
- Project + task templates
- Client portal foundation (v2 prep)
- Smart deadline estimation

---

## 18. Launch strategy

1. **Pilot with one client:** Pick the most active retainer account. Run the next project end-to-end through EOD Flow. Iron out friction for 2 weeks before wider rollout.

2. **Migrate core assets:** In the first week, each Admin uploads their client's brand assets into the media library. This creates the foundation for eliminating file chaos.

3. **Expand to all clients:** After successful pilot, onboard remaining client accounts one at a time over a 1-week window.

4. **Enforce adoption:** Set a hard cutoff date after which briefs not logged in EOD Flow are not considered active. "If it's not on the board, it doesn't exist."

5. **WhatsApp integration last, not first:** Phase 1 should get people INTO the app. WhatsApp reminders in Phase 2-3 are the nudge that drives adoption: "You have 3 tasks due tomorrow. Open EOD Flow to review."

---

## 19. Success metrics

Measure at 30, 60, and 90 days post-launch:

| Metric | Target (90 days) | How measured |
|--------|------------------|-------------|
| Daily active users | 80%+ of team | Auth session logs |
| Brief-to-task time | Under 2 hours | project.createdAt → first task.createdAt |
| File findability | Zero "where is the file?" WhatsApp messages | Qualitative survey + WhatsApp activity decline |
| On-time delivery | 85%+ tasks before due date | task.status=done AND updatedAt <= dueDate |
| Revision cycles | Average < 2 per task | Count of Revision status transitions |
| Manager review time | Within 4 hours of "In Review" | Status timestamp delta |
| System adoption | 100% active projects in EOD Flow | Projects in system vs. known accounts |
| Client satisfaction | Faster deliveries, fewer back-and-forths | Quarterly survey |

---

## 20. Future roadmap (post v1)

These are intentionally excluded from the 18-week build:

- **Client portal (v2):** Separate login for clients to submit briefs, view progress, approve deliverables, access their media library
- **Resource planning:** Visual team availability calendar, leave management integration
- **Invoice generation:** Auto-generate time-based invoices per client using logged hours
- **White-label SaaS:** If EOD Flow proves valuable, package it for other agencies (multi-tenant architecture supports this)
- **Third-party integrations:** Google Drive sync, Figma plugin, Meta Ads Manager data, Google Calendar deadline sync
- **Native mobile apps:** React Native for iOS/Android if PWA limitations become a barrier
- **Advanced analytics:** AI-powered insights on team performance, predictive project completion dates, bottleneck detection

---

## Appendix: Seed data for development

### Demo users (all password: `eodflow2026`)

| Name | Email | Role | Department |
|------|-------|------|------------|
| Rajesh Sharma | director@eodmedia.in | Super Admin | Management |
| Sneha Patil | codirector@eodmedia.in | Super Admin | Management |
| Priya Mehta | priya@eodmedia.in | Admin (POC) | Strategy |
| Arjun Deshmukh | arjun@eodmedia.in | Admin (POC) | Strategy |
| Kavita Joshi | kavita@eodmedia.in | Manager | Design |
| Vikram Kulkarni | vikram@eodmedia.in | Manager | Copy |
| Ananya Singh | ananya@eodmedia.in | Employee | Design |
| Rohit Pawar | rohit@eodmedia.in | Employee | Design |
| Meera Iyer | meera@eodmedia.in | Employee | Copy |
| Dev Thakur | dev@eodmedia.in | Employee | Ads |

### Demo clients

| Client | Brand Color | POC | Retainer |
|--------|-----------|-----|----------|
| Arome World | #8B6914 | Priya Mehta | ₹1,50,000/mo |
| Solitario Diamonds | #1A1A2E | Arjun Deshmukh | ₹2,50,000/mo |
| Urban Katta | #E24B4A | Priya Mehta | ₹80,000/mo |

### Demo project template

**"Monthly Social Media Retainer":**
1. Design 10 Instagram post creatives (Design, 12h)
2. Write 10 Instagram captions (Copy, 4h)
3. Design 5 story creatives (Design, 6h)
4. Create monthly content calendar (Copy, 2h)
5. Develop 1 reel concept (Design, 3h)
6. Write monthly performance report (Strategy, 2h)

---

*Built for End Of Day Media — Pune, India*
*Part of Lokshahi Group*
*EOD Flow v2.0 Brief — March 2026*
