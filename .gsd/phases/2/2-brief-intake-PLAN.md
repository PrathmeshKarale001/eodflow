---
phase: 2
plan: 2
wave: 2
depends_on: ["1"]
files_modified: ["src/app/(dashboard)/projects/new/page.tsx", "src/components/projects/create-project-form.tsx"]
autonomous: true
user_setup: []
must_haves:
  truths:
    - "New projects correctly link to a Client and assigned Manager."
    - "Files dropped during brief creation are correctly tagged to the Project ID."
  artifacts:
    - "New Project intake form functions seamlessly in the UI."
---

# Plan 2.2: Structured Brief Creation

<objective>
To build the "New Project" intake flow where Admins create structured briefs, select Clients, assign Managers, and attach initial project deliverables.

Purpose: Creates the core structural container (`Project`) that Managers will later break down into `Tasks` (Phase 3).
</objective>

<context>
- .gsd/SPEC.md
- prisma/schema.prisma (Project model)
- src/lib/storage.ts
</context>

<tasks>

<task type="auto">
  <name>Build New Project Form</name>
  <files>src/app/(dashboard)/projects/new/page.tsx, src/components/projects/create-project-form.tsx</files>
  <action>
    Create a server action (or API route) to handle database inserts for `Project`.
    Build `CreateProjectForm` using `react-hook-form` and `zod` for validation.
    Fields required: `title`, `clientId` (dropdown), `assignedManagerId` (dropdown), `priority`, `deadline`, `briefObjective`, `briefDeliverables`.
    Include a multi-file dropzone for "Brief Attachments".
    On submit:
    1. Upload files to Supabase Storage.
    2. Create `Project` record in Postgres.
    3. Create `File` records tagged with the `projectId`.
    4. Redirect to `/projects/[id]`.
    Apply the brutalist terminal aesthetic (uppercase typography, solid borders, no border-radius).
  </action>
  <verify>npm run build</verify>
  <done>Form UI renders without build errors and Zod schema actively blocks empty submissions.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Submitting the form writes a Project to the database with relation to the selected Client and Manager.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
