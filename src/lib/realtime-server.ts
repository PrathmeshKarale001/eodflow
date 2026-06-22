// =============================================================================
// EOD FLOW — Server-side Supabase Realtime (for broadcasting from server actions)
//
// Uses direct HTTP POST to Supabase Realtime API instead of WebSocket channels.
// This is critical for Vercel serverless: WebSocket connections are unreliable
// in serverless environments because the process freezes between requests,
// cached channels go stale, and setTimeout-based cleanup doesn't fire.
//
// HTTP broadcasts are stateless, reliable, and work perfectly with serverless.
// =============================================================================

// ---------------------------------------------------------------------------
// HTTP-based broadcast — no WebSocket, no channel cache, no connection issues
// ---------------------------------------------------------------------------

async function httpBroadcast(channelName: string, event: string, payload: Record<string, any>): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !apiKey) {
    console.warn("[REALTIME_SERVER] Missing SUPABASE_URL or SERVICE_ROLE_KEY — broadcasts disabled");
    return false;
  }

  // Supabase Realtime HTTP broadcast endpoint (REST API)
  // POST https://<project>.supabase.co/realtime/v1/api/broadcast/<topic>/events/<event>
  const endpoint = `${url}/realtime/v1/api/broadcast/${encodeURIComponent(channelName)}/events/${encodeURIComponent(event)}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[REALTIME_SERVER] HTTP broadcast failed: ${res.status} ${res.statusText}`, body);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[REALTIME_SERVER] HTTP broadcast network error:", err);
    return false;
  }
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
    // Broadcast to the channel-specific room (for active chat window)
    await httpBroadcast(`chat-${channelId}`, "new-message", message);

    // Broadcast to global notification channel for unread counts + toasts
    await httpBroadcast("chat-notifications", "new-notification", {
      channelId,
      messageId: message.id,
      content: message.content.substring(0, 50),
      senderName: message.user.name,
      senderId: message.user.id,
    });
  } catch (err) {
    console.error("[REALTIME_SERVER] Chat broadcast failed:", err);
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
    const success = await httpBroadcast("task-notifications", "task-event", data);
    if (success) {
      console.log(`[REALTIME_SERVER] Task broadcast sent: ${data.type} "${data.taskTitle}" by ${data.actorName}`);
    }
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
    await httpBroadcast(`user-notifications-${userId}`, "new-notification", notification);
  } catch (err) {
    console.error("[REALTIME_SERVER] User notification broadcast failed:", err);
  }
}
