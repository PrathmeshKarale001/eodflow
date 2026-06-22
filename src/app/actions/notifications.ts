"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { NotificationType } from "@prisma/client";

// ---------------------------------------------------------------------------
// Get Notifications
// ---------------------------------------------------------------------------

export async function getNotifications(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (userId !== session.user.id) throw new Error("FORBIDDEN: Cannot access other users' notifications.");

  const notifications = await db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return notifications;
}

// ---------------------------------------------------------------------------
// Get Unread Count
// ---------------------------------------------------------------------------

export async function getUnreadCount(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (userId !== session.user.id) throw new Error("FORBIDDEN: Cannot access other users' notifications.");

  const count = await db.notification.count({
    where: { userId, isRead: false },
  });

  return count;
}

// ---------------------------------------------------------------------------
// Mark as Read
// ---------------------------------------------------------------------------

export async function markAsRead(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Verify ownership before marking as read
  const notification = await db.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });
  if (!notification || notification.userId !== session.user.id) {
    throw new Error("FORBIDDEN: Cannot modify other users' notifications.");
  }

  await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Mark All as Read
// ---------------------------------------------------------------------------

export async function markAllAsRead(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (userId !== session.user.id) throw new Error("FORBIDDEN: Cannot modify other users' notifications.");

  await db.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });

  revalidatePath("/");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Create Notification (internal helper)
// ---------------------------------------------------------------------------

export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  linkUrl?: string;
}) {
  const notification = await db.notification.create({
    data: {
      userId: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
      linkUrl: data.linkUrl,
    },
  });

  return notification;
}

// ---------------------------------------------------------------------------
// Get Recent Unread Notifications (for polling fallback)
// Returns only unread notifications created within the last `sinceSec` seconds.
// This is used by the ChatProvider polling to catch any notifications
// that the WebSocket broadcast failed to deliver.
// ---------------------------------------------------------------------------

export async function getRecentUnreadNotifications(sinceSec: number = 30) {
  const session = await auth();
  if (!session?.user?.id) return [];

  const since = new Date(Date.now() - sinceSec * 1000);

  const notifications = await db.notification.findMany({
    where: {
      userId: session.user.id,
      isRead: false,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      linkUrl: true,
      createdAt: true,
    },
  });

  return notifications;
}
