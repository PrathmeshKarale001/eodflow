"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { notify } from "@/lib/notify";
import { hasPermission } from "@/lib/permissions";
import { Priority, TaskStatus, Role } from "@prisma/client";
import { cacheDelete, CacheKeys } from "@/lib/cache";
import { broadcastTaskNotification } from "@/lib/realtime-server";

// ---------------------------------------------------------------------------
// Create Task
// ---------------------------------------------------------------------------

export async function createTask(data: {
  projectId?: string;
  title: string;
  description?: string;
  priority: Priority;
  assignedToId?: string;
  assigneeIds?: string[];
  dueDate?: Date;
  assignedById?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  // Derive lead assignee: explicit assignedToId, or first from assigneeIds array
  const leadAssigneeId = data.assignedToId || data.assigneeIds?.[0];
  const isSelfAssign = userRole === Role.EMPLOYEE && (!leadAssigneeId || leadAssigneeId === session.user.id);

  if (!hasPermission(userRole, "createTask") && !isSelfAssign) {
    throw new Error("FORBIDDEN: Insufficient permissions to create tasks.");
  }

  // Employees can only assign tasks to themselves
  if (userRole === Role.EMPLOYEE && leadAssigneeId && leadAssigneeId !== session.user.id) {
    if (!hasPermission(userRole, "assignTask")) {
      throw new Error("FORBIDDEN: Employees can only create tasks for themselves.");
    }
  }

  // ─── Determine initial status ──────────────────────────────────────────────
  // Employee claims a manager/director assigned them → PENDING_APPROVAL (needs acknowledgement)
  // Manager claims director assigned them → TODO (directors are busy, skip approval)
  // Self-assigned by anyone → TODO (ready to work)
  const employeeClaimsManager = userRole === Role.EMPLOYEE
    && data.assignedById
    && data.assignedById !== session.user.id;
  const initialStatus = employeeClaimsManager ? TaskStatus.PENDING_APPROVAL : TaskStatus.TODO;

  // Build assignees connect array for M:N relation
  const assigneeConnect = data.assigneeIds?.length
    ? data.assigneeIds.map((id) => ({ id }))
    : leadAssigneeId
      ? [{ id: leadAssigneeId }]
      : undefined;

  const task = await db.task.create({
    data: {
      ...(data.projectId ? { projectId: data.projectId } : {}),
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedToId: leadAssigneeId || undefined,
      assignedById: data.assignedById || session.user.id,
      status: initialStatus,
      dueDate: data.dueDate,
      ...(assigneeConnect ? { assignees: { connect: assigneeConnect } } : {}),
    },
  });

  // Create activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      ...(data.projectId ? { projectId: data.projectId } : {}),
      taskId: task.id,
      action: "CREATED",
      metadata: { title: data.title, priority: data.priority },
    },
  });

  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  revalidatePath("/tasks");
  // ─── PERF: Invalidate Redis caches affected by new task ────────────────────
  cacheDelete(CacheKeys.DASHBOARD_COUNTS, CacheKeys.PROJECTS_STATUS_COUNTS).catch(() => {});

  // Broadcast task creation notification to all clients
  broadcastTaskNotification({
    type: "TASK_CREATED",
    taskId: task.id,
    taskTitle: data.title,
    projectId: data.projectId || "",
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: data.assigneeIds || (leadAssigneeId ? [leadAssigneeId] : []),
  }).catch(() => {});

  // ─── Notifications ─────────────────────────────────────────────────────────
  if (employeeClaimsManager && data.assignedById) {
    // Employee claimed a manager assigned them → notify the manager to approve
    notify({
      userId: data.assignedById,
      type: "APPROVAL_REQUESTED",
      title: "Task approval required",
      body: `${session.user.name || "An employee"} created a task and needs your approval: "${data.title}"`,
      linkUrl: `/tasks?taskId=${task.id}`,
      tag: `pending-approval-${task.id}`,
    }).catch(() => {});
  } else {
    // Manager-assigned or self-assigned → notify assignees directly
    const assigneesToNotify = (data.assigneeIds || (leadAssigneeId ? [leadAssigneeId] : []))
      .filter((id) => id !== session.user.id); // Don't notify yourself
    if (assigneesToNotify.length > 0) {
      const { notifyMany } = await import("@/lib/notify");
      notifyMany(assigneesToNotify, {
        type: "TASK_ASSIGNED",
        title: `New task assigned: ${data.title}`,
        body: `${session.user.name || "Manager"} assigned you a new task`,
        linkUrl: `/tasks?taskId=${task.id}`,
        tag: `task-assigned-${task.id}`,
      }).catch(() => {});
    }
  }

  return task;
}

