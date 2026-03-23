---
phase: 1
plan: 3
wave: 3
depends_on: ["1", "2"]
files_modified: ["src/app/(dashboard)/layout.tsx", "src/components/dashboard-guard.tsx", "src/middleware.ts"]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Employees cannot access the Admin workspace."
    - "The UI structurally branches based on the authenticated user's role."
  artifacts:
    - "src/middleware.ts enforcing route protection"
    - "src/app/(dashboard)/ layout created"
---

# Plan 1.3: Role-Based Routing Architecture

<objective>
To establish the frontend foundation where different roles hit the same authentication gate but are visually and functionally routed to completely different dashboards (Agency Overview vs My Day).

Purpose: Validates the RBAC logic end-to-end (DB -> Session -> UI).
Output: Middleware rules, Dashboard layout shells.
</objective>

<context>
Load for context:
- src/lib/permissions.ts
- src/app/(auth)/login/page.tsx
- src/middleware.ts
</context>

<tasks>

<task type="auto">
  <name>Implement Middleware Guards</name>
  <files>src/middleware.ts</files>
  <action>
    Configure the middleware to read the `next-auth.session-token` (or intercept the NextAuth req cycle) and block access to `/overview` or `/admin` routes if the `session.user.role` lacks sufficient clearance.
    AVOID blocking public paths like `/login` or `/onboarding`.
  </action>
  <verify>npm run build</verify>
  <done>Middleware compiles and intercepts auth payload correctly.</done>
</task>

<task type="auto">
  <name>Build the Dashboard Routing Shell</name>
  <files>src/app/(dashboard)/layout.tsx</files>
  <action>
    Create a master layout for the authenticated zone. 
    It should read the server-side session and conditionally render the appropriate navigation (e.g. "Agency Overview" for SUPER_ADMIN vs "My Day" for EMPLOYEE).
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Types align and session properties correctly expose the role.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] An employee trying to navigate to `/admin/system` receives a 403 or redirect.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
