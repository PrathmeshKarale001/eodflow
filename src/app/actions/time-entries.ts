"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Create Time Entry
// ---------------------------------------------------------------------------

export async function createTimeEntry(data: {
  taskId: string;
  durationMins: number;
  notes?: string;
  startedAt?: Date;
  stoppedAt?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "logTime")) {
    throw new Error("FORBIDDEN: Cannot log time.");
  }

  const entry = await db.timeEntry.create({
    data: {
      taskId: data.taskId,
      userId: session.user.id,
      durationMins: data.durationMins,
      notes: data.notes,
      startedAt: data.startedAt,
      stoppedAt: data.stoppedAt,
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      action: "TIME_LOGGED",
      metadata: { durationMins: data.durationMins, notes: data.notes },
    },
  });

  revalidatePath("/tasks");
  return entry;
}

// ---------------------------------------------------------------------------
// Get Time Entries for a Task
// ---------------------------------------------------------------------------

export async function getTaskTimeEntries(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const entries = await db.timeEntry.findMany({
    where: { taskId },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return entries;
}
