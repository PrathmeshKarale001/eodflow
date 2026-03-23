"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Priority, TaskStatus, Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Create Task
// ---------------------------------------------------------------------------

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  priority: Priority;
  assignedToId?: string;
  dueDate?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "createTask")) {
    throw new Error("FORBIDDEN: Insufficient permissions to create tasks.");
  }

  const task = await db.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedToId: data.assignedToId || undefined,
      assignedById: session.user.id,
      status: TaskStatus.BACKLOG,
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      projectId: data.projectId,
      taskId: task.id,
      action: "CREATED",
      metadata: { title: data.title, priority: data.priority },
    },
  });

  revalidatePath(`/projects/${data.projectId}`);
  return task;
}

// ---------------------------------------------------------------------------
// Update Task Status
// ---------------------------------------------------------------------------

export async function updateTaskStatus(data: {
  taskId: string;
  status: TaskStatus;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: data.taskId },
    select: { id: true, status: true, projectId: true, assignedToId: true },
  });

  if (!task) throw new Error("Task not found");

  const userRole = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;

  // Employees can only move their own tasks
  if (userRole === Role.EMPLOYEE && !isAssignee) {
    throw new Error("FORBIDDEN: You can only update your own tasks.");
  }

  if (!isAssignee && !hasPermission(userRole, "editAnyTask")) {
    throw new Error("FORBIDDEN: Insufficient permissions.");
  }

  const oldStatus = task.status;

  const updatedTask = await db.task.update({
    where: { id: data.taskId },
    data: { status: data.status },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: data.taskId,
      projectId: task.projectId,
      action: "STATUS_CHANGED",
      metadata: { oldStatus, newStatus: data.status },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return updatedTask;
}

// ---------------------------------------------------------------------------
// Get Project Tasks (parallel fetch)
// ---------------------------------------------------------------------------

export async function getProjectWithTasks(projectId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const [project, tasks, teamMembers] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      include: { client: true },
    }),
    db.task.findMany({
      where: { projectId },
      include: {
        assignedTo: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, files: true, subtasks: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true, role: { in: [Role.EMPLOYEE, Role.MANAGER] } },
      select: { id: true, name: true, email: true, image: true, role: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { project, tasks, teamMembers };
}