// ---------------------------------------------------------------------------
// Valid Status Transitions (from Brief §7)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.PENDING_APPROVAL]: [TaskStatus.TODO],       // Manager approves → TODO
  [TaskStatus.BACKLOG]: [TaskStatus.TODO],
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.REVISION, TaskStatus.DONE], // APPROVE now → DONE directly
  [TaskStatus.REVISION]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.CLIENT_APPROVAL]: [TaskStatus.DONE],        // legacy — kept for existing data
  [TaskStatus.CLIENT_REVISION]: [TaskStatus.IN_PROGRESS], // legacy — kept for existing data
  [TaskStatus.APPROVED]: [TaskStatus.DONE],                // legacy — kept for existing APPROVED tasks
  [TaskStatus.DONE]: [],
};

// Roles allowed to transition INTO certain statuses
const STATUS_ROLE_RESTRICTIONS: Partial<Record<TaskStatus, Role[]>> = {
  [TaskStatus.TODO]: undefined, // default: all roles (but PENDING_APPROVAL → TODO checked below)
  [TaskStatus.CLIENT_APPROVAL]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.REVISION]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.CLIENT_REVISION]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.DONE]: [Role.SUPER_ADMIN, Role.ADMIN],
};

function isValidTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
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
    select: { id: true, status: true, projectId: true, assignedToId: true, revisionCount: true, startedAt: true },
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

  // No-op: if the task is already in the target status (e.g. double-click race),
  // return the task as-is instead of throwing an error.
  if (task.status === data.status) {
    return db.task.findUnique({
      where: { id: data.taskId },
      include: {
        assignedTo: { select: { id: true, name: true, image: true } },
        assignedBy: { select: { id: true, name: true, image: true } },
        project: { select: { title: true, client: { select: { companyName: true } } } },
      },
    });
  }

  // Validate transition
  if (!isValidTransition(task.status, data.status)) {
    throw new Error(`INVALID_TRANSITION: Cannot move from ${task.status} to ${data.status}.`);
  }

  // Validate role restrictions for target status
  const roleRestriction = STATUS_ROLE_RESTRICTIONS[data.status];
  if (roleRestriction && !roleRestriction.includes(userRole)) {
    throw new Error(`FORBIDDEN: Only ${roleRestriction.join("/")} can move tasks to ${data.status}.`);
  }

  const oldStatus = task.status;

  // Increment revision count on revision transitions
  const isRevision = data.status === TaskStatus.REVISION || data.status === TaskStatus.CLIENT_REVISION;

  // ─── TIME TRACKING: Auto-set startedAt / completedAt ──────────────────────
  const isStarting = data.status === TaskStatus.IN_PROGRESS;
  const isCompleting = data.status === TaskStatus.DONE || data.status === TaskStatus.APPROVED;
  const wasCompleted = oldStatus === TaskStatus.DONE || oldStatus === TaskStatus.APPROVED;

  const updatedTask = await db.task.update({
    where: { id: data.taskId },
    data: {
      status: data.status,
      ...(isRevision ? { revisionCount: { increment: 1 } } : {}),
      // Set startedAt on first move to IN_PROGRESS (don't overwrite)
      ...(isStarting && !task.startedAt ? { startedAt: new Date() } : {}),
      // Set completedAt when task is marked DONE/APPROVED
      ...(isCompleting ? { completedAt: new Date() } : {}),
      // Clear completedAt if task is moved back from DONE/APPROVED
      ...(wasCompleted && !isCompleting ? { completedAt: null } : {}),
    },
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

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task status change notification
  broadcastTaskNotification({
    type: "TASK_STATUS_CHANGED",
    taskId: data.taskId,
    taskTitle: "Task",
    projectId: task.projectId || "",
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: task.assignedToId ? [task.assignedToId] : [],
    oldStatus: oldStatus,
    newStatus: data.status,
  }).catch(() => {});

  // ─── Push notifications for critical status changes ───────────────────────
  // Manager approves a PENDING_APPROVAL task → notify the employee who created it
  if (oldStatus === TaskStatus.PENDING_APPROVAL && data.status === TaskStatus.TODO && task.assignedToId && task.assignedToId !== session.user.id) {
    notify({
      userId: task.assignedToId,
      type: "TASK_STATUS_CHANGED",
      title: "Task approved for work! ✓",
      body: `"${updatedTask.title}" has been approved — you can start working`,
      linkUrl: `/tasks?taskId=${data.taskId}`,
      tag: `approved-work-${data.taskId}`,
    }).catch(() => {});
  }

  // Employee submits for review → notify the project manager
  if (data.status === TaskStatus.IN_REVIEW && task.projectId) {
    const project = await db.project.findUnique({
      where: { id: task.projectId },
      select: { assignedManagerId: true },
    });
    if (project?.assignedManagerId && project.assignedManagerId !== session.user.id) {
      notify({
        userId: project.assignedManagerId,
        type: "APPROVAL_REQUESTED",
        title: "Task ready for review",
        body: `"${updatedTask.title}" submitted by ${session.user.name || "an employee"}`,
        linkUrl: `/tasks?taskId=${data.taskId}`,
        tag: `review-${data.taskId}`,
      }).catch(() => {});
    }
  }

  // Manager sends revision → notify the assignee
  if ((data.status === TaskStatus.REVISION || data.status === TaskStatus.CLIENT_REVISION) && task.assignedToId && task.assignedToId !== session.user.id) {
    notify({
      userId: task.assignedToId,
      type: "REVISION_REQUESTED",
      title: "Revision requested",
      body: `Your task needs changes — ${session.user.name || "Manager"}`,
      linkUrl: `/tasks?taskId=${data.taskId}`,
      tag: `revision-${data.taskId}`,
    }).catch(() => {});
  }

  // Manager approves (IN_REVIEW → DONE) or finalizes (APPROVED → DONE) → notify the assignee
  if (data.status === TaskStatus.DONE && task.assignedToId && task.assignedToId !== session.user.id) {
    notify({
      userId: task.assignedToId,
      type: "TASK_STATUS_CHANGED",
      title: "Task approved & completed! ✓",
      body: `"${updatedTask.title}" has been approved`,
      linkUrl: `/tasks?taskId=${data.taskId}`,
      tag: `approved-${data.taskId}`,
    }).catch(() => {});
  }

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
        assignees: { select: { id: true, name: true, image: true } },
        _count: { select: { comments: true, files: true, subtasks: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
    db.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, email: true, image: true, role: true, department: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return { project, tasks, teamMembers };
}

// ---------------------------------------------------------------------------
// Reassign Task (Director / POC)
// ---------------------------------------------------------------------------

export async function reassignTask(taskId: string, newAssigneeId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const isSelfAssign = userRole === Role.EMPLOYEE && newAssigneeId === session.user.id;

  if (!hasPermission(userRole, "assignTask") && !isSelfAssign) {
    throw new Error("FORBIDDEN: You do not have permission to assign tasks.");
  }

  // ─── PERF: Parallel lookups (task + assignee are independent) ─────────────
  const [task, newAssignee] = await Promise.all([
    db.task.findUnique({
      where: { id: taskId },
      include: { assignedTo: { select: { name: true } } },
    }),
    db.user.findUnique({
      where: { id: newAssigneeId },
      select: { id: true, name: true, department: true },
    }),
  ]);

  // Employees can only reassign to themselves
  if (userRole === Role.EMPLOYEE && newAssigneeId !== session.user.id && !hasPermission(userRole, "assignTask")) {
    throw new Error("FORBIDDEN: Employees can only assign tasks to themselves.");
  }
  if (!task) throw new Error("NOT_FOUND: Task not found.");
  if (!newAssignee) throw new Error("NOT_FOUND: Assignee not found.");

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { assignedToId: newAssigneeId, assignedById: session.user.id },
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
    },
  });

  // ─── PERF: Fire-and-forget — don't block response on logging/notifications ──
  void Promise.all([
    db.activityLog.create({
      data: {
        userId: session.user.id,
        taskId,
        projectId: task.projectId,
        action: "ASSIGNED",
        metadata: {
          previousAssignee: task.assignedTo?.name || "Unassigned",
          newAssignee: newAssignee.name,
        },
      },
    }),
    notify({
      userId: newAssigneeId,
      type: "TASK_ASSIGNED",
      title: `You've been assigned: ${task.title}`,
      body: `Assigned by ${session.user.name || "a team member"}`,
      linkUrl: `/tasks?taskId=${taskId}`,
      tag: `task-assigned-${taskId}`,
    }),
  ]);

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task assignment notification
  broadcastTaskNotification({
    type: "TASK_CREATED",
    taskId,
    taskTitle: task.title,
    projectId: task.projectId || "",
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: [newAssigneeId],
  }).catch(() => {});

  return updatedTask;
}

