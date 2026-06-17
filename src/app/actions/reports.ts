"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function fetchActivitiesAction(offset: number, limit: number = 20) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const isSuperAdmin = userRole === Role.SUPER_ADMIN;
  const userId = session.user.id;

  let managedProjectIds: string[] = [];
  if (!isSuperAdmin) {
    const managedProjects = await db.project.findMany({
      where: {
        OR: [
          { assignedManagerId: userId },
          { createdById: userId },
        ],
      },
      select: { id: true },
    });
    managedProjectIds = managedProjects.map((p) => p.id);
  }

  const logs = await db.activityLog.findMany({
    skip: offset,
    take: limit,
    where: isSuperAdmin ? {} : { projectId: { in: managedProjectIds } },
    include: {
      user: { select: { name: true } },
      task: { select: { title: true } },
      project: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return logs.map((a) => ({
    id: a.id,
    action: a.action,
    userName: a.user.name,
    taskTitle: a.task?.title || null,
    projectTitle: a.project?.title || null,
    createdAt: a.createdAt,
  }));
}
