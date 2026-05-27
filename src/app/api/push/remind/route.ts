// =============================================================================
// EOD FLOW — Send Reminder API Route
// Lets managers/admins send push + in-app reminders to any employee
// =============================================================================

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as Role;
  if (!hasPermission(role, "reviewTask")) {
    return NextResponse.json({ error: "Only managers/admins can send reminders" }, { status: 403 });
  }

  try {
    const { targetUserId, taskId, message } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ error: "Target user ID required" }, { status: 400 });
    }

    // Get task info if provided
    let taskTitle = "";
    if (taskId) {
      const task = await db.task.findUnique({
        where: { id: taskId },
        select: { title: true },
      });
      taskTitle = task?.title || "";
    }

    const title = taskTitle
      ? `Reminder: ${taskTitle}`
      : "Reminder from your manager";
    const body = message || (taskTitle
      ? `Please check on "${taskTitle}" — ${session.user.name || "Manager"}`
      : `${session.user.name || "A manager"} sent you a reminder`);

    await notify({
      userId: targetUserId,
      type: "DEADLINE_REMINDER",
      title,
      body,
      linkUrl: taskId ? `/tasks?id=${taskId}` : "/tasks",
      tag: `reminder-${taskId || targetUserId}`,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[REMINDER] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to send reminder" }, { status: 500 });
  }
}
