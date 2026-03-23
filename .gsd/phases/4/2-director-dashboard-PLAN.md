---
phase: 4
plan: 2
wave: 2
depends_on: ["1"]
files_modified: ["src/app/(dashboard)/overview/page.tsx", "src/components/dashboard/agency-overview.tsx", "src/components/dashboard/stat-card.tsx", "src/components/dashboard/bottleneck-alerts.tsx"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use Server Components for all dashboard data aggregation (server-parallel-fetching). Use Promise.all for parallel count queries (async-parallel). Use content-visibility for long activity lists (rendering-content-visibility)."
  - "frontend-design: Dashboard should feel like a NASA mission control panel — dense data grids, stark number callouts, status-colored accent bars. Stat cards use large monospace numbers. Activity feed is a compact timeline with dot indicators."
must_haves:
  truths:
    - "Directors see an agency-wide overview with project counts, task status distributions, and team workload."
    - "Bottleneck alerts flag tasks stuck in REVISION or IN_REVIEW for too long."
    - "Recent activity feed shows the last N actions across the agency."
  artifacts:
    - "src/app/(dashboard)/overview/page.tsx renders the director dashboard."
    - "src/components/dashboard/bottleneck-alerts.tsx flags overdue/stuck tasks."
---

# Plan 4.2: Director Dashboard & Bottleneck Alerts

<objective>
Build the `/overview` dashboard that gives Directors (SUPER_ADMIN/ADMIN) real-time visibility into agency operations. Shows KPIs (active projects, task distributions, team utilization), flags bottleneck tasks (stuck in review, overdue), and provides a recent activity feed from the ActivityLog.

**Skill Directives:**
- **Vercel React**: All data aggregation runs in Server Components. Use `Promise.all` to parallelize 5+ count queries. No client-side data fetching needed — pure RSC.
- **Frontend Design**: NASA mission control aesthetic — large monospace stat numbers, `.brutalist-border` stat cards, colored accent bars per metric. Bottleneck alerts use red/amber warning styling. Activity timeline uses compact rows with dot status indicators.
</objective>

<context>
- prisma/schema.prisma (Task, Project, ActivityLog, TimeEntry)
- src/lib/permissions.ts (viewAgencyDashboard, viewTeamWorkload)
- src/lib/db.ts
</context>

<tasks>

<task type="auto">
  <name>KPI Stats and Overview Server Page</name>
  <files>src/app/(dashboard)/overview/page.tsx, src/components/dashboard/stat-card.tsx, src/components/dashboard/agency-overview.tsx</files>
  <action>
    Build the overview page:
    1. Server Component fetches all KPIs in parallel via Promise.all:
       - Total active projects count
       - Task counts grouped by status
       - Tasks overdue (dueDate < now AND status != DONE/APPROVED)
       - Tasks in REVISION or IN_REVIEW for > 48 hours
       - Team member count by department
       - Total time logged this week
    2. StatCard component: large monospace number, label, trend indicator, accent color bar.
    3. Task distribution bar chart (CSS-only, no chart library).
    4. AgencyOverview wraps the stat grid + distribution chart.

    Adhere to:
    - `async-parallel`: All DB queries in Promise.all.
    - Frontend Design: Cards use .brutalist-border, numbers use font-mono text-4xl, accent bars at top.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Dashboard renders 6+ KPI stat cards and a status distribution bar.</done>
</task>

<task type="auto">
  <name>Bottleneck Alerts & Activity Feed</name>
  <files>src/components/dashboard/bottleneck-alerts.tsx</files>
  <action>
    Build two dashboard sections:
    
    1. **Bottleneck Alerts:**
       - Query tasks WHERE (status IN [IN_REVIEW, REVISION, CLIENT_APPROVAL] AND updatedAt < 48hrs ago).
       - Render as warning cards with amber/red borders, task title, stuck duration, and assignee.
       - Empty state: "ALL_CLEAR — No bottlenecks detected."
    
    2. **Activity Feed:**
       - Query last 20 ActivityLog entries with user + task includes.
       - Render as compact timeline: dot indicator, action label, user, timestamp.
       - Use content-visibility for performance on long lists.

    Frontend Design:
    - Bottleneck cards: amber `.brutalist-border` for 24-48hr, red for 48hr+.
    - Activity feed: compact rows, dot indicators colored by action type.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Bottleneck alerts flag stuck tasks and activity feed shows recent actions.</done>
</task>

</tasks>

<success_criteria>
- [ ] Director dashboard renders KPI stats via parallel server queries.
- [ ] Bottleneck alerts flag tasks stuck > 48 hours.
- [ ] Activity feed shows the last 20 agency-wide actions.
</success_criteria>
