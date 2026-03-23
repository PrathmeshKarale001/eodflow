"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export interface SearchResult {
  id: string;
  type: "task" | "project" | "client" | "file";
  title: string;
  subtitle: string;
  href: string;
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");
  if (!query || query.length < 2) return [];

  const role = session.user.role as Role;
  const results: SearchResult[] = [];

  // Search tasks
  const tasks = await db.task.findMany({
    where: {
      title: { contains: query, mode: "insensitive" },
      ...(role === Role.EMPLOYEE ? { assignedToId: session.user.id } : {}),
    },
    include: { project: { select: { title: true } } },
    take: 5,
  });

  for (const task of tasks) {
    results.push({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: `${task.project.title} — ${task.status.replace(/_/g, " ")}`,
      href: `/projects/${task.projectId}`,
    });
  }

  // Search projects
  if (hasPermission(role, "editProject") || hasPermission(role, "viewAllProjects")) {
    const projects = await db.project.findMany({
      where: { title: { contains: query, mode: "insensitive" } },
      include: { client: { select: { companyName: true } } },
      take: 5,
    });

    for (const project of projects) {
      results.push({
        id: project.id,
        type: "project",
        title: project.title,
        subtitle: project.client.companyName,
        href: `/projects/${project.id}`,
      });
    }
  }

  // Search clients
  if (hasPermission(role, "viewAllClients") || hasPermission(role, "viewOwnClients")) {
    const clients = await db.client.findMany({
      where: {
        companyName: { contains: query, mode: "insensitive" },
        ...(role !== Role.SUPER_ADMIN ? { pocAdminId: session.user.id } : {}),
      },
      take: 5,
    });

    for (const client of clients) {
      results.push({
        id: client.id,
        type: "client",
        title: client.companyName,
        subtitle: client.industry ?? "Client",
        href: `/clients/${client.id}`,
      });
    }
  }

  // Search files
  const files = await db.file.findMany({
    where: {
      originalName: { contains: query, mode: "insensitive" },
      ...(role === Role.EMPLOYEE ? { uploadedById: session.user.id } : {}),
    },
    take: 5,
  });

  for (const file of files) {
    results.push({
      id: file.id,
      type: "file",
      title: file.originalName,
      subtitle: `${(file.fileSize / 1024).toFixed(0)} KB`,
      href: file.fileUrl,
    });
  }

  return results;
}
