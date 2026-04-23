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
