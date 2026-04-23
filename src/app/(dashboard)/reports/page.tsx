import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Role, TaskStatus, ProjectStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "viewTeamWorkload")) {
    return notFound();
  }

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Parallel fetch all report data
  const [
    projectsByStatus,
    tasksByStatus,
    overdueTasks,
    teamMembers,
    recentActivity,
    weeklyCompletions,
    monthlyCompletions,
    totalTimeThisWeek,
    projectsWithProgress,
  ] = await Promise.all([
    // Projects by status
    db.project.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    // Tasks by status
    db.task.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    // Overdue tasks
    db.task.count({
      where: {
        dueDate: { lt: now },
        status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
      },
    }),
    // Team performance (tasks per user)
    db.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        role: true,
        department: true,
        _count: {
          select: {
            assignedTasks: true,
          },
        },
        assignedTasks: {
          select: { status: true },
          where: {
            status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
            updatedAt: { gte: startOfMonth },
          },
        },
      },
      orderBy: { name: "asc" },
    }),
    // Recent activity
    db.activityLog.findMany({
      take: 20,
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
        project: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Completed this week
    db.task.count({
      where: {
        status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
        updatedAt: { gte: startOfWeek },
      },
    }),
    // Completed this month
    db.task.count({
      where: {
        status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
        updatedAt: { gte: startOfMonth },
      },
    }),
    // Total time logged this week (in minutes)
    db.timeEntry.aggregate({
      where: { entryDate: { gte: startOfWeek } },
      _sum: { durationMins: true },
    }),
    // Projects with task progress
    db.project.findMany({
      where: { status: { in: [ProjectStatus.ACTIVE, ProjectStatus.DRAFT] } },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        client: { select: { companyName: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { status: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  // Transform data for client
  const projectStatusCounts = Object.fromEntries(
    projectsByStatus.map((p) => [p.status, p._count.id])
  );

  const taskStatusCounts = Object.fromEntries(
    tasksByStatus.map((t) => [t.status, t._count.id])
  );

  const totalTasks = Object.values(taskStatusCounts).reduce((a: number, b: number) => a + b, 0);
  const completedTasks = (taskStatusCounts[TaskStatus.DONE] || 0) + (taskStatusCounts[TaskStatus.APPROVED] || 0);

  const teamPerformance = teamMembers.map((m) => ({
    id: m.id,
    name: m.name,
    role: m.role,
    department: m.department,
    totalTasks: m._count.assignedTasks,
    completedThisMonth: m.assignedTasks.length,
  }));

  const projectProgress = projectsWithProgress.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE" || t.status === "APPROVED").length;
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      clientName: p.client.companyName,
      deadline: p.deadline,
      taskCount: total,
      completedCount: done,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
    };
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              REPORTS
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50">
              ANALYTICS & PERFORMANCE METRICS
            </p>
          </div>
          <span className="material-symbols-outlined text-[36px] text-primary">analytics</span>
        </div>
      </div>

      <ReportsDashboard
        projectStatusCounts={projectStatusCounts}
        taskStatusCounts={taskStatusCounts}
        totalTasks={totalTasks}
        completedTasks={completedTasks}
        overdueTasks={overdueTasks}
        weeklyCompletions={weeklyCompletions}
        monthlyCompletions={monthlyCompletions}
        totalHoursThisWeek={Number(totalTimeThisWeek._sum?.durationMins || 0) / 60}
        teamPerformance={teamPerformance}
        projectProgress={projectProgress}
        recentActivity={recentActivity.map((a) => ({
          id: a.id,
          action: a.action,
          userName: a.user.name,
          taskTitle: a.task?.title || null,
          projectTitle: a.project?.title || null,
          createdAt: a.createdAt,
        }))}
      />
    </div>
  );
}
