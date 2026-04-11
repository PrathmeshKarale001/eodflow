"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { broadcastChatMessage } from "@/lib/realtime-server";

// ---------------------------------------------------------------------------
// Create Group Channel (Admin / Super Admin only)
// ---------------------------------------------------------------------------

export async function createGroupChannel(name: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Only ADMIN and SUPER_ADMIN can create channels
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new Error("FORBIDDEN: Only admins can create channels");
  }

  // Check if channel with same name already exists
  const existing = await db.chatChannel.findFirst({
    where: { name, type: "GROUP" },
  });

  if (existing) throw new Error("Channel with this name already exists");

  // Create channel and add creator as first member
  const channel = await db.chatChannel.create({
    data: {
      name,
      type: "GROUP",
      members: {
        create: { userId: session.user.id },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      _count: { select: { messages: true } },
    },
  });

  // Add ALL active users as members so everyone can see it
  const allUsers = await db.user.findMany({
    where: { isActive: true, id: { not: session.user.id } },
    select: { id: true },
  });

  if (allUsers.length > 0) {
    await db.chatChannelMember.createMany({
      data: allUsers.map((u) => ({ channelId: channel.id, userId: u.id })),
      skipDuplicates: true,
    });
  }

  revalidatePath("/chat");
  return channel;
}

// ---------------------------------------------------------------------------
// Delete Group Channel (Admin only)
// ---------------------------------------------------------------------------

export async function deleteGroupChannel(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  if (!user || !["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    throw new Error("FORBIDDEN");
  }

  await db.chatChannel.delete({ where: { id: channelId } });
  revalidatePath("/chat");
}

// ---------------------------------------------------------------------------
// Get or Create DM Channel
// ---------------------------------------------------------------------------

export async function getOrCreateDMChannel(otherUserId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Find existing DM between these two users
  const existing = await db.chatChannel.findFirst({
    where: {
      type: "DIRECT",
      AND: [
        { members: { some: { userId: session.user.id } } },
        { members: { some: { userId: otherUserId } } },
      ],
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      _count: { select: { messages: true } },
    },
  });

  if (existing) return existing;

  const otherUser = await db.user.findUnique({
    where: { id: otherUserId },
    select: { name: true },
  });

  const channel = await db.chatChannel.create({
    data: {
      name: `DM: ${otherUser?.name || "User"}`,
      type: "DIRECT",
      members: {
        createMany: {
          data: [{ userId: session.user.id }, { userId: otherUserId }],
        },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      _count: { select: { messages: true } },
    },
  });

  return channel;
}

// ---------------------------------------------------------------------------
// Send Message
// ---------------------------------------------------------------------------

export async function sendMessage(data: {
  channelId: string;
  content: string;
  fileUrl?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const message = await db.chatMessage.create({
    data: {
      channelId: data.channelId,
      userId: session.user.id,
      content: data.content,
      fileUrl: data.fileUrl,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  // Broadcast via server-side Supabase admin client (reliable, doesn't depend on browser state)
  broadcastChatMessage(data.channelId, {
    id: message.id,
    content: message.content,
    fileUrl: message.fileUrl,
    createdAt: message.createdAt,
    user: message.user,
  });

  revalidatePath("/chat");
  return message;
}

// ---------------------------------------------------------------------------
// Get Channel Messages (paginated)
// ---------------------------------------------------------------------------

export async function getChannelMessages(channelId: string, cursor?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const messages = await db.chatMessage.findMany({
    where: { channelId },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 50,
    ...(cursor
      ? {
          cursor: { id: cursor },
          skip: 1,
        }
      : {}),
  });

  return messages;
}

// ---------------------------------------------------------------------------
// Get User's Channels (GROUP + DIRECT)
// ---------------------------------------------------------------------------

export async function getUserChannels() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const channels = await db.chatChannel.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      project: { select: { title: true, client: { select: { companyName: true, brandColor: true } } } },
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { user: { select: { name: true } } },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return channels;
}

// ---------------------------------------------------------------------------
// Get Available DM Users
// ---------------------------------------------------------------------------

export async function getAvailableDMUsers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const users = await db.user.findMany({
    where: {
      isActive: true,
      id: { not: session.user.id },
    },
    select: { id: true, name: true, image: true, role: true, department: true },
    orderBy: { name: "asc" },
  });

  return users;
}

// ---------------------------------------------------------------------------
// Get current user role (for UI permission checks)
// ---------------------------------------------------------------------------

export async function getCurrentUserRole() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });

  return user?.role || null;
}
