"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Get Channel Media & Files (on-demand for info panel)
// ---------------------------------------------------------------------------

export async function getChannelMedia(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Verify membership
  const membership = await db.chatChannelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
  });
  if (!membership) throw new Error("NOT_A_MEMBER");

  const messagesWithFiles = await db.chatMessage.findMany({
    where: { channelId, fileUrl: { not: null } },
    select: {
      id: true,
      fileUrl: true,
      content: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Categorize
  const media: typeof messagesWithFiles = [];
  const files: typeof messagesWithFiles = [];

  for (const msg of messagesWithFiles) {
    const url = msg.fileUrl!.toLowerCase();
    if (
      url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".png") ||
      url.endsWith(".gif") || url.endsWith(".webp") || url.endsWith(".svg") ||
      url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov")
    ) {
      media.push(msg);
    } else {
      files.push(msg);
    }
  }

  return { media, files };
}

// ---------------------------------------------------------------------------
// Get Channel Links (extracted from message content)
// ---------------------------------------------------------------------------

export async function getChannelLinks(channelId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Verify membership
  const membership = await db.chatChannelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
  });
  if (!membership) throw new Error("NOT_A_MEMBER");

  const messages = await db.chatMessage.findMany({
    where: {
      channelId,
      content: { contains: "http" },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  // Extract URLs from content
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const links: { url: string; sentBy: string; sentAt: Date }[] = [];

  for (const msg of messages) {
    const matches = msg.content.match(urlRegex);
    if (matches) {
      for (const url of matches) {
        links.push({
          url,
          sentBy: msg.user.name,
          sentAt: msg.createdAt,
        });
      }
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Search Channel Messages (per-channel, ILIKE)
// ---------------------------------------------------------------------------

export async function searchChannelMessages(channelId: string, query: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  if (!query || query.trim().length < 2) return [];

  // Verify membership
  const membership = await db.chatChannelMember.findUnique({
    where: { channelId_userId: { channelId, userId: session.user.id } },
  });
  if (!membership) throw new Error("NOT_A_MEMBER");

  return db.chatMessage.findMany({
    where: {
      channelId,
      content: { contains: query.trim(), mode: "insensitive" },
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      user: { select: { id: true, name: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}
