"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { broadcastChatMessage } from "@/lib/realtime-server";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helper: get current user with role
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, name: true },
  });
  if (!user) throw new Error("UNAUTHORIZED");
  return { ...user, role: user.role as Role };
}

// ---------------------------------------------------------------------------
// Create Group Channel (Director / Manager / POC — with selective members)
// ---------------------------------------------------------------------------

export async function createGroupChannel(name: string, memberIds: string[]) {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user.role, "createChannel")) {
    throw new Error("FORBIDDEN: Only Directors, Managers and POCs can create channels");
  }

  // Check if channel with same name already exists
  const existing = await db.chatChannel.findFirst({
    where: { name, type: "GROUP" },
  });

  if (existing) throw new Error("Channel with this name already exists");

  // Ensure creator is included in the member list
  const uniqueMembers = Array.from(new Set([user.id, ...memberIds]));

  // Create channel with selected members
  const channel = await db.chatChannel.create({
    data: {
      name,
      type: "GROUP",
      members: {
        createMany: {
          data: uniqueMembers.map((id) => ({ userId: id })),
          skipDuplicates: true,
        },
      },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, image: true } } } },
      _count: { select: { messages: true } },
    },
  });

  revalidatePath("/chat");
  return channel;
}

// ---------------------------------------------------------------------------
// Delete Group Channel (Director / Manager / POC)
// ---------------------------------------------------------------------------

export async function deleteGroupChannel(channelId: string) {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user.role, "deleteChannel")) {
    throw new Error("FORBIDDEN");
  }

  await db.chatChannel.delete({ where: { id: channelId } });
  revalidatePath("/chat");
}

// ---------------------------------------------------------------------------
// Add member to channel (Director / Manager / POC)
// ---------------------------------------------------------------------------

export async function addChannelMember(channelId: string, userId: string) {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user.role, "manageChannelMembers")) {
    throw new Error("FORBIDDEN: Insufficient permissions");
  }

  // Check if already a member
  const existing = await db.chatChannelMember.findFirst({
    where: { channelId, userId },
  });

  if (existing) throw new Error("User is already a member of this channel");

  await db.chatChannelMember.create({
    data: { channelId, userId },
  });

  revalidatePath("/chat");
  revalidatePath(`/chat/${channelId}`);
}

// ---------------------------------------------------------------------------
// Remove member from channel (Director / Manager / POC)
// ---------------------------------------------------------------------------

export async function removeChannelMember(channelId: string, userId: string) {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user.role, "manageChannelMembers")) {
    throw new Error("FORBIDDEN: Insufficient permissions");
  }

  // Don't allow removing yourself if you're the last member
  const memberCount = await db.chatChannelMember.count({ where: { channelId } });
  if (memberCount <= 1) throw new Error("Cannot remove the last member from a channel");

  await db.chatChannelMember.deleteMany({
    where: { channelId, userId },
  });

  revalidatePath("/chat");
  revalidatePath(`/chat/${channelId}`);
}

// ---------------------------------------------------------------------------
// Get channel members (for management panel)
// ---------------------------------------------------------------------------

export async function getChannelMembers(channelId: string) {
  const user = await getAuthenticatedUser();

  const members = await db.chatChannelMember.findMany({
    where: { channelId },
    include: {
      user: { select: { id: true, name: true, image: true, role: true, department: true } },
    },
    orderBy: { joinedAt: "asc" },
  });

  return members.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    image: m.user.image,
    role: m.user.role as Role,
    department: m.user.department,
  }));
}

// ---------------------------------------------------------------------------
// Get non-members (for adding to channel)
// ---------------------------------------------------------------------------

export async function getNonMembers(channelId: string) {
  const user = await getAuthenticatedUser();

  const existingMemberIds = (
    await db.chatChannelMember.findMany({
      where: { channelId },
      select: { userId: true },
    })
  ).map((m) => m.userId);

  const nonMembers = await db.user.findMany({
    where: {
      isActive: true,
      id: { notIn: existingMemberIds },
    },
    select: { id: true, name: true, image: true, role: true, department: true },
    orderBy: { name: "asc" },
  });

  return nonMembers;
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
