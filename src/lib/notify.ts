// =============================================================================
// EOD FLOW — Unified Notification Helper
// Creates in-app notification + fires Web Push in one call
// =============================================================================

import { db } from "@/lib/db";
import { sendPushToUser, sendPushToUsers } from "@/lib/web-push";
import { broadcastUserNotification } from "@/lib/realtime-server";
import type { NotificationType } from "@prisma/client";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
  tag?: string; // Push notification grouping tag
}

// ---------------------------------------------------------------------------
// Send notification to a single user (DB + push)
// ---------------------------------------------------------------------------

export async function notify(params: NotifyParams) {
  const { userId, type, title, body, linkUrl, tag } = params;

  // 1. Create in-app notification (always)
  const notification = await db.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      linkUrl,
    },
  });

  // 2. Broadcast to notification bell (non-blocking, bypasses RLS)
  broadcastUserNotification(userId, {
    id: notification.id,
    type,
    title,
    body,
    linkUrl,
  }).catch((err) => {
    console.error("[NOTIFY] Broadcast failed for user", userId, err.message);
  });

  // 3. Fire Web Push (non-blocking, never fails the main flow)
  sendPushToUser(userId, {
    title,
    body: body || "",
    url: linkUrl || "/overview",
    tag: tag || `${type}-${notification.id}`,
  }).catch((err) => {
    console.error("[NOTIFY] Push failed for user", userId, err.message);
  });

  return notification;
}

// ---------------------------------------------------------------------------
// Send notification to multiple users (DB + push for each)
// ---------------------------------------------------------------------------

export async function notifyMany(
  userIds: string[],
  params: Omit<NotifyParams, "userId">
) {
  if (userIds.length === 0) return;

  const { type, title, body, linkUrl, tag } = params;

  // 1. Batch create in-app notifications
  await db.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type,
      title,
      body,
      linkUrl,
    })),
  });

  // 2. Broadcast to each user's notification bell (non-blocking)
  for (const userId of userIds) {
    broadcastUserNotification(userId, {
      id: `batch-${Date.now()}-${userId}`,
      type,
      title,
      body,
      linkUrl,
    }).catch((err) => {
      console.error("[NOTIFY] Broadcast failed for user", userId, err.message);
    });
  }

  // 3. Fire Web Push to all (non-blocking)
  sendPushToUsers(userIds, {
    title,
    body: body || "",
    url: linkUrl || "/overview",
    tag: tag || type,
  }).catch((err) => {
    console.error("[NOTIFY] Batch push failed:", err.message);
  });
}
