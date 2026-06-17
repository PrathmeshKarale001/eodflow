"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { TaskStatus, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Submit Task for Review (Employee → IN_REVIEW)
// ---------------------------------------------------------------------------

export async function submitForReview(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, projectId: true, assignedToId: true },
  });

  if (!task) throw new Error("Task not found");
  if (task.assignedToId !== session.user.id) {
    throw new Error("FORBIDDEN: Only the assignee can submit for review.");
  }
  if (task.status !== TaskStatus.IN_PROGRESS && task.status !== TaskStatus.REVISION && task.status !== TaskStatus.CLIENT_REVISION) {
    throw new Error(`Cannot submit from status: ${task.status}`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.IN_REVIEW },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId,
      projectId: task.projectId,
      action: "STATUS_CHANGED",
      metadata: { previousStatus: task.status },
    },
  });

  revalidatePath("/tasks");
  revalidatePath(`/projects/${task.projectId}`);
  return updatedTask;
}

// ---------------------------------------------------------------------------
// Upload Deliverable File for Task
// ---------------------------------------------------------------------------

export async function createTaskFileRecord(data: {
  taskId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Look up projectId from task
  const task = await db.task.findUnique({
    where: { id: data.taskId },
    select: { projectId: true },
  });

  if (!task) throw new Error("Task not found");

  const file = await db.file.create({
    data: {
      ...data,
      uploadedById: session.user.id, // Always use session user, never trust client
      projectId: task.projectId,
    },
  });

  revalidatePath("/tasks");
  return file;
}
