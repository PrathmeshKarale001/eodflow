// =============================================================================
// EOD FLOW — Server-side Supabase Realtime (for broadcasting from server actions)
//
// Uses SUPABASE_SERVICE_ROLE_KEY so it doesn't depend on browser session.
// Optimized: reuses channels via a cache to avoid subscribe/unsubscribe churn
// that exhausts Supabase free-tier connections.
// =============================================================================

import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

// Singleton server-side Supabase client (admin privileges)
let _adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (!_adminClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      console.warn("[REALTIME_SERVER] Missing SUPABASE_URL or SERVICE_ROLE_KEY — broadcasts disabled");
      return null;
    }

    _adminClient = createClient(url, key, {
      realtime: { heartbeatIntervalMs: 30_000 },
    });
  }
  return _adminClient;
}

// ---------------------------------------------------------------------------
// Channel cache — reuse subscribed channels to avoid connection churn
// Each channel auto-cleans up after 30s of idle time
// ---------------------------------------------------------------------------

const channelCache = new Map<string, { channel: RealtimeChannel; timer: ReturnType<typeof setTimeout> }>();

async function getOrCreateChannel(name: string): Promise<RealtimeChannel | null> {
  const client = getAdminClient();
  if (!client) return null;

  // Reuse cached channel
  const cached = channelCache.get(name);
  if (cached) {
    clearTimeout(cached.timer);
    // Reset idle cleanup timer
    cached.timer = setTimeout(() => {
      client.removeChannel(cached.channel).catch(() => {});
      channelCache.delete(name);
    }, 30_000);
    return cached.channel;
  }

  // Create new channel and subscribe
  const channel = client.channel(name);
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Subscribe timeout")), 3000);
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          reject(new Error(`Channel subscribe failed: ${status}`));
        }
      });
    });
  } catch (err) {
    // Cleanup on failure
    client.removeChannel(channel).catch(() => {});
    throw err;
  }

  // Cache with idle cleanup
  const timer = setTimeout(() => {
    client.removeChannel(channel).catch(() => {});
    channelCache.delete(name);
  }, 30_000);

  channelCache.set(name, { channel, timer });
  return channel;
}

// ---------------------------------------------------------------------------
// Broadcast a chat message to all subscribers of a channel
// ---------------------------------------------------------------------------

export async function broadcastChatMessage(
  channelId: string,
  message: {
    id: string;
    content: string;
    fileUrl?: string | null;
    createdAt: Date;
    user: { id: string; name: string; image: string | null };
    replyTo?: { id: string; content: string; isDeleted: boolean; user: { id: string; name: string } } | null;
    reactions?: any[];
    isDeleted?: boolean;
    editedAt?: Date | null;
  }
) {
  try {
    const channel = await getOrCreateChannel(`chat-${channelId}`);
    if (!channel) return;

    await channel.send({
      type: "broadcast",
      event: "new-message",
      payload: message,
    });

    // Broadcast to global notification channel for unread counts
    const notificationChannel = await getOrCreateChannel("chat-notifications");
    if (notificationChannel) {
      await notificationChannel.send({
        type: "broadcast",
        event: "new-notification",
        payload: {
          channelId,
          messageId: message.id,
          content: message.content.substring(0, 50),
          senderName: message.user.name,
          senderId: message.user.id,
        },
      });
    }
  } catch (err) {
    console.error("[REALTIME_SERVER] Broadcast failed:", err);
    // Non-fatal — message is already saved in DB; user will see it on next refresh
  }
}

// ---------------------------------------------------------------------------
// Broadcast a task event (assignment, status change, etc.) to all clients
// ---------------------------------------------------------------------------

export async function broadcastTaskNotification(data: {
  type: "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "TASK_CREATED";
  taskId: string;
  taskTitle: string;
  projectId: string;
  actorName: string;
  actorId: string;
  assigneeIds?: string[];
  oldStatus?: string;
  newStatus?: string;
}) {
  try {
    const channel = await getOrCreateChannel("task-notifications");
    if (!channel) return;

    await channel.send({
      type: "broadcast",
      event: "task-event",
      payload: data,
    });
  } catch (err) {
    console.error("[REALTIME_SERVER] Task notification broadcast failed:", err);
  }
}

// ---------------------------------------------------------------------------
// Broadcast a notification event to a specific user's bell
// Uses Broadcast (not postgres_changes) to bypass RLS restrictions
// ---------------------------------------------------------------------------

export async function broadcastUserNotification(
  userId: string,
  notification: {
    id: string;
    type: string;
    title: string;
    body?: string | null;
    linkUrl?: string | null;
  }
) {
  try {
    const channel = await getOrCreateChannel(`user-notifications-${userId}`);
    if (!channel) return;

    await channel.send({
      type: "broadcast",
      event: "new-notification",
      payload: notification,
    });
  } catch (err) {
    console.error("[REALTIME_SERVER] User notification broadcast failed:", err);
  }
}
