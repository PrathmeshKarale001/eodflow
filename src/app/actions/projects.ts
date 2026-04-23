"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { Priority, ProjectStatus } from "@prisma/client";

export async function updateProject(
  projectId: string,
  data: {
    title: string;
    priority: Priority;
    status: ProjectStatus;
    deadline?: string;
    briefObjective?: string;
    briefDeliverables?: string;
    assignedManagerId?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "editProject")) {
    throw new Error("You don't have permission to edit projects.");
  }

  const project = await db.project.update({
    where: { id: projectId },
    data: {
      title: data.title,
      priority: data.priority,
      status: data.status,
      deadline: data.deadline ? new Date(data.deadline) : null,
      briefObjective: data.briefObjective || null,
      briefDeliverables: data.briefDeliverables || null,
      assignedManagerId: data.assignedManagerId || null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return project;
}

export async function deleteProject(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "deleteProject")) {
    throw new Error("You don't have permission to delete projects.");
  }

  await db.project.delete({ where: { id: projectId } });

  revalidatePath("/projects");
}
