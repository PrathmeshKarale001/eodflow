"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { TaskStatus, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Gate 1: Manager Review
// ---------------------------------------------------------------------------

/** Manager approves → IN_REVIEW → CLIENT_APPROVAL */
export async function approveTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "reviewTask")) {
    throw new Error("FORBIDDEN: Only reviewers can approve tasks.");
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, projectId: true },
  });

  if (!task) throw new Error("Task not found");
  if (task.status !== TaskStatus.IN_REVIEW) {
    throw new Error(`Cannot approve from status: ${task.status}`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.CLIENT_APPROVAL },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId,
      projectId: task.projectId,
      action: "APPROVED",
      metadata: { gate: "MANAGER", previousStatus: task.status, newStatus: TaskStatus.CLIENT_APPROVAL },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return updatedTask;
}

/** Manager requests revision → IN_REVIEW → REVISION */
export async function requestRevision(taskId: string, notes: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "requestRevision")) {
    throw new Error("FORBIDDEN: Insufficient permissions.");
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, projectId: true, revisionCount: true },
  });

  if (!task) throw new Error("Task not found");
  if (task.status !== TaskStatus.IN_REVIEW) {
    throw new Error(`Cannot request revision from status: ${task.status}`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.REVISION,
      revisionCount: { increment: 1 },
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId,
      projectId: task.projectId,
      action: "REVISION_REQUESTED",
      metadata: { gate: "MANAGER", notes, revisionCount: task.revisionCount + 1 },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return updatedTask;
}

// ---------------------------------------------------------------------------
// Gate 2: Client Approval (Admin)
// ---------------------------------------------------------------------------

/** Admin approves for client → CLIENT_APPROVAL → APPROVED */
export async function clientApproveTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "approveForClient")) {
    throw new Error("FORBIDDEN: Only admins can approve for clients.");
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, projectId: true },
  });

  if (!task) throw new Error("Task not found");
  if (task.status !== TaskStatus.CLIENT_APPROVAL) {
    throw new Error(`Cannot client-approve from status: ${task.status}`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.APPROVED },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId,
      projectId: task.projectId,
      action: "APPROVED",
      metadata: { gate: "CLIENT", previousStatus: task.status, newStatus: TaskStatus.APPROVED },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return updatedTask;
}

/** Admin requests client revision → CLIENT_APPROVAL → CLIENT_REVISION */
export async function clientRequestRevision(taskId: string, notes: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "approveForClient")) {
    throw new Error("FORBIDDEN: Only admins can manage client approvals.");
  }

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, status: true, projectId: true, revisionCount: true },
  });

  if (!task) throw new Error("Task not found");
  if (task.status !== TaskStatus.CLIENT_APPROVAL) {
    throw new Error(`Cannot client-revise from status: ${task.status}`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.CLIENT_REVISION,
      revisionCount: { increment: 1 },
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId,
      projectId: task.projectId,
      action: "REVISION_REQUESTED",
      metadata: { gate: "CLIENT", notes, revisionCount: task.revisionCount + 1 },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return updatedTask;
}
