---
phase: 6
plan: 4
wave: 2
depends_on: []
files_modified:
  - src/lib/email.ts
  - src/app/actions/notifications.ts
  - src/components/settings/notification-preferences.tsx
  - src/app/(dashboard)/settings/page.tsx
autonomous: true
user_setup:
  - service: resend
    why: "Transactional email delivery"
    env_vars:
      - name: RESEND_API_KEY
        source: "Resend Dashboard -> API Keys"
      - name: RESEND_FROM_EMAIL
        source: "Verified sending domain in Resend (e.g. noreply@eodmedia.in)"

must_haves:
  truths:
    - "System can send transactional emails for task assignments, mentions, approvals"
    - "Users can configure notification preferences (realtime / daily digest / off)"
    - "Email templates are branded with EOD Flow identity"
  artifacts:
    - "src/lib/email.ts exists with sendEmail utility"
    - "Notification preferences stored on User model"
---

# Plan 6.4: Email Notifications (Resend Integration)

<objective>
Integrate Resend for transactional emails. Task assignments, @mentions, deadline reminders, and approval requests trigger emails. Users can configure their digest frequency.

Purpose: Ensures team members never miss critical notifications even when not in the app.
Output: Email utility, notification preferences UI, email templates.
</objective>

<context>
Load for context:
- EOD-FLOW-PROJECT-BRIEF.md (Section 8.5 — Notification system)
- src/app/actions/notifications.ts (existing notification actions — add email triggers)
- src/app/actions/comments.ts (sends MENTION notifications — add email)
- prisma/schema.prisma (User model — may need notificationPrefs field)
</context>

<tasks>

<task type="auto">
  <name>Create email utility + templates</name>
  <files>src/lib/email.ts</files>
  <action>
    1. Install: `npm install resend`
    
    2. Create src/lib/email.ts:
    ```ts
    import { Resend } from 'resend';
    const resend = new Resend(process.env.RESEND_API_KEY);
    
    export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
      if (!process.env.RESEND_API_KEY) { console.warn('RESEND_API_KEY not set, skipping email'); return; }
      return resend.emails.send({ from: process.env.RESEND_FROM_EMAIL || 'EOD Flow <noreply@eodflow.app>', to, subject, html });
    }
    ```
    
    3. Create email template functions (plain HTML strings, no JSX):
    - `taskAssignedEmail(taskTitle, projectTitle, assignerName, dueDate, taskUrl)` → branded HTML
    - `mentionEmail(mentionerName, taskTitle, content, taskUrl)` → branded HTML  
    - `approvalRequestEmail(taskTitle, submitterName, taskUrl)` → branded HTML
    - `deadlineReminderEmail(taskTitle, dueDate, taskUrl)` → branded HTML
    
    Template design: dark bg (#0A0A0A), white text, purple (#6C5CE7) accent for buttons.
    Include "EOD Flow" header and "View in App" CTA button.
    
    AVOID: Using React Email — overkill for internal tool. Plain HTML templates are sufficient.
    AVOID: Sending emails synchronously in the request path — fire-and-forget with .catch(console.error).
  </action>
  <verify>npx tsc --noEmit passes</verify>
  <done>Email utility exists with 4 branded template functions. Gracefully skips if API key not set.</done>
</task>

<task type="auto">
  <name>Wire emails into existing notification actions + add preferences</name>
  <files>
    src/app/actions/notifications.ts
    src/app/actions/comments.ts
    src/components/settings/notification-preferences.tsx
    src/app/(dashboard)/settings/page.tsx
  </files>
  <action>
    1. Update notifications.ts:
       - After creating a Notification record, also fire sendEmail() for:
         - TASK_ASSIGNED → taskAssignedEmail
         - APPROVAL_REQUESTED → approvalRequestEmail
       - Check user's email preference before sending (skip if "off")
       - Fire-and-forget: `sendEmail(...).catch(console.error)` — don't block the action
    
    2. Update comments.ts:
       - After creating MENTION notification, fire mentionEmail() for mentioned user
    
    3. Create NotificationPreferences component:
       - Radio group: "Real-time" / "Daily digest" / "Off"
       - Checkboxes for notification types: Assignments, Mentions, Deadlines, Approvals
       - Save to user record (add notificationPrefs JSON field to User if not exists)
    
    4. Add NotificationPreferences to settings page
    
    AVOID: Blocking the main action on email send — always fire-and-forget.
    AVOID: Implementing daily digest cron job now — just save the preference, implement the actual digest later.
  </action>
  <verify>npx tsc --noEmit passes</verify>
  <done>Emails fire on task assignment, mentions, and approval requests. Users can configure preferences in settings.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `npx tsc --noEmit` passes
- [ ] Email functions gracefully handle missing API key
- [ ] Notification preferences UI renders in settings
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
