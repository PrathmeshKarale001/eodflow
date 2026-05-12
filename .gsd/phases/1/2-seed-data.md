---
phase: 1
plan: 2
wave: 2
depends_on: ["1"]
files_modified: ["prisma/seed.ts", "package.json"]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Test users exist for each of the 4 roles."
    - "Base clients exist to test relationship fetching."
  artifacts:
    - "prisma/seed.ts exists and runs cleanly"
---

# Plan 1.2: Client & User Seed Data

<objective>
To populate the database with realistic test data mirroring the agency's actual structure, enabling immediate testing of the RBAC and relational models.

Purpose: Without seed data, developing the role-based views in Plan 1.3 is impossible.
Output: prisma/seed.ts (created/updated)
</objective>

<context>
Load for context:
- prisma/schema.prisma
- EOD-FLOW-PROJECT-BRIEF.md (Section 1 and 4)
</context>

<tasks>

<task type="auto">
  <name>Create Prisma Seed Script</name>
  <files>prisma/seed.ts</files>
  <action>
    Create a script that hashes passwords (using `bcryptjs` or a mock hash if simplified initially, but next-auth is in use so bcrypt is necessary) and creates:
    - 1 `SUPER_ADMIN` user
    - 1 `ADMIN` user
    - 1 `MANAGER` user
    - 2 `EMPLOYEE` users
    Create clients: "Arome World", "Solitario Diamonds", "Goosebumps Arena".
    AVOID creating users without tying them to `passwordHash` matching the auth credentials expected.
  </action>
  <verify>npx tsx prisma/seed.ts</verify>
  <done>The database is successfully populated with 5 users and 3 clients.</done>
</task>

<task type="auto">
  <name>Register Seed Command</name>
  <files>package.json</files>
  <action>
    Add the `prisma.seed` configuration block mapping to `tsx prisma/seed.ts` so `npx prisma db seed` works universally.
  </action>
  <verify>cat package.json | grep "prisma"</verify>
  <done>Seed logic is globally registered in package.json.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Users with 4 distinct roles exist.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
