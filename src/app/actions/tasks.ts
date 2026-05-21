"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Priority, TaskStatus, Role } from "@prisma/client";
import { cacheDelete, CacheKeys } from "@/lib/cache";
import { broadcastTaskNotification } from "@/lib/realtime-server";

// ---------------------------------------------------------------------------
// Create Task
// ---------------------------------------------------------------------------

export async function createTask(data: {
  projectId: string;
  title: string;
  description?: string;
  priority: Priority;
  assignedToId?: string;
  assigneeIds?: string[];
  dueDate?: Date;
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

  // Build assignees connect array for M:N relation
  const assigneeConnect = data.assigneeIds?.length
    ? data.assigneeIds.map((id) => ({ id }))
    : leadAssigneeId
      ? [{ id: leadAssigneeId }]
      : undefined;

  const task = await db.task.create({
    data: {
      projectId: data.projectId,
      title: data.title,
      description: data.description,
      priority: data.priority,
      assignedToId: leadAssigneeId || undefined,
      assignedById: session.user.id,
      status: TaskStatus.BACKLOG,
      dueDate: data.dueDate,
      ...(assigneeConnect ? { assignees: { connect: assigneeConnect } } : {}),
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
  // ─── PERF: Invalidate Redis caches affected by new task ────────────────────
  cacheDelete(CacheKeys.DASHBOARD_COUNTS, CacheKeys.PROJECTS_STATUS_COUNTS).catch(() => {});

  // Broadcast task creation notification to all clients
  broadcastTaskNotification({
    type: "TASK_CREATED",
    taskId: task.id,
    taskTitle: data.title,
    projectId: data.projectId,
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: data.assigneeIds || (leadAssigneeId ? [leadAssigneeId] : []),
  }).catch(() => {});

  return task;
}

// ---------------------------------------------------------------------------
// Valid Status Transitions (from Brief §7)
// ---------------------------------------------------------------------------

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  [TaskStatus.BACKLOG]: [TaskStatus.TODO],
  [TaskStatus.TODO]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW],
  [TaskStatus.IN_REVIEW]: [TaskStatus.REVISION, TaskStatus.CLIENT_APPROVAL],
  [TaskStatus.REVISION]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.CLIENT_APPROVAL]: [TaskStatus.APPROVED, TaskStatus.CLIENT_REVISION],
  [TaskStatus.CLIENT_REVISION]: [TaskStatus.IN_PROGRESS],
  [TaskStatus.APPROVED]: [TaskStatus.DONE],
  [TaskStatus.DONE]: [],
};

// Roles allowed to transition INTO certain statuses
const STATUS_ROLE_RESTRICTIONS: Partial<Record<TaskStatus, Role[]>> = {
  [TaskStatus.CLIENT_APPROVAL]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.APPROVED]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.REVISION]: [Role.SUPER_ADMIN, Role.ADMIN],
  [TaskStatus.CLIENT_REVISION]: [Role.SUPER_ADMIN, Role.ADMIN],
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
    select: { id: true, status: true, projectId: true, assignedToId: true, revisionCount: true },
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

  const updatedTask = await db.task.update({
    where: { id: data.taskId },
    data: {
      status: data.status,
      ...(isRevision ? { revisionCount: { increment: 1 } } : {}),
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

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task status change notification
  broadcastTaskNotification({
    type: "TASK_STATUS_CHANGED",
    taskId: data.taskId,
    taskTitle: "Task",
    projectId: task.projectId,
    actorName: session.user.name || "Someone",
    actorId: session.user.id,
    assigneeIds: task.assignedToId ? [task.assignedToId] : [],
    oldStatus: oldStatus,
    newStatus: data.status,
  }).catch(() => {});

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
    db.notification.create({
      data: {
        userId: newAssigneeId,
        type: "TASK_ASSIGNED",
        title: `You've been assigned: ${task.title}`,
        body: `Assigned by ${session.user.name || "a team member"}`,
        linkUrl: `/tasks`,
      },
    }),
  ]);

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task assignment notification
  broadcastTaskNotification({
    type: "TASK_CREATED",
    taskId,
    taskTitle: task.title,
    projectId: task.projectId,
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
    select: { id: true, assignedToId: true, projectId: true, title: true },
  });

  if (!task) throw new Error("Task not found");

  const userRole = session.user.role as Role;
  const isAssignee = task.assignedToId === session.user.id;

  // Decision logic: Admins/Super Admins or the Assignee can delete
  if (!isAssignee && !hasPermission(userRole, "editAnyTask")) {
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

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task update notification
  broadcastTaskNotification({
    type: data.status ? "TASK_STATUS_CHANGED" : "TASK_CREATED",
    taskId,
    taskTitle: updatedTask.title,
    projectId: task.projectId,
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

  const updatedTask = await db.task.update({
    where: { id: taskId },
    data: { status: TaskStatus.DONE },
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
              body: `${session.user.name || "An employee"} marked a task as DONE in ${task.project.title}`,
              linkUrl: `/tasks`,
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

  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");

  // Broadcast task completion notification
  broadcastTaskNotification({
    type: "TASK_STATUS_CHANGED",
    taskId,
    taskTitle: task.title,
    projectId: task.projectId,
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
