// =============================================================================
// EOD FLOW — Supabase Realtime Configuration
// Handles: Task sync, Presence (online status), Broadcast (chat/typing)
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client (for realtime subscriptions)
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// ---------------------------------------------------------------------------
// Realtime channel helpers
// ---------------------------------------------------------------------------

/**
 * Subscribe to task changes for a specific project board.
 * Updates the Kanban board in real-time when any team member moves a card.
 */
export function subscribeToProjectTasks(
  projectId: string,
  onUpdate: (payload: any) => void
) {
  const supabase = createClient();

  return supabase
    .channel(`project-tasks-${projectId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "tasks",
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => onUpdate(payload)
    )
    .subscribe();
}

/**
 * Subscribe to new comments on a specific task.
 * Shows real-time comment thread updates.
 */
export function subscribeToTaskComments(
  taskId: string,
  onNewComment: (payload: any) => void
) {
  const supabase = createClient();

  return supabase
    .channel(`task-comments-${taskId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `task_id=eq.${taskId}`,
      },
      (payload) => onNewComment(payload)
    )
    .subscribe();
}

/**
 * Subscribe to notifications for the current user.
 * Powers the notification bell in the sidebar.
 */
export function subscribeToNotifications(
  userId: string,
  onNotification: (payload: any) => void
) {
  const supabase = createClient();

  return supabase
    .channel(`user-notifications-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification(payload)
    )
    .subscribe();
}

/**
 * Track online presence for a specific view/page.
 * Shows green dots on avatars and "who's viewing this board" indicators.
 */
export function trackPresence(
  channelName: string,
  userInfo: { id: string; name: string; avatar?: string }
) {
  const supabase = createClient();

  const channel = supabase.channel(channelName, {
    config: { presence: { key: userInfo.id } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      // state contains all currently present users
      return state;
    })
    .on("presence", { event: "join" }, ({ key, newPresences }) => {
      // Someone joined this view
      console.log(`${key} joined`, newPresences);
    })
    .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      // Someone left this view
      console.log(`${key} left`, leftPresences);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          user_id: userInfo.id,
          user_name: userInfo.name,
          avatar: userInfo.avatar,
          online_at: new Date().toISOString(),
        });
      }
    });

  return channel;
}

/**
 * Broadcast typing indicator for chat/comments.
 */
export function broadcastTyping(
  channelName: string,
  userId: string,
  userName: string
) {
  const supabase = createClient();
  const channel = supabase.channel(channelName);

  channel.subscribe((status) => {
    if (status === "SUBSCRIBED") {
      channel.send({
        type: "broadcast",
        event: "typing",
        payload: { userId, userName, timestamp: Date.now() },
      });
    }
  });
}
