"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Add Comment
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

  // Create notification for the task assignee (if not self)
  const task = await db.task.findUnique({
    where: { id: data.taskId },
    select: { assignedToId: true, title: true, projectId: true },
  });

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
