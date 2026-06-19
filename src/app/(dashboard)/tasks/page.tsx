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

  // SUPER_ADMIN sees ALL tasks; ADMIN sees tasks they own, assigned to others, or in their managed projects; EMPLOYEE sees only their own
  const tasksWhereClause: Prisma.TaskWhereInput =
    userRole === Role.SUPER_ADMIN
      ? {}
      : userRole === Role.ADMIN
        ? {
            OR: [
              { assignedToId: session.user.id },
              { assignedById: session.user.id },
              { project: { assignedManagerId: session.user.id } },
            ],
          }
        : { OR: [{ assignedToId: session.user.id }, { assignedById: session.user.id }] };

  // ─── PERF: All queries are independent → run in parallel ────────────────
  const [tasks, teamMembers, projects, brands] = await Promise.all([
    db.task.findMany({
      where: tasksWhereClause,
      include: {
        assignedTo: { select: { id: true, name: true, image: true } },
        assignedBy: { select: { id: true, name: true } },
        assignees: { select: { id: true, name: true, image: true } },
        project: {
          select: {
            id: true,
            title: true,
            client: { select: { id: true, companyName: true, brandColor: true } },
          },
        },
        _count: { select: { files: true } },
        subtasks: {
          select: { id: true, title: true, isDone: true },
          orderBy: { sortOrder: "asc" },
        },
      },
      orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
    }),
    // Fetch team members for assignment dropdown (admins get all active, employees get managers to select assigner)
    canAssign
      ? db.user.findMany({
          where: { isActive: true },
          select: { id: true, name: true, role: true, department: true, image: true },
          orderBy: { name: "asc" },
        })
      : db.user.findMany({
          where: { isActive: true, role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
          select: { id: true, name: true, role: true, department: true, image: true },
          orderBy: { name: "asc" },
        }),
    // Fetch projects for Task Creation selector (with clientId for brand filtering)
    // ADMIN only sees their managed/created projects; SUPER_ADMIN + EMPLOYEE see all active
    canCreateTask
      ? db.project.findMany({
          where:
            userRole === Role.ADMIN
              ? {
                  status: { not: "COMPLETED" },
                  OR: [
                    { assignedManagerId: session.user.id },
                    { createdById: session.user.id },
                  ],
                }
              : { status: { not: "COMPLETED" } },
          select: { id: true, title: true, clientId: true },
          orderBy: { title: "asc" },
        })
      : Promise.resolve([]),
    // Fetch brands for brand selector
    canCreateTask
      ? db.client.findMany({
          where: { isActive: true },
          select: { id: true, companyName: true },
          orderBy: { companyName: "asc" },
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
      brands={brands}
      canCreateTask={canCreateTask}
    />
  );
}