// ---------------------------------------------------------------------------
// Get All Tasks (for Admin/Super Admin view)
// ---------------------------------------------------------------------------

export async function getAllTasks() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "assignTask")) {
    throw new Error("FORBIDDEN");
  }

  const tasks = await db.task.findMany({
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      project: { select: { id: true, title: true } },
      files: {
        select: { id: true, filename: true, fileUrl: true, mimeType: true, fileSize: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      subtasks: {
        select: { id: true, title: true, isDone: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// Delete Task
// ---------------------------------------------------------------------------

export async function deleteTask(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, assignedToId: true, assignedById: true, projectId: true, title: true },
  });

  if (!task) throw new Error("Task not found");

  const userRole = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;
  const isCreator = task.assignedById === session.user.id;

  // Decision logic: Admins/Super Admins, the Assignee, or the Creator can delete
  if (!isAssignee && !isCreator && !hasPermission(userRole, "editAnyTask")) {
    throw new Error("FORBIDDEN: Insufficient permissions to delete this task.");
  }

  await db.task.delete({ where: { id: taskId } });

  // Activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      projectId: task.projectId,
      action: "DELETED",
      metadata: { title: task.title },
    },
  });

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Update Task (Full)
// ---------------------------------------------------------------------------

export async function updateTask(taskId: string, data: {
  title?: string;
  description?: string;
  priority?: Priority;
  assignedToId?: string;
  assignedById?: string;
  dueDate?: Date;
  status?: TaskStatus;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: taskId },
    select: { id: true, assignedToId: true, projectId: true },
  });

  if (!task) throw new Error("Task not found");

  const userRole = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;

  if (!isAssignee && !hasPermission(userRole, "editAnyTask")) {
    throw new Error("FORBIDDEN: Insufficient permissions to edit this task.");
  }

  // Employees can only assign tasks to themselves
  if (userRole === Role.EMPLOYEE && data.assignedToId && data.assignedToId !== session.user.id) {
    if (!hasPermission(userRole, "assignTask")) {
      throw new Error("FORBIDDEN: Employees can only assign tasks to themselves.");
    }
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      ...data,
      assignedToId: data.assignedToId === "" ? null : data.assignedToId,
      assignedById: data.assignedById === "" ? null : data.assignedById,
    },
  });

  // Activity log for basic fields
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      taskId: taskId,
      projectId: task.projectId,
      action: "UPDATED",
      metadata: { updatedFields: Object.keys(data) },
    },
  });

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task update notification
  broadcastTaskNotification({
    type: data.status ? "TASK_STATUS_CHANGED" : "TASK_CREATED",
    taskId,
    taskTitle: updatedTask.title,
    projectId: task.projectId || "",
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: updatedTask.assignedToId ? [updatedTask.assignedToId] : [],
    newStatus: data.status,
  }).catch(() => {});

  return updatedTask;
}

