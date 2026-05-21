import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { MyTasksList } from "@/components/tasks/my-tasks-list";
import { hasPermission } from "@/lib/permissions";
import { Role, Prisma } from "@prisma/client";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const userRole = session.user.role as Role;

  const canAssign = hasPermission(userRole, "assignTask");
  const canCreateTask = hasPermission(userRole, "createTask") || userRole === Role.EMPLOYEE; // all employees can self-assign

  // Admin/Super Admin see ALL tasks; employees see only their own
  const tasksWhereClause: Prisma.TaskWhereInput = hasPermission(userRole, "assignTask")
    ? {}
    : { OR: [{ assignedToId: session.user.id }, { assignedById: session.user.id }] };

  // ─── PERF: All 3 queries are independent → run in parallel ────────────────
  const [tasks, teamMembers, projects] = await Promise.all([
    db.task.findMany({
      where: tasksWhereClause,
      include: {
        assignedTo: { select: { id: true, name: true, image: true } },
        assignees: { select: { id: true, name: true, image: true } },
        project: { select: { id: true, title: true } },
        _count: { select: { files: true } },
        subtasks: {
          select: { id: true, title: true, isDone: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    // Fetch team members for assignment dropdown (admins only)
    canAssign
      ? db.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, role: true, department: true, image: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
    // Fetch projects for Task Creation selector
    canCreateTask
      ? db.project.findMany({
          where: { status: { not: "COMPLETED" } },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <MyTasksList
      tasks={tasks}
      userId={session.user.id}
      userRole={userRole}
      canAssign={canAssign}
      teamMembers={teamMembers}
      projects={projects}
      canCreateTask={canCreateTask}
    />
  );
}
