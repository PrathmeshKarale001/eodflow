"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Create Subtask
// ---------------------------------------------------------------------------

export async function createSubtask(data: {
  taskId: string;
  title: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: data.taskId },
    select: { projectId: true, assignedToId: true },
  });

  if (!task) throw new Error("Task not found");

  const role = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;

  if (!isAssignee && !hasPermission(role, "editAnyTask")) {
    throw new Error("FORBIDDEN");
  }

  // Get max sortOrder
  const maxSort = await db.subtask.aggregate({
    where: { taskId: data.taskId },
    _max: { sortOrder: true },
  });

  const subtask = await db.subtask.create({
    data: {
      taskId: data.taskId,
      title: data.title,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return subtask;
}

// ---------------------------------------------------------------------------
// Toggle Subtask Completion
// ---------------------------------------------------------------------------

export async function toggleSubtask(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { projectId: true, assignedToId: true } } },
  });

  if (!subtask) throw new Error("Subtask not found");

  const role = session.user.role as Role;
  const isAssignee = subtask.task.assignedToId === session.user.id;

  if (!isAssignee && !hasPermission(role, "editAnyTask")) {
    throw new Error("FORBIDDEN");
  }

  const updated = await db.subtask.update({
    where: { id: subtaskId },
    data: { isDone: !subtask.isDone },
  });

  revalidatePath(`/projects/${subtask.task.projectId}`);
  revalidatePath("/tasks");
  return updated;
}

// ---------------------------------------------------------------------------
// Delete Subtask
// ---------------------------------------------------------------------------

export async function deleteSubtask(subtaskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const subtask = await db.subtask.findUnique({
    where: { id: subtaskId },
    include: { task: { select: { projectId: true, assignedToId: true } } },
  });

  if (!subtask) throw new Error("Subtask not found");

  const role = session.user.role as Role;
  const isAssignee = subtask.task.assignedToId === session.user.id;

  if (!isAssignee && !hasPermission(role, "editAnyTask")) {
    throw new Error("FORBIDDEN");
  }

  await db.subtask.delete({ where: { id: subtaskId } });

  revalidatePath(`/projects/${subtask.task.projectId}`);
  revalidatePath("/tasks");
}

// ---------------------------------------------------------------------------
// Get Task Subtasks
// ---------------------------------------------------------------------------

export async function getTaskSubtasks(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  return db.subtask.findMany({
    where: { taskId },
    orderBy: { sortOrder: "asc" },
  });
}
