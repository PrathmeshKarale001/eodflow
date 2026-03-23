import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { Role, TaskStatus, ProjectStatus } from "@prisma/client";
import { StatCard } from "@/components/dashboard/stat-card";
import { AgencyOverview } from "@/components/dashboard/agency-overview";
import { BottleneckAlerts } from "@/components/dashboard/bottleneck-alerts";

export default async function OverviewPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const userRole = session.user.role as Role;

  // All roles see some version of the dashboard; directors see full KPIs
  const isDirector = hasPermission(userRole, "viewAgencyDashboard") || hasPermission(userRole, "viewTeamWorkload");

  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  // Parallel data fetching — all queries fire simultaneously
  const [
    activeProjectCount,
    allTasks,
    overdueTasks,
    bottleneckTasks,
    teamMemberCount,
    weeklyTimeTotal,
    recentActivities,
  ] = await Promise.all([
    db.project.count({ where: { status: ProjectStatus.ACTIVE } }),
    db.task.groupBy({ by: ["status"], _count: { id: true } }),
    db.task.count({
      where: {
        dueDate: { lt: new Date() },
        status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] },
      },
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
      take: 20,
    }),
    db.user.count({ where: { isActive: true } }),
    db.timeEntry.aggregate({
      where: { createdAt: { gte: startOfWeek } },
      _sum: { durationMins: true },
    }),
    db.activityLog.findMany({
      include: {
        user: { select: { name: true } },
        task: { select: { title: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  // Transform groupBy results into a Record
  const statusCounts: Record<string, number> = {};
  let totalTasks = 0;
  for (const group of allTasks) {
    statusCounts[group.status] = group._count.id;
    totalTasks += group._count.id;
  }

  const weeklyMinutes = weeklyTimeTotal._sum.durationMins || 0;
  const weeklyHours = Math.round(weeklyMinutes / 60);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-[#180065] text-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase">
              MISSION_CONTROL
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-neutral-400 mt-1">
              AGENCY_OVERVIEW // REAL-TIME OPERATIONAL STATUS
            </p>
          </div>
          <span className="material-symbols-outlined text-[40px] text-white/30">monitoring</span>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="ACTIVE_PROJECTS"
          value={activeProjectCount}
          icon="folder_open"
          accent="border-t-blue-500"
        />
        <StatCard
          label="TOTAL_TASKS"
          value={totalTasks}
          icon="task"
          accent="border-t-purple-500"
        />
        <StatCard
          label="IN_PROGRESS"
          value={statusCounts[TaskStatus.IN_PROGRESS] || 0}
          icon="pending"
          accent="border-t-amber-500"
        />
        <StatCard
          label="OVERDUE"
          value={overdueTasks}
          icon="schedule"
          accent="border-t-red-500"
          subtitle="PAST_DEADLINE"
        />
        <StatCard
          label="TEAM_SIZE"
          value={teamMemberCount}
          icon="group"
          accent="border-t-green-500"
        />
        <StatCard
          label="HOURS_THIS_WEEK"
          value={weeklyHours}
          icon="timer"
          accent="border-t-cyan-500"
          subtitle={`${weeklyMinutes}m TOTAL`}
        />
      </div>

      {/* Task Distribution Chart */}
      <AgencyOverview statusCounts={statusCounts} totalTasks={totalTasks} />

      {/* Bottleneck Alerts & Activity Feed */}
      <BottleneckAlerts bottleneckTasks={bottleneckTasks} activities={recentActivities} />
    </div>
  );
}
