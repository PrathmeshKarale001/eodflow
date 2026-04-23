"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

// ─── Start a live timer on a task ────────────────────────────────────────────
export async function startTimer(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  // Stop any currently running timer first
  const running = await db.timeEntry.findFirst({
    where: { userId: session.user.id, stoppedAt: null, startedAt: { not: null } },
  });
  if (running) {
    const mins = Math.round((Date.now() - running.startedAt!.getTime()) / 60000);
    await db.timeEntry.update({
      where: { id: running.id },
      data: { stoppedAt: new Date(), durationMins: Math.max(mins, 1) },
    });
  }

  const entry = await db.timeEntry.create({
    data: {
      taskId,
      userId: session.user.id,
      durationMins: 0,
      startedAt: new Date(),
      entryDate: new Date(),
    },
  });

  revalidatePath("/time");
  return entry;
}

// ─── Stop the running timer ───────────────────────────────────────────────────
export async function stopTimer(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const entry = await db.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== session.user.id) throw new Error("Not found");

  const mins = Math.round((Date.now() - (entry.startedAt?.getTime() ?? Date.now())) / 60000);

  const updated = await db.timeEntry.update({
    where: { id: entryId },
    data: { stoppedAt: new Date(), durationMins: Math.max(mins, 1) },
  });

  // Log activity
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: entry.taskId,
      action: "TIME_LOGGED",
      metadata: { durationMins: updated.durationMins, source: "timer" },
    },
  });

  revalidatePath("/time");
  return updated;
}

// ─── Get the currently running timer (if any) ────────────────────────────────
export async function getRunningTimer() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.timeEntry.findFirst({
    where: { userId: session.user.id, stoppedAt: null, startedAt: { not: null } },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { title: true } },
        },
      },
    },
  });
}

// ─── Log a manual time entry ──────────────────────────────────────────────────
export async function logManualEntry(data: {
  taskId: string;
  hours: number;
  minutes: number;
  notes?: string;
  entryDate: string; // ISO date string
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const durationMins = data.hours * 60 + data.minutes;
  if (durationMins <= 0) throw new Error("Duration must be greater than 0");

  const entry = await db.timeEntry.create({
    data: {
      taskId: data.taskId,
      userId: session.user.id,
      durationMins,
      notes: data.notes || null,
      entryDate: new Date(data.entryDate),
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      action: "TIME_LOGGED",
      metadata: { durationMins, source: "manual", notes: data.notes },
    },
  });

  revalidatePath("/time");
  return entry;
}

// ─── Delete a time entry (own only) ──────────────────────────────────────────
export async function deleteTimeEntry(entryId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const entry = await db.timeEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== session.user.id) throw new Error("Not found");

  await db.timeEntry.delete({ where: { id: entryId } });
  revalidatePath("/time");
}

// ─── Get my time entries (last N days) ───────────────────────────────────────
export async function getMyTimeEntries(days = 7) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const since = new Date();
  since.setDate(since.getDate() - days);

  return db.timeEntry.findMany({
    where: { userId: session.user.id, entryDate: { gte: since } },
    include: {
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { title: true, client: { select: { companyName: true } } } },
        },
      },
    },
    orderBy: { entryDate: "desc" },
  });
}

// ─── Get team time entries (admin/manager) ────────────────────────────────────
export async function getTeamTimeEntries(days = 7) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const role = session.user.role;
  if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "MANAGER") {
    throw new Error("Unauthorized");
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  return db.timeEntry.findMany({
    where: { entryDate: { gte: since } },
    include: {
      user: { select: { id: true, name: true, department: true } },
      task: {
        select: {
          id: true,
          title: true,
          project: { select: { title: true, client: { select: { companyName: true } } } },
        },
      },
    },
    orderBy: { entryDate: "desc" },
  });
}

// ─── Get tasks assignable to current user (for manual entry dropdown) ─────────
export async function getMyAssignedTasks() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  return db.task.findMany({
    where: {
      assignedToId: session.user.id,
      status: { notIn: ["DONE", "APPROVED"] },
    },
    select: {
      id: true,
      title: true,
      project: { select: { title: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}
