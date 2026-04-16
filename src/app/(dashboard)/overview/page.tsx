import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Role, TaskStatus, ProjectStatus } from "@prisma/client";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { EmployeeDashboard } from "@/components/dashboard/employee-dashboard";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

// Cache slow-changing counts (activeProjects, totalClients, totalTeam)
// These change rarely but were being queried on EVERY dashboard load
const getCachedCounts = unstable_cache(
  async () => {
    const [activeProjects, totalClients, totalTeam] = await Promise.all([
      db.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      db.client.count({ where: { isActive: true } }),
      db.user.count({ where: { isActive: true } }),
    ]);
    return { activeProjects, totalClients, totalTeam };
  },
  ["dashboard-counts"],
  { revalidate: 60 } // Fresh every 60 seconds
);

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();


  const userId = session.user.id;
  const role = session.user.role as Role;

  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const nextWeek = new Date(Date.now() + 7 * 86400000);

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
      bottlenecks,
      recentActivities,
    ] = await Promise.all([
      getCachedCounts(),
      db.task.count({
        where: { dueDate: { lt: new Date() }, status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] } },
      }),
      db.task.count({ where: { status: { in: [TaskStatus.IN_REVIEW, TaskStatus.CLIENT_APPROVAL] } } }),
      db.task.count({ where: { status: TaskStatus.DONE, updatedAt: { gte: startOfWeek } } }),
      db.timeEntry.aggregate({ where: { createdAt: { gte: startOfWeek } }, _sum: { durationMins: true } }),
      db.timeEntry.aggregate({
        where: { createdAt: { gte: lastWeekStart, lt: startOfWeek } },
        _sum: { durationMins: true },
      }),
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.IN_REVIEW, TaskStatus.REVISION, TaskStatus.CLIENT_APPROVAL] },
          updatedAt: { lt: cutoff48h },
        },
        include: {
          assignedTo: { select: { name: true } },
          project: { select: { title: true } },
        },
        orderBy: { updatedAt: "asc" },
        take: 10,
      }),
      db.activityLog.findMany({
        include: { user: { select: { name: true } }, task: { select: { title: true } } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
    ]);

    const { activeProjects, totalClients, totalTeam } = cachedCounts;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <DashboardHeader role="AGENCY_CONTROL" subtitle="FULL_AGENCY_OVERVIEW // KPI_DASHBOARD" />
        <SuperAdminDashboard
          activeProjects={activeProjects}
          totalClients={totalClients}
          overdueTasks={overdueTasks}
          totalTeam={totalTeam}
          weeklyHours={Math.round((weeklyTime._sum.durationMins ?? 0) / 60)}
          lastWeekHours={Math.round((lastWeekTime._sum.durationMins ?? 0) / 60)}
          tasksInReview={tasksInReview}
          completedThisWeek={completedThisWeek}
          bottlenecks={bottlenecks as any}
          recentActivities={recentActivities as any}
        />
      </div>
    );
  }

  // ─── ADMIN (formerly MANAGER) ────────────────────────────────────────────────────────────────
  if (role === "ADMIN") {
    // Stage 1: Fetch teamMembers first (needed for groupBy filters)
    const [teamMembers, managedProjects, pendingReview, upcomingDeadlines, weeklyTime] = await Promise.all([
      db.user.findMany({
        where: { isActive: true, role: "EMPLOYEE" },
        select: { id: true, name: true },
      }),
      db.project.findMany({
        where: { assignedManagerId: userId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { updatedAt: "desc" },
        take: 10,
      }),
      db.task.findMany({
        where: {
          status: { in: [TaskStatus.IN_REVIEW, TaskStatus.CLIENT_APPROVAL, TaskStatus.REVISION] },
          project: { assignedManagerId: userId },
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
          dueDate: { lte: nextWeek },
          status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
          project: { assignedManagerId: userId },
        },
        include: {
          assignedTo: { select: { name: true } },
          project: { select: { title: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 15,
      }),
      db.timeEntry.aggregate({ where: { createdAt: { gte: startOfWeek } }, _sum: { durationMins: true } }),
    ]);

    // Stage 2: GroupBy queries (depend on teamMembers IDs) — run in parallel
    const memberIds = teamMembers.map((m) => m.id);
    const [tasksByMember, inProgressByMember] = await Promise.all([
      db.task.groupBy({
        by: ["assignedToId"],
        where: {
          status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
          assignedToId: { in: memberIds },
        },
        _count: { id: true },
      }),
      db.task.groupBy({
        by: ["assignedToId"],
        where: {
          status: TaskStatus.IN_PROGRESS,
          assignedToId: { in: memberIds },
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
        <ManagerDashboard
          managedProjects={managedProjects as any}
          teamWorkload={teamWorkload}
          pendingReview={pendingReview as any}
          upcomingDeadlines={upcomingDeadlines as any}
          weeklyHours={Math.round((weeklyTime._sum.durationMins ?? 0) / 60)}
        />
      </div>
    );
  }

  // ─── EMPLOYEE (default) ─────────────────────────────────────────────────────
  const [myTasks, todayTime, weeklyTime, recentComments] = await Promise.all([
    db.task.findMany({
      where: { assignedToId: userId, status: { notIn: [TaskStatus.APPROVED] } },
      include: { project: { select: { title: true } } },
      orderBy: [{ dueDate: "asc" }, { priority: "asc" }],
      take: 30,
    }),
    db.timeEntry.aggregate({
      where: { userId, entryDate: { gte: startOfToday } },
      _sum: { durationMins: true },
    }),
    db.timeEntry.aggregate({
      where: { userId, createdAt: { gte: startOfWeek } },
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
    <div className="brutalist-border bg-[#180065] text-white p-6 relative overflow-hidden">
      <div className="absolute inset-0 scanline opacity-20 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase">{role}</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mt-1">{subtitle}</p>
        </div>
        <span className="material-symbols-outlined text-[40px] text-on-surface/30">monitoring</span>
      </div>
    </div>
  );
}
