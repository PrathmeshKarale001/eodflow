import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Role, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// PATCH /api/tasks/[id] — Update a task (status, assignment, details)
// ---------------------------------------------------------------------------

const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  status: z.enum([
    "BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION",
    "CLIENT_APPROVAL", "CLIENT_REVISION", "APPROVED", "DONE",
  ]).optional(),
  priority: z.enum(["URGENT", "HIGH", "MEDIUM", "LOW"]).optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  estimatedHours: z.number().nullable().optional(),
  sortOrder: z.number().optional(),
});

// Valid status transitions (prevents skipping review gates)
const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  BACKLOG: ["TODO"],
  TODO: ["IN_PROGRESS", "BACKLOG"],
  IN_PROGRESS: ["IN_REVIEW", "TODO"],
  IN_REVIEW: ["REVISION", "CLIENT_APPROVAL", "IN_PROGRESS"],
  REVISION: ["IN_PROGRESS"],
  CLIENT_APPROVAL: ["APPROVED", "CLIENT_REVISION"],
  CLIENT_REVISION: ["IN_PROGRESS"],
  APPROVED: ["DONE"],
  DONE: [],  // Terminal state
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const role = session.user.role as Role;
  const userId = session.user.id;

  // Fetch existing task
  const existingTask = await db.task.findUnique({
    where: { id },
    include: {
      project: { select: { assignedManagerId: true, client: { select: { pocAdminId: true } } } },
    },
  });

  if (!existingTask) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Permission check: employees can only edit their own tasks (unless they are management employees editing management tasks)
  const isManagementEmployee = role === "EMPLOYEE" && session.user.department === "MANAGEMENT";
  if (role === "EMPLOYEE" && existingTask.assignedToId !== userId) {
    let isMgmtTask = false;
    if (isManagementEmployee) {
      const taskDetail = await db.task.findUnique({
        where: { id },
        select: {
          assignedTo: { select: { department: true } },
          assignedBy: { select: { department: true } },
        }
      });
      isMgmtTask = 
        taskDetail?.assignedTo?.department === "MANAGEMENT" ||
        taskDetail?.assignedBy?.department === "MANAGEMENT";
    }
    if (!isMgmtTask) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const body = await req.json();
  const parsed = updateTaskSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // Verify assignee is in MANAGEMENT if editor is a MANAGEMENT employee
  if (isManagementEmployee && data.assignedToId) {
    const assignee = await db.user.findUnique({
      where: { id: data.assignedToId },
      select: { department: true }
    });
    if (assignee?.department !== "MANAGEMENT") {
      return NextResponse.json({ error: "Forbidden: Management employees can only assign to other Management employees" }, { status: 403 });
    }
  }

  // Validate status transition
  if (data.status && data.status !== existingTask.status) {
    const validNext = VALID_TRANSITIONS[existingTask.status] || [];
    if (!validNext.includes(data.status as TaskStatus)) {
      return NextResponse.json(
        { error: `Cannot move from ${existingTask.status} to ${data.status}` },
        { status: 400 }
      );
    }

    // Role-based status restrictions
    if (data.status === "CLIENT_APPROVAL" && !hasPermission(role, "reviewTask")) {
      return NextResponse.json({ error: "Only managers+ can send to client approval" }, { status: 403 });
    }
    if (data.status === "APPROVED" && !hasPermission(role, "approveForClient")) {
      return NextResponse.json({ error: "Only admins+ can approve for client" }, { status: 403 });
    }
  }

  // Track revision count
  const revisionBump =
    data.status === "REVISION" || data.status === "CLIENT_REVISION" ? 1 : 0;

  // Update the task
  const updatedTask = await db.task.update({
    where: { id },
    data: {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : data.dueDate === null ? null : undefined,
      revisionCount: { increment: revisionBump },
    },
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      project: { select: { title: true, client: { select: { companyName: true } } } },
    },
  });

  // Log activity
  if (data.status) {
    await db.activityLog.create({
      data: {
        userId,
        taskId: id,
        projectId: existingTask.projectId,
        action: "STATUS_CHANGED",
        metadata: {
          from: existingTask.status,
          to: data.status,
          title: updatedTask.title,
        },
      },
    });
  }

  // Auto-notifications based on status changes
  if (data.status === "IN_REVIEW" && existingTask.project.assignedManagerId) {
    await db.notification.create({
      data: {
        userId: existingTask.project.assignedManagerId,
        type: "APPROVAL_REQUESTED",
        title: "Task ready for review",
        body: `"${updatedTask.title}" has been submitted for review`,
        linkUrl: `/tasks?id=${id}`,
      },
    });
  }

  if (data.status === "CLIENT_APPROVAL" && existingTask.project.client.pocAdminId) {
    await db.notification.create({
      data: {
        userId: existingTask.project.client.pocAdminId,
        type: "APPROVAL_REQUESTED",
        title: "Ready for client approval",
        body: `"${updatedTask.title}" passed internal review`,
        linkUrl: `/tasks?id=${id}`,
      },
    });
  }

  if ((data.status === "REVISION" || data.status === "CLIENT_REVISION") && existingTask.assignedToId) {
    await db.notification.create({
      data: {
        userId: existingTask.assignedToId,
        type: "REVISION_REQUESTED",
        title: "Revision requested",
        body: `"${updatedTask.title}" needs changes`,
        linkUrl: `/tasks?id=${id}`,
      },
    });
  }

  return NextResponse.json(updatedTask);
}
