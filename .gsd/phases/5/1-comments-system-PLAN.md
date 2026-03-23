---
phase: 5
plan: 1
wave: 1
depends_on: []
files_modified: ["src/app/actions/comments.ts", "src/components/comments/comment-thread.tsx"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use startTransition for comment submission. Use useOptimistic for instant comment appearance before server confirms."
  - "frontend-design: Comment thread uses brutalist chat-bubble styling with monospace timestamps and reply indentation."
must_haves:
  truths:
    - "Users can add comments to tasks."
    - "Comments support threaded replies."
    - "Realtime subscription updates comment thread live."
  artifacts:
    - "src/app/actions/comments.ts contains addComment, getTaskComments, deleteComment server actions."
    - "src/components/comments/comment-thread.tsx renders the threaded comment UI with realtime updates."
---

# Plan 5.1: Task Comments System

<objective>
Build the threaded comment system for tasks. Users can add comments, reply to existing comments, and see new comments appear in real-time via Supabase Realtime subscriptions. The existing `subscribeToTaskComments` helper in `realtime.ts` is used for live updates.

**Key patterns:**
- Server actions for comment CRUD with RBAC
- Client component with `useOptimistic` for instant UI feedback
- Supabase Realtime subscription for cross-user live updates
- Threaded reply support via `parentId` relation
</objective>

<context>
- prisma/schema.prisma (Comment model: taskId, userId, parentId, content, annotationData)
- src/lib/realtime.ts (subscribeToTaskComments helper)
- src/lib/permissions.ts (addComment, deleteAnyComment, deleteOwnComment)
</context>

<tasks>

<task type="auto">
  <name>Comment Server Actions</name>
  <files>src/app/actions/comments.ts</files>
  <action>
    Create server actions:
    1. `addComment({ taskId, content, parentId? })` — Validates `addComment` permission. Creates Comment. Creates Notification for task assignee. Revalidates paths.
    2. `getTaskComments(taskId)` — Fetches all comments for a task including user (name, image), replies (nested). Sorted by createdAt asc.
    3. `deleteComment(commentId)` — Validates ownership or `deleteAnyComment` permission. Deletes comment. Revalidates.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>All 3 server actions compile and enforce auth + RBAC.</done>
</task>

<task type="auto">
  <name>Comment Thread Component</name>
  <files>src/components/comments/comment-thread.tsx</files>
  <action>
    Build the CommentThread client component:
    1. Fetch initial comments via getTaskComments in parent, pass as prop.
    2. Subscribe to realtime via subscribeToTaskComments in useEffect, merge new comments into local state.
    3. Comment input form at bottom with reply-to indicator.
    4. Threaded display: parent comments full-width, replies indented with left border.
    5. Each comment shows avatar, name, timestamp, content, reply button.
    6. Use startTransition for submission.
    7. Cleanup subscription on unmount.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Comment thread renders, supports replies, and updates in realtime.</done>
</task>

</tasks>

<success_criteria>
- [ ] Users can add comments to tasks.
- [ ] Threaded replies display with indentation.
- [ ] Realtime subscription merges new comments live.
</success_criteria>
