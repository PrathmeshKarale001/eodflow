---
phase: 6
plan: 2
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - src/app/actions/chat.ts
  - src/components/chat/chat-sidebar.tsx
  - src/components/chat/chat-window.tsx
  - src/components/chat/message-bubble.tsx
  - src/app/(dashboard)/chat/page.tsx
  - src/app/(dashboard)/chat/[channelId]/page.tsx
  - src/components/sidebar/sidebar.tsx
autonomous: true

must_haves:
  truths:
    - "Each project auto-creates a chat channel"
    - "Users can send/receive messages in real-time via Supabase broadcast"
    - "DM channels exist between any two users"
    - "Chat messages persist in database"
    - "Chat page shows channel list + active conversation"
  artifacts:
    - "src/app/(dashboard)/chat/page.tsx exists"
    - "src/components/chat/chat-window.tsx exists"
    - "ChatChannel and ChatMessage models exist in schema"
---

# Plan 6.2: Team Chat (Project Channels + DMs)

<objective>
Build a lightweight team chat system with project-specific channels and direct messages. This replaces WhatsApp for work coordination.

Purpose: All work conversations stay in-context alongside tasks and files.
Output: Chat page with channel sidebar, message window, and real-time messaging.
</objective>

<context>
Load for context:
- EOD-FLOW-PROJECT-BRIEF.md (Section 8.4 — Team chat spec)
- prisma/schema.prisma (need to add ChatChannel + ChatMessage models)
- src/lib/realtime.ts (Supabase realtime patterns — use broadcast for chat)
- src/components/sidebar/sidebar.tsx (need to add Chat nav link)
</context>

<tasks>

<task type="auto">
  <name>Add chat schema + server actions</name>
  <files>
    prisma/schema.prisma
    src/app/actions/chat.ts
  </files>
  <action>
    1. Add to prisma/schema.prisma:
    
    ```prisma
    model ChatChannel {
      id          String   @id @default(cuid())
      name        String?
      type        ChannelType @default(PROJECT)
      projectId   String?
      project     Project? @relation(fields: [projectId], references: [id])
      createdAt   DateTime @default(now())
      messages    ChatMessage[]
      members     ChatChannelMember[]
    }
    
    enum ChannelType {
      PROJECT
      DIRECT
    }
    
    model ChatChannelMember {
      id        String      @id @default(cuid())
      channelId String
      channel   ChatChannel @relation(fields: [channelId], references: [id])
      userId    String
      user      User        @relation(fields: [userId], references: [id])
      joinedAt  DateTime    @default(now())
      @@unique([channelId, userId])
    }
    
    model ChatMessage {
      id        String      @id @default(cuid())
      channelId String
      channel   ChatChannel @relation(fields: [channelId], references: [id])
      userId    String
      user      User        @relation(fields: [userId], references: [id])
      content   String
      fileUrl   String?
      createdAt DateTime    @default(now())
    }
    ```
    
    Add relation fields to User and Project models.
    Run `npx prisma db push` to sync.
    
    2. Create src/app/actions/chat.ts with:
    - `getOrCreateProjectChannel(projectId)` — finds or creates PROJECT channel
    - `getOrCreateDMChannel(otherUserId)` — finds or creates DIRECT channel between two users
    - `sendMessage({ channelId, content, fileUrl? })` — creates ChatMessage
    - `getChannelMessages(channelId, cursor?)` — paginated messages (50 per page)
    - `getUserChannels()` — all channels the current user is a member of
    - `getAvailableDMUsers()` — active users for starting new DMs
    
    AVOID: Using Supabase Realtime postgres_changes for chat — use broadcast instead (ephemeral, lower latency).
    AVOID: Over-engineering — no read receipts, no typing indicators, no message editing for v1.
  </action>
  <verify>npx prisma validate; npx tsc --noEmit</verify>
  <done>ChatChannel, ChatChannelMember, ChatMessage models exist. Six server actions cover CRUD + channel management.</done>
</task>

<task type="auto">
  <name>Build chat UI components</name>
  <files>
    src/components/chat/chat-sidebar.tsx
    src/components/chat/chat-window.tsx
    src/components/chat/message-bubble.tsx
  </files>
  <action>
    1. ChatSidebar:
       - Lists user's channels grouped: "PROJECT CHANNELS" and "DIRECT MESSAGES"
       - Project channels show project name with client color dot
       - DM channels show other user's name + avatar
       - "New DM" button opens user picker
       - Active channel highlighted with primary color
       - Search/filter channels
    
    2. ChatWindow:
       - Header: channel name + type badge + member count
       - Message area: scrollable, auto-scroll to bottom on new messages
       - Messages rendered as MessageBubble components
       - Input bar at bottom: text input + send button + file attach (optional)
       - Subscribe to Supabase broadcast channel for real-time messages
       - On new broadcast message: append to local state (no DB re-fetch needed)
    
    3. MessageBubble:
       - Own messages: right-aligned with primary bg
       - Others' messages: left-aligned with card-muted bg
       - Shows: avatar initial, name, timestamp, content
       - File attachments render inline (image thumbnail or file icon)
    
    Use brutalist design tokens throughout.
    AVOID: Using a chat library — build with native HTML/CSS + Supabase broadcast.
  </action>
  <verify>npx tsc --noEmit passes for all chat components</verify>
  <done>Three chat components exist with brutalist styling. ChatWindow subscribes to Supabase broadcast for real-time updates.</done>
</task>

<task type="auto">
  <name>Create chat pages + sidebar link</name>
  <files>
    src/app/(dashboard)/chat/page.tsx
    src/app/(dashboard)/chat/[channelId]/page.tsx
    src/components/sidebar/sidebar.tsx
  </files>
  <action>
    1. /chat page (server component):
       - Fetches user's channels via getUserChannels()
       - Renders ChatSidebar + "Select a channel" placeholder
       - Layout: split view — sidebar (280px) + main area
    
    2. /chat/[channelId] page:
       - Fetches channel messages via getChannelMessages(channelId)
       - Renders ChatSidebar + ChatWindow with messages
       - Passes channelId to ChatWindow for broadcast subscription
    
    3. Add "Chat" link to sidebar.tsx:
       - Icon: chat_bubble
       - Route: /chat
       - Position: after Files in the nav order
    
    AVOID: Making chat a modal — it needs its own full page/route.
  </action>
  <verify>npx tsc --noEmit passes; /chat route accessible in sidebar</verify>
  <done>Chat page renders with channel sidebar and message window. Sidebar shows Chat link. Real-time messages work via broadcast.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] `npx prisma validate` passes
- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] Chat page accessible at /chat with sidebar link
- [ ] Messages persist and render in real-time
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
- [ ] Project channels + DMs functional
</success_criteria>
