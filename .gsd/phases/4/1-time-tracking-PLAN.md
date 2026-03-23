---
phase: 4
plan: 1
wave: 1
depends_on: []
files_modified: ["src/app/actions/time-entries.ts", "src/components/time/time-logger.tsx", "src/components/tasks/task-detail-drawer.tsx"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use functional setState for timer updates (rerender-functional-setstate). Use useRef for the interval timer (rerender-use-ref-transient-values). Minimize re-renders by extracting the timer display into a memoized subcomponent (rerender-memo)."
  - "frontend-design: Timer must feel like a brutalist stopwatch — monospace digits, stark borders. Start/Stop button uses .mono-clip with green/red states. Log entries render as a dense table with 1px borders."
must_haves:
  truths:
    - "Employees can log time against their assigned tasks."
    - "Time entries are persisted in the Prisma TimeEntry model."
    - "A running timer can be started/stopped from the Task Detail Drawer."
  artifacts:
    - "src/app/actions/time-entries.ts contains createTimeEntry and getTaskTimeEntries server actions."
    - "src/components/time/time-logger.tsx renders an interactive timer and entries list."
---

# Plan 4.1: Time Tracking & Logging

<objective>
Build the time-tracking module. Employees can start/stop a timer or manually log time against their assigned tasks. Time entries are persisted and displayed as a dense log within the Task Detail Drawer. This enables the foundation for workload analytics and productivity insights.

**Skill Directives:**
- **Vercel React**: Store the interval ID in a `useRef` to avoid re-renders. Use `functional setState` for incrementing the timer. Extract the display digit component to prevent parent re-renders.
- **Frontend Design**: Monospace timer digits (`font-mono text-2xl`), `.mono-clip` Start (green) / Stop (red) button. Time entries table has brutalist 1px borders and dense rows.
</objective>

<context>
- prisma/schema.prisma (TimeEntry model: durationMins, notes, startedAt, stoppedAt)
- src/lib/permissions.ts (logTime, viewTeamTime)
- src/components/tasks/task-detail-drawer.tsx (embedding point)
</context>

<tasks>

<task type="auto">
  <name>Time Entry Server Actions</name>
  <files>src/app/actions/time-entries.ts</files>
  <action>
    Create server actions:
    1. `createTimeEntry({ taskId, durationMins, notes, startedAt, stoppedAt })` — Validates `logTime` permission. Creates TimeEntry with Prisma. Revalidates paths.
    2. `getTaskTimeEntries(taskId)` — Fetches all time entries for a task including user name. Returns sorted by date desc.
    
    Both actions authenticate via session and validate permissions.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Both server actions compile and enforce auth + RBAC.</done>
</task>

<task type="auto">
  <name>Time Logger Component</name>
  <files>src/components/time/time-logger.tsx</files>
  <action>
    Build the TimeLogger client component:
    1. Interactive stopwatch with Start/Stop toggle button.
    2. Timer uses `useRef` for interval ID and `functional setState` for seconds count.
    3. On Stop: calls `createTimeEntry` with calculated duration.
    4. Manual entry form: durationMins + notes fields.
    5. Displays time entry history table below the timer.
    6. Integrate into TaskDetailDrawer as a collapsible section.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Timer starts/stops, persists entries, and displays history.</done>
</task>

</tasks>

<success_criteria>
- [ ] Employees can start/stop a timer against tasks.
- [ ] Manual time entry with notes works.
- [ ] Time entries display in a dense brutalist table.
</success_criteria>
