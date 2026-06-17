"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notify, notifyMany } from "@/lib/notify";
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
  fileUrl?: string;
  fileName?: string;
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
      fileUrl: data.fileUrl,
      fileName: data.fileName,
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
    await notify({
      userId: task.assignedToId,
      type: "COMMENT_ADDED",
      title: `New comment on "${task.title}"`,
      body: data.content.substring(0, 120),
      linkUrl: `/tasks?taskId=${data.taskId}`,
      tag: `comment-${data.taskId}`,
    });
  }

  // Parse @mentions and create MENTION notifications — BATCHED (not N+1)
  const mentionedNames = parseMentions(data.content);
  if (mentionedNames.length > 0) {
    // Single query for ALL mentioned users (instead of 1 query per mention)
    const mentionedUsers = await db.user.findMany({
      where: {
        OR: mentionedNames.map((name) => ({
          name: { contains: name, mode: "insensitive" as const },
        })),
        isActive: true,
        id: { not: session.user.id }, // don't notify self
      },
      select: { id: true },
    });

    // Filter out assignee (already notified above) and batch-create notifications
    const notificationData = mentionedUsers
      .filter((u) => u.id !== task?.assignedToId)
      .map((u) => ({
        userId: u.id,
        type: "MENTION" as const,
        title: `${session.user.name} mentioned you`,
        body: `In "${task?.title || "a task"}": ${data.content.substring(0, 100)}`,
        linkUrl: task?.projectId ? `/projects/${task.projectId}` : undefined,
      }));

    if (notificationData.length > 0) {
      await notifyMany(
        notificationData.map((n) => n.userId),
        {
          type: "MENTION",
          title: `${session.user.name} mentioned you`,
          body: `In "${task?.title || "a task"}": ${data.content.substring(0, 100)}`,
          linkUrl: `/tasks?taskId=${data.taskId}`,
          tag: `mention-${data.taskId}`,
        }
      );
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

// ---------------------------------------------------------------------------
// Edit Comment (only own comments)
// ---------------------------------------------------------------------------

export async function editComment(commentId: string, newContent: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  if (!newContent || !newContent.trim()) {
    throw new Error("Comment content cannot be empty.");
  }

  const comment = await db.comment.findUnique({
    where: { id: commentId },
    select: { userId: true },
  });

  if (!comment) throw new Error("Comment not found");
  if (comment.userId !== session.user.id) {
    throw new Error("FORBIDDEN: You can only edit your own comments.");
  }

  const updated = await db.comment.update({
    where: { id: commentId },
    data: { content: newContent.trim() },
  });

  revalidatePath("/tasks");
  return updated;
}
