---
phase: 5
plan: 2
wave: 2
depends_on: ["1"]
files_modified: ["src/app/actions/notifications.ts", "src/components/notifications/notification-bell.tsx", "src/components/notifications/notification-panel.tsx"]
autonomous: true
skill_constraints:
  - "vercel-react-best-practices: Use Server Components for initial notification fetch. Client component subscribes to realtime for new notifications."
  - "frontend-design: Notification bell uses a brutalist counter badge. Panel slides in with dense notification rows, unread highlighted with left accent bar."
must_haves:
  truths:
    - "Users receive notifications for task assignments, comments, and status changes."
    - "Notification bell shows unread count badge."
    - "Notification panel allows marking as read."
    - "Realtime subscription updates notifications live."
  artifacts:
    - "src/app/actions/notifications.ts contains getNotifications, markAsRead, markAllAsRead."
    - "src/components/notifications/notification-bell.tsx renders the bell icon with unread count."
    - "src/components/notifications/notification-panel.tsx renders the notification list."
---

# Plan 5.2: Notification System & Realtime Bell

<objective>
Build the notification system. Notifications are created server-side when actions occur (task assignment, comment, status change). Users see a notification bell with unread count, and a slide-out panel with notification history. The bell updates in real-time via Supabase Realtime using the existing `subscribeToNotifications` helper.

**Key patterns:**
- Server actions for notification CRUD
- NotificationBell client component with realtime unread count
- NotificationPanel with mark-as-read and mark-all-as-read
- Supabase Realtime subscription for live updates
</objective>

<context>
- prisma/schema.prisma (Notification model: userId, type, title, body, linkUrl, isRead)
- src/lib/realtime.ts (subscribeToNotifications helper)
- src/components/sidebar/sidebar.tsx (embedding point for bell)
</context>

<tasks>

<task type="auto">
  <name>Notification Server Actions</name>
  <files>src/app/actions/notifications.ts</files>
  <action>
    Create server actions:
    1. `getNotifications(userId)` — Fetches last 50 notifications for user, ordered by createdAt desc.
    2. `getUnreadCount(userId)` — Returns count of unread notifications.
    3. `markAsRead(notificationId)` — Sets isRead=true. Revalidates.
    4. `markAllAsRead(userId)` — Sets all user notifications isRead=true. Revalidates.
    5. `createNotification({ userId, type, title, body?, linkUrl? })` — Internal helper (called from other actions). Creates Notification record.
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>All 5 server actions compile and enforce auth.</done>
</task>

<task type="auto">
  <name>Notification Bell & Panel Components</name>
  <files>src/components/notifications/notification-bell.tsx, src/components/notifications/notification-panel.tsx</files>
  <action>
    Build two client components:
    
    1. **NotificationBell:**
       - Displays bell icon with unread count badge.
       - Subscribes to realtime via subscribeToNotifications in useEffect.
       - On new notification: increments local count.
       - On click: toggles NotificationPanel.
       - Cleanup subscription on unmount.
    
    2. **NotificationPanel:**
       - Slides in from right as an overlay.
       - Lists notifications with type icon, title, body, timestamp.
       - Unread notifications have left accent bar (purple).
       - Click notification: mark as read + navigate to linkUrl.
       - "Mark all as read" button at top.
       - Empty state: "ALL_CAUGHT_UP — No new notifications."
  </action>
  <verify>npx tsc --noEmit</verify>
  <done>Bell shows count, panel lists notifications with mark-as-read.</done>
</task>

</tasks>

<success_criteria>
- [ ] Notification server actions compile with auth enforcement.
- [ ] Bell icon shows realtime unread count.
- [ ] Panel lists notifications with mark-as-read functionality.
</success_criteria>
