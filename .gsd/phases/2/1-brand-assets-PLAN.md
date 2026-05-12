---
phase: 2
plan: 1
wave: 1
depends_on: []
files_modified: ["src/app/(dashboard)/clients/[id]/page.tsx", "src/components/clients/brand-assets-manager.tsx", "src/lib/storage.ts"]
autonomous: true
user_setup:
  - "Ensure `eod-flow-files` storage bucket is created in Supabase Dashboard and set to public (or authenticated policies applied)."
must_haves:
  truths:
    - "Admins can view a detailed client page."
    - "Files uploaded are stored in Supabase Storage and logged in the Prisma `File` model."
  artifacts:
    - "src/lib/storage.ts created with robust upload/download wrappers."
    - "Client details page correctly grids brand assets."
---

# Plan 2.1: Client Workspaces & Brand Assets

<objective>
To establish the initial Media Library foundations by creating a robust connection to Supabase Storage, and building a brutalist interface for Admins to view/edit a Client's permanent `Brand Assets` (logos, fonts, guidelines).

Purpose: Ends the dependency on scattered WhatsApp files by centralizing immutable brand assets per client.
</objective>

<context>
- .gsd/SPEC.md
- prisma/schema.prisma (Client & File models)
</context>

<tasks>

<task type="auto">
  <name>Create Storage Utility</name>
  <files>src/lib/storage.ts</files>
  <action>
    Implement a Supabase storage wrapper using `@supabase/supabase-js`.
    Create `uploadFile(bucket, path, file)` and `getFileUrl(bucket, path)` functions.
    Ensure `STORAGE_BUCKET` is read from `process.env`.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Storage utility typing is strict and compiles.</done>
</task>

<task type="auto">
  <name>Scaffold Client Details Page</name>
  <files>src/app/(dashboard)/clients/[id]/page.tsx, src/components/clients/brand-assets-manager.tsx</files>
  <action>
    Create the Client Details server page that fetches the Client and their related `File` records typed as brand assets.
    Build `BrandAssetsManager` as a Client Component holding a dropzone (use pure React/HTML5 drag-and-drop or a lightweight wrapper).
    When a file drops, upload it via `src/lib/storage.ts` and then create a standard Prisma `File` record linked to the `clientId`.
    Follow the `.data-grid` aesthetic with hard `.brutalist-border` visual bounding boxes.
  </action>
  <verify>npm run build</verify>
  <done>Client page compiles without hydration or typing errors.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Dragging a file into the Brand Assets zone uploads it to Supabase and inserts a row in PostgreSQL `files`.
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
