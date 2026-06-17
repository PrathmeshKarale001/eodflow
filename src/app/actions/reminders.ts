"use server";

import { db } from "@/lib/db";
import { notify } from "@/lib/notify";
import { NotificationType, TaskStatus } from "@prisma/client";

export async function checkDueReminders() {
  try {
    // 1. Fetch tasks due within the next 24 hours that are active (not DONE or APPROVED)
    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await db.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: next24h,
        },
        status: {
          notIn: [TaskStatus.DONE, TaskStatus.APPROVED],
        },
        assignedToId: {
          not: null,
        },
      },
      select: {
        id: true,
        title: true,
        dueDate: true,
        assignedToId: true,
      },
    });

    if (tasks.length === 0) return { success: true, processed: 0 };

    let count = 0;
    for (const task of tasks) {
      if (!task.assignedToId) continue;

      // 2. Check if a deadline reminder notification has already been sent to this user for this task
      const linkUrl = `/tasks?taskId=${task.id}`;
      const existingNotification = await db.notification.findFirst({
        where: {
          userId: task.assignedToId,
          type: NotificationType.DEADLINE_REMINDER,
          linkUrl,
        },
      });

      if (!existingNotification) {
        // Formulate a friendly message
        const hoursLeft = Math.max(
          1,
          Math.round((new Date(task.dueDate!).getTime() - now.getTime()) / (1000 * 60 * 60))
        );

        await notify({
          userId: task.assignedToId,
          type: NotificationType.DEADLINE_REMINDER,
          title: `Task Deadline Approaching!`,
          body: `"${task.title}" is due in ${hoursLeft} hours.`,
          linkUrl,
        });
        count++;
      }
    }

    return { success: true, processed: count };
  } catch (err: any) {
    console.error("[REMINDERS_CRON] Error checking reminders:", err.message);
    return { success: false, error: err.message };
  }
}
