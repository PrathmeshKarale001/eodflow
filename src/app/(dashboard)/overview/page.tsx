import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Role, TaskStatus, ProjectStatus } from "@prisma/client";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { cacheFetch, CacheKeys, CacheTTL } from "@/lib/cache";
import { checkDueReminders } from "@/app/actions/reminders";
import { DateRangePicker } from "@/components/dashboard/date-range-picker";

// ─── PERF: No force-dynamic needed — Next.js auto-detects from searchParams ──
// ─── PERF: Redis-cached dashboard counts (with DB fallback) ─────────────────
// Uses Upstash Redis when configured, otherwise queries Postgres directly.
// These counts change rarely but were queried on every dashboard load.
async function getCachedCounts() {
  return cacheFetch(
    CacheKeys.DASHBOARD_COUNTS,
    async () => {
      const [activeProjects, totalClients, totalTeam] = await Promise.all([
        db.project.count({ where: { status: ProjectStatus.ACTIVE } }),
        db.client.count({ where: { isActive: true } }),
        db.user.count({ where: { isActive: true } }),
      ]);
      return { activeProjects, totalClients, totalTeam };
    },
    CacheTTL.DASHBOARD_COUNTS,
  );
}

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const resolvedParams = await searchParams;
  const session = await auth();
  if (!session?.user?.id) return notFound();

  // Run due date reminders check passively in background
  checkDueReminders().catch((err) => console.error("[CRON_REMINDERS] error", err));

  const userId = session.user.id;
  const role = session.user.role as Role;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const nextWeek = new Date(Date.now() + 7 * 86400000);

  // Parse date range query params
  const startFilter = resolvedParams?.startDate ? new Date(resolvedParams.startDate) : startOfWeek;
  const endFilter = resolvedParams?.endDate ? new Date(resolvedParams.endDate) : undefined;

  if (startFilter) startFilter.setHours(0, 0, 0, 0);
  if (endFilter) endFilter.setHours(23, 59, 59, 999);

  const dateRangeQuery = {
    gte: startFilter,
    ...(endFilter ? { lte: endFilter } : {}),
  };

  const rangeMs = endFilter ? (endFilter.getTime() - startFilter.getTime()) : (7 * 86400 * 1000);
  const prevStartFilter = new Date(startFilter.getTime() - rangeMs);
  const prevEndFilter = new Date(startFilter.getTime());
  const prevDateRangeQuery = {
    gte: prevStartFilter,
    lt: prevEndFilter,
  };

  // ─── SUPER_ADMIN ────────────────────────────────────────────────────────────
  if (role === "SUPER_ADMIN") {
    // Cached counts (60s TTL) + real-time metrics in parallel
    const [
      cachedCounts,
      overdueTasks,
      tasksInReview,
      completedThisWeek,
      weeklyTime,
      lastWeekTime,
      recentActivities,
      // Productivity snapshot data
      completedToday,
      recentlyCompletedTasks,
      completedWithRevisions,
      blockedTasks,
      topPerformerData,
    ] = await Promise.all([
      getCachedCounts(),
      db.task.count({
        where: { dueDate: { lt: new Date() }, status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] } },
      }),
      db.task.count({ where: { status: { in: [TaskStatus.IN_REVIEW, TaskStatus.CLIENT_APPROVAL] } } }),
      db.task.count({ where: { status: TaskStatus.DONE, updatedAt: dateRangeQuery } }),
      db.timeEntry.aggregate({ where: { createdAt: dateRangeQuery }, _sum: { durationMins: true } }),
      db.timeEntry.aggregate({
        where: { createdAt: prevDateRangeQuery },
        _sum: { durationMins: true },
      }),
      db.activityLog.findMany({
        include: { user: { select: { name: true } }, task: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      // Tasks completed today
      db.task.count({
        where: { status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] }, updatedAt: { gte: startOfToday } },
      }),
      // Recently completed tasks (this week) for avg completion time calc
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
          completedAt: dateRangeQuery,
          startedAt: { not: null },
        },
        select: { startedAt: true, completedAt: true },
        take: 100,
      }),
      // Completed tasks this week that had revisions
      db.task.count({
        where: {
          status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
          updatedAt: dateRangeQuery,
          revisionCount: { gt: 0 },
        },
      }),
      // Tasks stuck in review > 24h
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.IN_REVIEW, TaskStatus.REVISION, TaskStatus.CLIENT_APPROVAL] },
          updatedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
        include: {
          assignedTo: { select: { name: true } },
          project: { select: { title: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: 6,
      }),
      // Top performers this week (by completed tasks)
      db.task.groupBy({
        by: ["assignedToId"],
        where: {
          status: { in: [TaskStatus.DONE, TaskStatus.APPROVED] },
          updatedAt: dateRangeQuery,
          assignedToId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 3,
      }),
    ]);

    const { activeProjects, totalClients, totalTeam } = cachedCounts;

    // Calculate avg completion hours
    let avgCompletionHours = 0;
    if (recentlyCompletedTasks.length > 0) {
      const totalHours = recentlyCompletedTasks.reduce((sum, t) => {
        if (t.startedAt && t.completedAt) {
          return sum + (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      avgCompletionHours = Math.round(totalHours / recentlyCompletedTasks.length);
    }

    // Revision rate
    const revisionRate = completedThisWeek > 0 ? Math.round((completedWithRevisions / completedThisWeek) * 100) : 0;

    // Resolve top performer names
    const topPerformerIds = topPerformerData.map((g) => g.assignedToId).filter(Boolean) as string[];
    const topPerformerUsers = topPerformerIds.length > 0 ? await db.user.findMany({
      where: { id: { in: topPerformerIds } },
      select: { id: true, name: true },
    }) : [];
    const topPerformers = topPerformerData.map((g) => ({
      name: topPerformerUsers.find((u) => u.id === g.assignedToId)?.name ?? "Unknown",
      count: g._count.id,
    }));

    const productivitySnapshot = {
      completedToday,
      avgCompletionHours,
      revisionRate,
      topPerformers,
      blockedTasks: blockedTasks as any,
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <DashboardHeader role="AGENCY_CONTROL" subtitle="FULL_AGENCY_OVERVIEW // KPI_DASHBOARD" />
        <DateRangePicker />
        <SuperAdminDashboard
          activeProjects={activeProjects}
          totalClients={totalClients}
          overdueTasks={overdueTasks}
          totalTeam={totalTeam}
          weeklyHours={Math.round((weeklyTime._sum.durationMins ?? 0) / 60)}
          lastWeekHours={Math.round((lastWeekTime._sum.durationMins ?? 0) / 60)}
          tasksInReview={tasksInReview}
          completedThisWeek={completedThisWeek}
          productivitySnapshot={productivitySnapshot}
          recentActivities={recentActivities as any}
        />
      </div>
    );
  }

  // ─── ADMIN (formerly MANAGER) ────────────────────────────────────────────────────────────────
  if (role === "ADMIN") {
    // Stage 1: Fetch managed projects + scoped data in parallel
    const [managedProjects, pendingReview, upcomingDeadlines, weeklyTime, pendingApproval, managerOwnTasks] = await Promise.all([
      db.project.findMany({
        where: { assignedManagerId: userId },
        include: {
          client: { select: { companyName: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: { updatedAt: "desc" },
      }),
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.IN_REVIEW, TaskStatus.CLIENT_APPROVAL, TaskStatus.REVISION] },
          OR: [
            { project: { assignedManagerId: userId } },
            { assignedById: userId },
          ],
        },
        include: {
          assignedTo: { select: { name: true } },
          project: { select: { title: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: 20,
      }),
      db.task.findMany({
        where: {
          dueDate: { gte: new Date(), lte: nextWeek },
          status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
          OR: [
            { project: { assignedManagerId: userId } },
            { assignedToId: userId },
            { assignedById: userId },
          ],
        },
        include: {
          assignedTo: { select: { name: true } },
          project: { select: { title: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 15,
      }),
      db.timeEntry.aggregate({ where: { userId, createdAt: dateRangeQuery }, _sum: { durationMins: true } }),
      // Tasks where employees claim THIS manager assigned them — awaiting acknowledgement
      db.task.findMany({
        where: {
          status: TaskStatus.PENDING_APPROVAL,
          assignedById: userId,
        },
        include: {
          assignedTo: { select: { id: true, name: true, image: true } },
          project: { select: { title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      // Manager's own assigned tasks (for MY_TASKS section)
      db.task.findMany({
        where: {
          assignedToId: userId,
          status: { notIn: [TaskStatus.APPROVED] },
        },
        include: { project: { select: { title: true } } },
        orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
        take: 20,
      }),
    ]);

    // Stage 2: Get team workload scoped to THIS manager's managed projects only
    const managedProjectIds = managedProjects.map((p) => p.id);
    const [teamMembers, tasksByMember, inProgressByMember] = await Promise.all([
      // Find employees who have tasks in this manager's projects
      db.user.findMany({
        where: {
          isActive: true,
          role: "EMPLOYEE",
          assignedTasks: { some: { projectId: { in: managedProjectIds } } },
        },
        select: { id: true, name: true },
      }),
      db.task.groupBy({
        by: ["assignedToId"],
        where: {
          status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
          projectId: { in: managedProjectIds },
        },
        _count: { id: true },
      }),
      db.task.groupBy({
        by: ["assignedToId"],
        where: {
          status: TaskStatus.IN_PROGRESS,
          projectId: { in: managedProjectIds },
        },
        _count: { id: true },
      }),
    ]);

    const teamWorkload = teamMembers.map((m) => ({
      userId: m.id,
      userName: m.name,
      taskCount: tasksByMember.find((g) => g.assignedToId === m.id)?._count.id ?? 0,
      inProgressCount: inProgressByMember.find((g) => g.assignedToId === m.id)?._count.id ?? 0,
    })).sort((a, b) => b.taskCount - a.taskCount);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <DashboardHeader role="MANAGER_VIEW" subtitle="TEAM_WORKLOAD // PROJECT_STATUS" />
        <DateRangePicker />
        <ManagerDashboard
          managedProjects={managedProjects as any}
          teamWorkload={teamWorkload}
          pendingReview={pendingReview as any}
          upcomingDeadlines={upcomingDeadlines as any}
          weeklyHours={Math.round((weeklyTime._sum.durationMins ?? 0) / 60)}
          pendingApproval={pendingApproval as any}
          myTasks={managerOwnTasks as any}
        />
      </div>
    );
  }

  // ─── EMPLOYEE (default) ─────────────────────────────────────────────────────
  const [myTasks, todayTime, weeklyTime, recentComments] = await Promise.all([
    db.task.findMany({
      where: {
        OR: [
          { assignedToId: userId },
          { assignedById: userId },
        ],
        status: { notIn: [TaskStatus.APPROVED] },
      },
      include: { project: { select: { title: true } } },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      take: 30,
    }),
    db.timeEntry.aggregate({
      where: { userId, entryDate: { gte: startOfToday } },
      _sum: { durationMins: true },
    }),
    db.timeEntry.aggregate({
      where: { userId, createdAt: dateRangeQuery },
      _sum: { durationMins: true },
    }),
    db.comment.findMany({
      where: {
        task: { assignedToId: userId },
        userId: { not: userId }, // others' comments
      },
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <DashboardHeader role="MY_DASHBOARD" subtitle={`WELCOME_BACK // ${(session.user.name ?? "").toUpperCase().replace(" ", "_")}`} />
      <DateRangePicker />
      <EmployeeDashboard
        myName={session.user.name ?? ""}
        myTasks={myTasks as any}
        todayHours={Math.round((todayTime._sum.durationMins ?? 0) / 60)}
        weekHours={Math.round((weeklyTime._sum.durationMins ?? 0) / 60)}
        weekTarget={40}
        recentComments={recentComments as any}
      />
    </div>
  );
}

function DashboardHeader({ role, subtitle }: { role: string; subtitle: string }) {
  return (
    <div className="brutalist-border bg-[#180065] text-white p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-4xl font-headline tracking-tighter uppercase leading-none">{role}</h1>
          <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-neutral-400 mt-1.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <a
            href="/tasks?action=new-task"
            className="flex h-9 items-center gap-1.5 px-3 sm:px-4 bg-white/10 hover:bg-white/20 border border-white/20 text-[10px] sm:text-xs font-headline font-bold uppercase transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span className="hidden sm:inline">New </span>Task
          </a>
          <a
            href="/projects/new"
            className="flex h-9 items-center gap-1.5 px-3 sm:px-4 border border-white/10 text-white/60 hover:text-white hover:border-white/30 text-[10px] sm:text-xs font-headline font-bold uppercase transition-colors"
          >
            <span className="material-symbols-outlined text-sm">create_new_folder</span>
            <span className="hidden sm:inline">New </span>Project
          </a>
        </div>
      </div>
    </div>
  );
}
