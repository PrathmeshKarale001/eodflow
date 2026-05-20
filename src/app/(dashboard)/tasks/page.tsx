import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text leading-none">
              {canAssign ? "ALL_TASKS" : "MY_TASKS"}
            </h1>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-on-surface/50">
              {canAssign ? "MANAGE & ASSIGN" : "ACTIVE ASSIGNMENTS"} // {tasks.length} ITEMS
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canCreateTask && (
              <Link
                href="?action=new-task"
                className="mono-clip bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                NEW_TASK
              </Link>
            )}
            <span className="material-symbols-outlined text-[36px] text-primary">checklist</span>
          </div>
        </div>
      </div>

      {/* Task List */}
      <MyTasksList
        tasks={tasks}
        userId={session.user.id}
        userRole={userRole}
        canAssign={canAssign}
        teamMembers={teamMembers}
        projects={projects}
        canCreateTask={canCreateTask}
      />
    </div>
  );
}
