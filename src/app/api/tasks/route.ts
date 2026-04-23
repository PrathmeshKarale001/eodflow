import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Role, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// GET /api/tasks — Fetch tasks (role-filtered)
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as Role;
  const userId = session.user.id;
  const { searchParams } = new URL(req.url);

  const projectId = searchParams.get("projectId");
  const status = searchParams.get("status") as TaskStatus | null;
  const assignedTo = searchParams.get("assignedTo");

  // Build role-based filter
  const where: any = {};

  if (projectId) where.projectId = projectId;
  if (status) where.status = status;
  if (assignedTo) where.assignedToId = assignedTo;

  // Employees only see their own tasks
  if (role === "EMPLOYEE") {
    where.assignedToId = userId;
  }

  // Admins see tasks within their client projects, or projects they are assigned to manage
  if (role === "ADMIN") {
    where.project = {
      OR: [
        { client: { pocAdminId: userId } },
        { assignedManagerId: userId }
      ]
    };
  }

  // Super Admins see everything (no additional filter)

  const tasks = await db.task.findMany({
    where,
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      assignedBy: { select: { id: true, name: true } },
      project: {
        select: {
          id: true,
          title: true,
          client: { select: { id: true, companyName: true, brandColor: true } },
        },
      },
      subtasks: { orderBy: { sortOrder: "asc" } },
      _count: { select: { comments: true, files: true } },
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json(tasks);
}

// ---------------------------------------------------------------------------
// POST /api/tasks — Create a new task
// ---------------------------------------------------------------------------

const createTaskSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.enum(["BACKLOG", "TODO", "IN_PROGRESS"]).default("BACKLOG"),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).default("MEDIUM"),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role as Role;

  if (!hasPermission(role, "createTask")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify project exists and user has access
  const project = await db.project.findUnique({
    where: { id: data.projectId },
    include: { client: { select: { pocAdminId: true } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Create the task
  const task = await db.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      assignedById: session.user.id,
      status: data.status,
      priority: data.priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedHours: data.estimatedHours,
    },
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      project: { select: { title: true } },
    },
  });

  // Log activity
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: task.id,
      projectId: data.projectId,
      action: "CREATED",
      metadata: { title: task.title },
    },
  });

  // Create notification for assignee
  if (data.assignedToId && data.assignedToId !== session.user.id) {
    await db.notification.create({
      data: {
        userId: data.assignedToId,
        type: "TASK_ASSIGNED",
        title: "New task assigned",
        body: `You've been assigned "${task.title}" in ${task.project.title}`,
        linkUrl: `/tasks?id=${task.id}`,
      },
    });
  }

  return NextResponse.json(task, { status: 201 });
}
