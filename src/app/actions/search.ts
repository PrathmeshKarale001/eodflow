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
  const canViewProjects = hasPermission(role, "editProject") || hasPermission(role, "viewAllProjects");
  const canViewClients = hasPermission(role, "viewAllClients") || hasPermission(role, "viewOwnClients");

  // Run ALL queries in parallel — not sequentially
  const [tasks, projects, clients, files] = await Promise.all([
    // Search tasks
    db.task.findMany({
      where: {
        title: { contains: query, mode: "insensitive" },
        ...(role === Role.EMPLOYEE ? { assignedToId: session.user.id } : {}),
      },
      include: { project: { select: { title: true } } },
      take: 5,
    }),

    // Search projects (if permitted)
    canViewProjects
      ? db.project.findMany({
          where: { title: { contains: query, mode: "insensitive" } },
          include: { client: { select: { companyName: true } } },
          take: 5,
        })
      : Promise.resolve([]),

    // Search clients (if permitted)
    canViewClients
      ? db.client.findMany({
          where: {
            companyName: { contains: query, mode: "insensitive" },
            ...(role !== Role.SUPER_ADMIN ? { pocAdminId: session.user.id } : {}),
          },
          take: 5,
        })
      : Promise.resolve([]),

    // Search files
    db.file.findMany({
      where: {
        originalName: { contains: query, mode: "insensitive" },
        ...(role === Role.EMPLOYEE ? { uploadedById: session.user.id } : {}),
      },
      take: 5,
    }),
  ]);

  // Build results from parallel responses
  const results: SearchResult[] = [];

  for (const task of tasks) {
    results.push({
      id: task.id,
      type: "task",
      title: task.title,
      subtitle: `${task.project?.title || "No Project"} — ${task.status.replace(/_/g, " ")}`,
      href: `/projects/${task.projectId}`,
    });
  }

  for (const project of projects) {
    results.push({
      id: project.id,
      type: "project",
      title: project.title,
      subtitle: (project as any).client?.companyName ?? "",
      href: `/projects/${project.id}`,
    });
  }

  for (const client of clients) {
    results.push({
      id: client.id,
      type: "client",
      title: client.companyName,
      subtitle: client.industry ?? "Client",
      href: `/clients/${client.id}`,
    });
  }

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
