---
phase: 1
plan: 1
wave: 1
depends_on: []
files_modified: ["prisma/schema.prisma", "src/lib/permissions.ts", "src/middleware.ts"]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "The structural models are represented in Prisma."
    - "Roles drive permissions efficiently."
  artifacts:
    - "prisma/schema.prisma updated"
    - "src/lib/permissions.ts updated"
---

# Plan 1.1: Core Schema & RBAC

<objective>
To lay the database foundation for the Ops Console by translating the project brief's Entity Relationship diagram into a Prisma schema, and securing these boundaries with an RBAC permissions layer.

Purpose: Without the core data structures, UI cannot be bound to data safely.
Output: schema.prisma (updated), permissions.ts (updated)
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- EOD-FLOW-PROJECT-BRIEF.md (Section 9)
</context>

<tasks>

<task type="auto">
  <name>Update Prisma Schema</name>
  <files>prisma/schema.prisma</files>
  <action>
    Add the Enums: `Role`, `Department`, `ProjectStatus`, `TaskStatus`, `Priority`, `ActivityAction`, `NotificationType`.
    Add the Models explicitly detailed in the project brief: `User`, `Client`, `Project`, `Task`, `Subtask`, `File`, `Comment`, `TimeEntry`, `ActivityLog`, `Notification`, `Tag`, `TagsOnTasks`, `ProjectTemplate`.
    AVOID missing Foreign Key definitions; ensure relationships (e.g., `creatorId` mapped to `User`) are explicitly defined with `@relation` tags.
  </action>
  <verify>npx prisma validate</verify>
  <done>Prisma schema validates cleanly without relationship errors.</done>
</task>

<task type="auto">
  <name>Update RBAC Utility</name>
  <files>src/lib/permissions.ts</files>
  <action>
    Create a `PERMISSIONS` matrix that maps the 4 roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `EMPLOYEE`) to specific granular system actions dictated by the project brief.
    Expose a `hasPermission(role, action)` function for middleware/routes.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Permission matrix is strictly typed and exports successfully.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Schema push or migration generates without relational paradoxes.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
