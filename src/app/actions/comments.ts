"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Parse @mentions from content
// ---------------------------------------------------------------------------

function parseMentions(content: string): string[] {
  const mentionRegex = /@(\w+(?:\s\w+)?)/g;
  const mentions: string[] = [];
  let match;
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  return mentions;
}

// ---------------------------------------------------------------------------
// Add Comment (with @mention notifications)
// ---------------------------------------------------------------------------

export async function addComment(data: {
  taskId: string;
  content: string;
  parentId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "addComment")) {
    throw new Error("FORBIDDEN: Cannot add comments.");
  }

  const comment = await db.comment.create({
    data: {
      taskId: data.taskId,
      userId: session.user.id,
      content: data.content,
      parentId: data.parentId,
    },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  // Get task info for notifications
  const task = await db.task.findUnique({
    where: { id: data.taskId },
    select: { assignedToId: true, title: true, projectId: true },
  });

  // Notify task assignee (if not self)
  if (task?.assignedToId && task.assignedToId !== session.user.id) {
    await db.notification.create({
      data: {
        userId: task.assignedToId,
        type: "COMMENT_ADDED",
        title: `New comment on "${task.title}"`,
        body: data.content.substring(0, 120),
        linkUrl: `/projects/${task.projectId}`,
      },
    });
  }

  // Parse @mentions and create MENTION notifications
  const mentionedNames = parseMentions(data.content);
  if (mentionedNames.length > 0) {
    // Look up mentioned users by name (case-insensitive)
    for (const name of mentionedNames) {
      const mentionedUsers = await db.user.findMany({
        where: {
          name: { contains: name, mode: "insensitive" },
          isActive: true,
          id: { not: session.user.id }, // don't notify self
        },
        select: { id: true },
        take: 1,
      });

      for (const mentionedUser of mentionedUsers) {
        // Don't duplicate if already notified as assignee
        if (mentionedUser.id === task?.assignedToId) continue;

        await db.notification.create({
          data: {
            userId: mentionedUser.id,
            type: "MENTION",
            title: `${session.user.name} mentioned you`,
            body: `In "${task?.title || "a task"}": ${data.content.substring(0, 100)}`,
            linkUrl: task?.projectId ? `/projects/${task.projectId}` : undefined,
          },
        });
      }
    }
  }

  // Activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      action: "COMMENTED",
      metadata: { commentId: comment.id, preview: data.content.substring(0, 80) },
    },
  });

  revalidatePath("/tasks");
  return comment;
}

// ---------------------------------------------------------------------------
// Get Task Comments (threaded)
// ---------------------------------------------------------------------------

export async function getTaskComments(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const comments = await db.comment.findMany({
    where: { taskId, parentId: null },
    include: {
      user: { select: { id: true, name: true, image: true } },
      replies: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return comments;
}

// ---------------------------------------------------------------------------
// Delete Comment
// ---------------------------------------------------------------------------

export async function deleteComment(commentId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true, taskId: true },
  });

  if (!comment) throw new Error("Comment not found");

  const isOwner = comment.userId === session.user.id;
  if (!isOwner && !hasPermission(userRole, "deleteAnyComment")) {
    throw new Error("FORBIDDEN: Cannot delete this comment.");
  }

  await db.comment.delete({ where: { id: commentId } });
  revalidatePath("/tasks");
  return { success: true };
}
