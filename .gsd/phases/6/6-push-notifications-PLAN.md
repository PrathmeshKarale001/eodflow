---
phase: 6
plan: 6
wave: 3
depends_on: [3, 4]
files_modified:
  - src/lib/push.ts
  - src/app/api/push/subscribe/route.ts
  - src/app/api/push/send/route.ts
  - src/components/notifications/push-permission.tsx
  - prisma/schema.prisma
autonomous: true

must_haves:
  truths:
    - "Web Push API sends notifications to subscribed users"
    - "Users can grant/deny push permission"
    - "Push subscriptions persist in database"
    - "Critical notifications (urgent tasks, deadlines) trigger push"
  artifacts:
    - "src/lib/push.ts exists with push utility"
    - "PushSubscription model in schema"
    - "src/app/api/push/subscribe/route.ts exists"
---

# Plan 6.6: PWA Push Notifications

<objective>
Implement Web Push API for real-time notifications even when the app is closed. Urgent task assignments, deadline reminders, and @mentions trigger push notifications.

Purpose: Team members get notified of critical work items without having the app open.
Output: Push subscription management, notification sending, permission UI.
</objective>

<context>
Load for context:
- EOD-FLOW-PROJECT-BRIEF.md (Section 16 — Push notifications)
- src/lib/realtime.ts (patterns for server-side utilities)
- src/app/actions/notifications.ts (trigger push alongside in-app notifications)
- public/manifest.json (already created in Plan 6.3)
</context>

<tasks>

<task type="auto">
  <name>Create push subscription infrastructure</name>
  <files>
    prisma/schema.prisma
    src/lib/push.ts
    src/app/api/push/subscribe/route.ts
    src/app/api/push/send/route.ts
  </files>
  <action>
    1. Add PushSubscription model to schema:
    ```prisma
    model PushSubscription {
      id        String   @id @default(cuid())
      userId    String
      user      User     @relation(fields: [userId], references: [id])
      endpoint  String   @unique
      p256dh    String
      auth      String
      createdAt DateTime @default(now())
    }
    ```
    
    2. Create src/lib/push.ts:
       - Install: `npm install web-push`
       - Configure web-push with VAPID keys from env vars
       - `sendPushNotification(userId, { title, body, url })`:
         - Fetches all PushSubscription records for userId
         - Sends to each subscription endpoint
         - Removes stale subscriptions (410 Gone responses)
    
    3. POST /api/push/subscribe:
       - Receives { subscription } from client
       - Stores in PushSubscription table linked to authenticated user
    
    4. POST /api/push/send (internal use):
       - Receives { userId, title, body, url }
       - Calls sendPushNotification
    
    AVOID: Sending push to every notification — only for: TASK_ASSIGNED (urgent/high), DEADLINE_REMINDER, MENTION.
    AVOID: Generating VAPID keys at runtime — user must set NEXT_PUBLIC_VAPID_KEY and VAPID_PRIVATE_KEY in .env.
  </action>
  <verify>npx prisma validate; npx tsc --noEmit</verify>
  <done>PushSubscription model exists. Push utility can send notifications. Subscribe endpoint persists subscriptions.</done>
</task>

<task type="auto">
  <name>Create push permission UI + wire triggers</name>
  <files>
    src/components/notifications/push-permission.tsx
    src/app/actions/notifications.ts
  </files>
  <action>
    1. PushPermission component — "use client":
       - On first visit to dashboard: shows a subtle banner "Enable push notifications?"
       - "Enable" button → calls Notification.requestPermission()
       - On grant: subscribes with serviceWorkerRegistration.pushManager.subscribe()
       - Sends subscription to /api/push/subscribe
       - "Not now" → dismisses (remembers in localStorage, re-asks after 7 days)
       - Shows current push status in notification preferences
    
    2. Update notifications.ts:
       - After creating TASK_ASSIGNED notification (urgent/high priority):
         - Fire sendPushNotification() alongside in-app notification
       - After creating DEADLINE_REMINDER:
         - Fire sendPushNotification()
       - After creating MENTION:
         - Fire sendPushNotification()
       - All fire-and-forget with .catch(console.error)
    
    AVOID: Requesting permission on page load — only after first meaningful interaction.
    AVOID: Sending push for every notification type — only critical ones.
  </action>
  <verify>npx tsc --noEmit passes</verify>
  <done>Push permission banner appears on first visit. Push notifications fire for urgent assignments, deadlines, and mentions.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `npx prisma validate` passes
- [ ] `npx tsc --noEmit` passes
- [ ] Push permission flow handles grant/deny
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
