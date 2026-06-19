"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { cache } from "react";
import { broadcastChatMessage } from "@/lib/realtime-server";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Helper: get current user with role
// ---------------------------------------------------------------------------

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  // ─── PERF: auth() already returns role from session (React cache'd) ────────
  // No need for an extra db.user.findUnique() — session.user has id, role, name.
  return {
    id: session.user.id,
    role: session.user.role as Role,
    name: session.user.name || "",
  };
}

// ---------------------------------------------------------------------------
// Shared include for message queries — reactions, replyTo, user
// ---------------------------------------------------------------------------

const messageInclude = {
  user: { select: { id: true, name: true, image: true } },
  reactions: {
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  replyTo: {
    select: {
      id: true,
      content: true,
      isDeleted: true,
      user: { select: { id: true, name: true } },
    },
  },
};

// ---------------------------------------------------------------------------
// Create Group Channel (Director / Manager / POC — with selective members)
// ---------------------------------------------------------------------------

export async function createGroupChannel(name: string, memberIds: string[]) {
  const user = await getAuthenticatedUser();

  if (!hasPermission(user.role, "createChannel")) {
    throw new Error("FORBIDDEN: Only Directors and Management can create channels");
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
// Get channel members (for management panel + @mention autocomplete)
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

  const nonMembers = await db.user.findMany({
    where: {
      isActive: true,
      chatMembers: {
        none: {
          channelId: channelId
        }
      }
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
// Send Message (with optional replyToId for threading)
// ---------------------------------------------------------------------------

export async function sendMessage(data: {
  channelId: string;
  content: string;
  fileUrl?: string;
  replyToId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const message = await db.chatMessage.create({
    data: {
      channelId: data.channelId,
      userId: session.user.id,
      content: data.content,
      fileUrl: data.fileUrl,
      replyToId: data.replyToId,
    },
    include: messageInclude,
  });

  // Broadcast via server-side Supabase admin client (reliable, doesn't depend on browser state)
  broadcastChatMessage(data.channelId, {
    id: message.id,
    content: message.content,
    fileUrl: message.fileUrl,
    createdAt: message.createdAt,
    user: message.user,
    replyTo: message.replyTo,
    reactions: [],
    isDeleted: false,
    editedAt: null,
  }).catch((err) => {
    console.error("[CHAT] Broadcast failed:", err.message);
  });

  return message;
}

// ---------------------------------------------------------------------------
// Edit Message (own messages only)
// ---------------------------------------------------------------------------

export async function editMessage(messageId: string, newContent: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { userId: true, channelId: true },
  });

  if (!message) throw new Error("Message not found");
  if (message.userId !== session.user.id) throw new Error("Can only edit your own messages");

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data: { content: newContent, editedAt: new Date() },
    include: messageInclude,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Delete Message (soft delete — own messages or admin)
// ---------------------------------------------------------------------------

export async function deleteMessage(messageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const message = await db.chatMessage.findUnique({
    where: { id: messageId },
    select: { userId: true, channelId: true },
  });

  if (!message) throw new Error("Message not found");

  // Allow admins to delete any message, others only their own
  const user = await getAuthenticatedUser();
  const isAdmin = user.role === "SUPER_ADMIN" || user.role === "ADMIN";
  if (message.userId !== session.user.id && !isAdmin) {
    throw new Error("Can only delete your own messages");
  }

  const updated = await db.chatMessage.update({
    where: { id: messageId },
    data: { isDeleted: true, content: "" },
    include: messageInclude,
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Add Reaction
// ---------------------------------------------------------------------------

export async function addReaction(messageId: string, emoji: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const reaction = await db.chatMessageReaction.upsert({
    where: {
      messageId_userId_emoji: {
        messageId,
        userId: session.user.id,
        emoji,
      },
    },
    create: {
      messageId,
      userId: session.user.id,
      emoji,
    },
    update: {},
    include: { user: { select: { id: true, name: true } } },
  });

  return reaction;
}

// ---------------------------------------------------------------------------
// Remove Reaction
// ---------------------------------------------------------------------------

export async function removeReaction(messageId: string, emoji: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await db.chatMessageReaction.deleteMany({
    where: {
      messageId,
      userId: session.user.id,
      emoji,
    },
  });

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get Channel Messages (paginated) — includes reactions + replyTo
// ---------------------------------------------------------------------------

export async function getChannelMessages(channelId: string, cursor?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const messages = await db.chatMessage.findMany({
    where: { channelId },
    include: messageInclude,
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
// Get all messages up to & including a target message (for search-to-scroll)
// ---------------------------------------------------------------------------

export async function getMessagesAroundTarget(channelId: string, targetMessageId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Get the target message first to know its timestamp
  const target = await db.chatMessage.findUnique({
    where: { id: targetMessageId },
    select: { createdAt: true },
  });

  if (!target) return [];

  // Load all messages from the channel (since these are work chats, message volume is manageable)
  const messages = await db.chatMessage.findMany({
    where: { channelId },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
  });

  return messages;
}

// ---------------------------------------------------------------------------
// Get User's Channels (GROUP + DIRECT) — Cached for request-level deduping
// ---------------------------------------------------------------------------

export const getUserChannels = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const channels = await db.chatChannel.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      project: {
        select: {
          title: true,
          client: {
            select: {
              companyName: true,
              brandColor: true,
            },
          },
        },
      },
      members: {
        take: 5, // Just take first few for the list view
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return channels;
});

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
