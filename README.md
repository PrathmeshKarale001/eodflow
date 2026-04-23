# EOD Flow — Internal Task Management System

**End Of Day Media — We Get It Done**

A custom-built task management system for EOD Media, a 360° integrated marketing, advertising, and production agency based in Pune, India (Lokshahi Group).

---

## Quick Start

### Prerequisites

- **Node.js** 18.18+ (recommend 20 LTS)
- **Supabase** account (free tier works: [supabase.com](https://supabase.com))
- **Cursor** or VS Code

### 1. Clone & Install

```bash
cd eod-flow
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard)
2. Go to **Settings → Database** and copy the connection string
3. Go to **Settings → API** and copy the URL + anon key

### 3. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_REF.supabase.co:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://YOUR_REF.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"
```

Generate your NextAuth secret:
```bash
openssl rand -base64 32
```

### 4. Initialize Database

```bash
npx prisma generate    # Generate Prisma client
npx prisma db push     # Push schema to Supabase
npx prisma db seed     # Seed demo data (10 users, 3 clients, 2 projects, 10 tasks)
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Login with Demo Accounts

All demo accounts use password: **`eodflow2026`**

| Role | Email | Sees |
|------|-------|------|
| Super Admin (Director) | `director@eodmedia.in` | Everything |
| Admin (POC) | `priya@eodmedia.in` | Their clients |
| Manager | `kavita@eodmedia.in` | Their team's tasks |
| Employee | `ananya@eodmedia.in` | Only assigned tasks |

---

## Project Structure

```
eod-flow/
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Login page
│   │   ├── (dashboard)/           # Authenticated layout + sidebar
│   │   │   ├── overview/          # Role-based home dashboard
│   │   │   ├── clients/           # Client workspaces (Admin+)
│   │   │   ├── projects/          # Project boards (Manager+)
│   │   │   ├── tasks/             # Kanban boards + task detail
│   │   │   ├── files/             # Media library
│   │   │   ├── chat/              # Team messaging (Phase 2)
│   │   │   ├── reports/           # Dashboards (Phase 3)
│   │   │   └── settings/          # System settings (Super Admin)
│   │   └── api/                   # REST API routes
│   │       ├── auth/[...nextauth] # NextAuth handlers
│   │       ├── tasks/             # CRUD + status transitions
│   │       ├── projects/          # Project management
│   │       ├── clients/           # Client workspaces
│   │       ├── files/             # Upload + media library
│   │       ├── comments/          # Threaded comments
│   │       └── notifications/     # Notification management
│   ├── components/
│   │   ├── sidebar/               # Navigation sidebar
│   │   ├── kanban/                # Drag-drop board (build next)
│   │   ├── task-detail/           # Slide-in task panel
│   │   ├── file-viewer/           # Image/PDF/video preview
│   │   ├── brief-form/            # Structured brief intake
│   │   └── dashboard/             # Chart + KPI widgets
│   ├── lib/
│   │   ├── auth.ts                # NextAuth v5 configuration
│   │   ├── db.ts                  # Prisma client singleton
│   │   ├── permissions.ts         # RBAC — single source of truth
│   │   ├── realtime.ts            # Supabase realtime helpers
│   │   └── utils.ts               # Utilities (cn, formatDate, etc.)
│   ├── hooks/
│   │   └── use-permissions.ts     # React hook for RBAC checks
│   ├── types/                     # TypeScript interfaces
│   └── styles/
│       └── globals.css            # Tailwind + design system tokens
├── prisma/
│   ├── schema.prisma              # Database schema (14 models)
│   └── seed.ts                    # Demo data seeder
├── public/
│   └── manifest.json              # PWA manifest
├── .env.example                   # Environment template
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | PostgreSQL via Supabase |
| ORM | Prisma 6 |
| Auth | NextAuth.js v5 (JWT, 24h sessions) |
| Realtime | Supabase Realtime (WebSocket) |
| Files | Supabase Storage |
| Drag & drop | @dnd-kit |
| Icons | Lucide React |
| Charts | Recharts |
| Validation | Zod |
| State | Zustand |
| PWA | next-pwa + Workbox |

---

## RBAC System

Permissions are defined in a single file: `src/lib/permissions.ts`

```typescript
// In any component:
const { can, isAtLeast, isSuperAdmin } = usePermissions()

if (can('createProject'))    // → show "New Project" button
if (can('approveForClient')) // → show "Approve" action
if (isAtLeast('MANAGER'))    // → show workload view
```

In API routes:
```typescript
if (!hasPermission(role, 'createTask')) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

The middleware (`src/middleware.ts`) blocks unauthorized route access before any page loads.

---

## Task Status Flow

```
Backlog → To Do → In Progress → In Review → Client Approval → Approved → Done
                       ↑              ↓              ↓
                       └── Revision ←─┘    Client Revision
                       ↑                         ↓
                       └──────────────────────────┘
```

Status transitions are **enforced server-side** in `api/tasks/[id]/route.ts`. Invalid transitions return 400 errors. Role-based restrictions prevent employees from sending tasks to "Client Approval" (only managers+) or marking as "Approved" (only admins+).

---

## What to Build Next

This starter gives you: auth, RBAC, database, API routes, sidebar, and overview dashboard. Here's the build order for Phase 1:

### Week 1-2: Kanban Board
- Build `components/kanban/` with @dnd-kit
- Wire to `GET /api/tasks?projectId=X`
- Add realtime sync via `subscribeToProjectTasks()`

### Week 2-3: File Uploads
- Set up Supabase Storage bucket
- Build `api/files/route.ts` (upload endpoint)
- Build `components/file-viewer/` (inline preview)
- Add version tracking

### Week 3-4: Brief Intake + Projects
- Build `components/brief-form/` (structured form)
- Build `api/projects/route.ts`
- Build client workspace pages

### Week 4-5: Task Detail Panel
- Build slide-in panel (`components/task-detail/`)
- Comments with @mentions
- Subtask checklists
- Activity log per task

### Week 5-6: Polish + PWA
- Service worker setup
- Push notifications
- Mobile responsive layout
- Dark mode toggle
- Testing + bug fixes

---

## Useful Commands

```bash
npm run dev              # Start dev server (Turbopack)
npm run build            # Production build
npx prisma studio        # Visual database browser
npx prisma db push       # Push schema changes
npx prisma migrate dev   # Create migration
npx prisma db seed       # Re-seed demo data
```

---

## Environment Variables

See `.env.example` for the full list. Required for development:

- `DATABASE_URL` — Supabase PostgreSQL connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `NEXTAUTH_SECRET` — Random 32-byte base64 string
- `NEXTAUTH_URL` — `http://localhost:3000` for dev

---

Built with care for **End Of Day Media** — Pune, India.