// ---------------------------------------------------------------------------
// Mark Task as Done (Action + Notify Managers)
// ---------------------------------------------------------------------------

export async function markTaskDone(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const task = await db.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { title: true } } },
  });

  if (!task) throw new Error("Task not found");

  const userRole = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;

  if (!isAssignee && !hasPermission(userRole, "editAnyTask")) {
    throw new Error("FORBIDDEN");
  }

  // Enforce status transition rules:
  // - ADMIN/SUPER_ADMIN can mark DONE from any non-final status (force-done)
  // - EMPLOYEE can only mark DONE from APPROVED status (must go through review)
  const finalStatuses = [TaskStatus.DONE, TaskStatus.APPROVED];
  if (task.status === TaskStatus.DONE) {
    throw new Error("Task is already DONE.");
  }
  if (userRole === Role.EMPLOYEE && task.status !== TaskStatus.APPROVED) {
    throw new Error(`Cannot mark DONE from ${task.status}. Submit for review first.`);
  }

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: {
      status: TaskStatus.DONE,
      completedAt: new Date(),
      // Set startedAt if it was never set (task went straight to DONE)
      ...(!task.startedAt ? { startedAt: task.createdAt } : {}),
    },
  });

  // ─── PERF: Fire-and-forget — don't block response on logging/notifications ──
  void Promise.all([
    // Notify managers if employee marks done
    userRole === Role.EMPLOYEE
      ? db.user.findMany({
          where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] }, isActive: true },
          select: { id: true },
        }).then((managers) =>
          db.notification.createMany({
            data: managers.map((m) => ({
              userId: m.id,
              type: "TASK_STATUS_CHANGED" as const,
              title: `Task completed: ${task.title}`,
              body: `${session.user.name || "An employee"} marked a task as DONE in ${task.project?.title || "a project"}`,
              linkUrl: `/tasks?taskId=${taskId}`,
            })),
          })
        )
      : Promise.resolve(),
    // Activity log
    db.activityLog.create({
      data: {
        userId: session.user.id,
        taskId: taskId,
        projectId: task.projectId,
        action: "STATUS_CHANGED",
        metadata: { oldStatus: task.status, newStatus: TaskStatus.DONE },
      },
    }),
  ]);

  if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task completion notification
  broadcastTaskNotification({
    type: "TASK_STATUS_CHANGED",
    taskId,
    taskTitle: task.title,
    projectId: task.projectId || "",
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: task.assignedToId ? [task.assignedToId] : [],
    oldStatus: task.status,
    newStatus: TaskStatus.DONE,
  }).catch(() => {});

  return updatedTask;
}

// ---------------------------------------------------------------------------
// Get team members (for assignment dropdowns)
// ---------------------------------------------------------------------------

export async function getTeamMembers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  return db.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true, department: true, image: true },
    orderBy: { name: "asc" },
  });
}

// ---------------------------------------------------------------------------
// Get Task Files (on-demand — used by task detail drawer)
// ---------------------------------------------------------------------------

export async function getTaskFiles(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  return db.file.findMany({
    where: { taskId },
    select: {
      id: true,
      filename: true,
      fileUrl: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
      uploadedById: true,
      version: true,
      parentFileId: true,
      uploadedBy: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Get Task Activities (on-demand — used by task detail drawer)
// ---------------------------------------------------------------------------

export async function getTaskActivities(taskId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  return db.activityLog.findMany({
    where: { taskId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
