"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// Update Own Profile (name + avatar)
// ---------------------------------------------------------------------------

export async function updateProfile(data: { name?: string; image?: string }) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Validate name
  if (data.name !== undefined) {
    const trimmed = data.name.trim();
    if (trimmed.length < 2) throw new Error("Name must be at least 2 characters.");
    if (trimmed.length > 50) throw new Error("Name must be under 50 characters.");
  }

  await db.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.image !== undefined && { image: data.image }),
    },
  });

  revalidatePath("/profile");
  revalidatePath("/overview");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get Recent DM Contacts (for Quick Chat in sidebar)
// ---------------------------------------------------------------------------

export async function getRecentDMContacts() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Find the last 5 DM channels this user is a member of, ordered by most recent message
  const recentDMs = await db.chatChannel.findMany({
    where: {
      type: "DIRECT",
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, image: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  // Sort by most recent message and extract the other user
  return recentDMs
    .filter((ch) => ch.messages.length > 0)
    .sort((a, b) => {
      const aTime = a.messages[0]?.createdAt?.getTime() ?? 0;
      const bTime = b.messages[0]?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    })
    .map((ch) => {
      const otherUser = ch.members.find((m) => m.user.id !== session.user.id)?.user;
      return {
        channelId: ch.id,
        userId: otherUser?.id ?? "",
        name: otherUser?.name ?? "Unknown",
        image: otherUser?.image ?? null,
      };
    })
    .slice(0, 3);
}
