// =============================================================================
// EOD FLOW — Server-side Supabase Realtime (for broadcasting from server actions)
//
// Uses SUPABASE_SERVICE_ROLE_KEY so it doesn't depend on browser session.
// This ensures broadcasts always reach subscribed clients, regardless of
// whether the sender's browser channel is in a SUBSCRIBED state.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

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

    _adminClient = createClient(url, key);
  }
  return _adminClient;
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
  }
) {
  const client = getAdminClient();
  if (!client) return; // Graceful degradation — don't crash if env vars missing

  try {
    const channel = client.channel(`chat-${channelId}`);

    // Must subscribe before sending (Supabase requirement)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Subscribe timeout")), 5000);

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

    await channel.send({
      type: "broadcast",
      event: "new-message",
      payload: message,
    });

    // Broadcast to global notification channel for unread counts
    const notificationChannel = client.channel("chat-notifications");
    await new Promise<void>((resolve) => {
      notificationChannel.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });

    await notificationChannel.send({
      type: "broadcast",
      event: "new-notification",
      payload: {
        channelId,
        messageId: message.id,
        content: message.content.substring(0, 50), // Snippet for toast
        senderName: message.user.name,
        senderId: message.user.id,
      },
    });

    // Cleanup: unsubscribe after sending (server shouldn't hold channels open)
    await client.removeChannel(channel);
    await client.removeChannel(notificationChannel);
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
  const client = getAdminClient();
  if (!client) return;

  try {
    const channel = client.channel("task-notifications");
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Subscribe timeout")), 5000);
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

    await channel.send({
      type: "broadcast",
      event: "task-event",
      payload: data,
    });

    await client.removeChannel(channel);
  } catch (err) {
    console.error("[REALTIME_SERVER] Task notification broadcast failed:", err);
  }
}

