"use client";

import Link from "next/link";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  totalTasks: number;
  completedThisMonth: number;
}

interface ProjectProgress {
  id: string;
  title: string;
  status: string;
  clientName: string;
  deadline: Date | null;
  taskCount: number;
  completedCount: number;
  progress: number;
}

interface Activity {
  id: string;
  action: string;
  userName: string;
  taskTitle: string | null;
  projectTitle: string | null;
  createdAt: Date;
}

interface ReportsDashboardProps {
  projectStatusCounts: Record<string, number>;
  taskStatusCounts: Record<string, number>;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  weeklyCompletions: number;
  monthlyCompletions: number;
  totalHoursThisWeek: number;
  teamPerformance: TeamMember[];
  projectProgress: ProjectProgress[];
  recentActivity: Activity[];
}

const ACTION_ICONS: Record<string, string> = {
  CREATED: "add_circle",
  UPDATED: "edit",
  DELETED: "delete",
  ASSIGNED: "person_add",
  STATUS_CHANGED: "swap_horiz",
  COMMENTED: "comment",
  FILE_UPLOADED: "upload_file",
  APPROVED: "check_circle",
  REJECTED: "cancel",
  REVISION_REQUESTED: "replay",
  TIME_LOGGED: "schedule",
};

const TASK_STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-neutral-500",
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-amber-500",
  IN_REVIEW: "bg-purple-500",
  REVISION: "bg-red-500",
  CLIENT_APPROVAL: "bg-orange-400",
  CLIENT_REVISION: "bg-orange-500",
  APPROVED: "bg-green-500",
  DONE: "bg-green-700",
};

export function ReportsDashboard({
  projectStatusCounts,
  taskStatusCounts,
  totalTasks,
  completedTasks,
  overdueTasks,
  weeklyCompletions,
  monthlyCompletions,
  totalHoursThisWeek,
  teamPerformance,
  projectProgress,
  recentActivity,
}: ReportsDashboardProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="COMPLETION_RATE"
          value={`${completionRate}%`}
          sub={`${completedTasks}/${totalTasks} tasks`}
          icon="donut_large"
          accent="text-green-400"
        />
        <KPICard
          label="OVERDUE"
          value={String(overdueTasks)}
          sub="tasks past deadline"
          icon="warning"
          accent={overdueTasks > 0 ? "text-red-500" : "text-green-400"}
        />
        <KPICard
          label="THIS_WEEK"
          value={String(weeklyCompletions)}
          sub="tasks completed"
          icon="event_available"
          accent="text-blue-400"
        />
        <KPICard
          label="HOURS_LOGGED"
          value={totalHoursThisWeek.toFixed(1)}
          sub="this week"
          icon="schedule"
          accent="text-amber-400"
        />
      </div>

      {/* ── Task Status Breakdown ────────────────────────────────────────── */}
      <div className="brutalist-border bg-card p-5">
        <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
          TASK_STATUS_DISTRIBUTION
        </h3>

        {/* Stacked bar */}
        {totalTasks > 0 && (
          <div className="h-4 brutalist-border flex overflow-hidden mb-4">
            {Object.entries(taskStatusCounts)
              .sort(([a], [b]) => {
                const order = ["TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION", "CLIENT_REVISION", "DONE", "APPROVED"];
                return order.indexOf(a) - order.indexOf(b);
              })
              .map(([status, count]) => (
                <div
                  key={status}
                  className={`${TASK_STATUS_COLORS[status] || "bg-neutral-500"} h-full transition-all`}
                  style={{ width: `${(count / totalTasks) * 100}%` }}
                  title={`${status}: ${count}`}
                />
              ))}
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(taskStatusCounts).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 ${TASK_STATUS_COLORS[status] || "bg-neutral-500"}`} />
              <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface/50">
                {status.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-[8px] text-primary font-bold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Project Progress ───────────────────────────────────────── */}
        <div className="brutalist-border bg-card p-5">
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
            PROJECT_PROGRESS
          </h3>
          <div className="space-y-3">
            {projectProgress.length === 0 ? (
              <p className="font-mono text-[9px] uppercase text-on-surface/30 tracking-widest text-center py-4">
                NO_ACTIVE_PROJECTS
              </p>
            ) : (
              projectProgress.map((p) => {
                const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== "COMPLETED";
                return (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="block group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0 flex-1">
                        <span className="font-headline text-[10px] uppercase tracking-wider text-card-text group-hover:text-primary transition-colors truncate block">
                          {p.title}
                        </span>
                        <span className="font-mono text-[8px] uppercase text-on-surface/30 tracking-widest">
                          {p.clientName}
                          {p.deadline && (
                            <> · {new Date(p.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
                          )}
                          {isOverdue && <span className="text-red-500 ml-1">OVERDUE</span>}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-primary font-bold ml-2">
                        {p.progress}%
                      </span>
                    </div>
                    <div className="h-1 bg-surface-container-high overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isOverdue ? "bg-red-500" : "bg-primary"}`}
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* ── Team Performance ───────────────────────────────────────── */}
        <div className="brutalist-border bg-card p-5">
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
            TEAM_PERFORMANCE
            <span className="font-mono text-[8px] text-on-surface/30 ml-2">THIS MONTH</span>
          </h3>
          <div className="space-y-2">
            {teamPerformance.length === 0 ? (
              <p className="font-mono text-[9px] uppercase text-on-surface/30 tracking-widest text-center py-4">
                NO_TEAM_DATA
              </p>
            ) : (
              teamPerformance
                .sort((a, b) => b.completedThisMonth - a.completedThisMonth)
                .slice(0, 10)
                .map((m) => (
                  <div key={m.id} className="flex items-center gap-3 py-1.5">
                    <div className="h-6 w-6 flex items-center justify-center bg-surface-container-high text-[9px] font-headline font-bold uppercase flex-shrink-0">
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between">
                        <span className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                          {m.name}
                        </span>
                        <span className="font-mono text-[8px] text-on-surface/40 ml-2 flex-shrink-0">
                          {m.department || "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="font-mono text-[8px] text-on-surface/40 uppercase tracking-widest">
                          {m.totalTasks} assigned
                        </span>
                        <span className="font-mono text-[8px] text-green-400 font-bold uppercase tracking-widest">
                          {m.completedThisMonth} done
                        </span>
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>

      {/* ── Monthly Stats + Recent Activity ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project status counts */}
        <div className="brutalist-border bg-card p-5">
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
            PROJECT_STATUS
          </h3>
          <div className="space-y-2">
            {Object.entries(projectStatusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/50">
                  {status.replace(/_/g, " ")}
                </span>
                <span className="font-headline text-sm text-card-text">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly overview */}
        <div className="brutalist-border bg-card p-5">
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
            MONTHLY_OVERVIEW
          </h3>
          <div className="space-y-4">
            <div className="text-center py-2">
              <span className="font-headline text-4xl text-primary">{monthlyCompletions}</span>
              <p className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40 mt-1">
                TASKS COMPLETED THIS MONTH
              </p>
            </div>
            <div className="brutalist-border bg-surface-container-lowest p-3 flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/40">
                WEEKLY AVG
              </span>
              <span className="font-headline text-sm text-card-text">
                {(monthlyCompletions / 4).toFixed(1)}
              </span>
            </div>
          </div>
        </div>

        {/* Recent activity feed */}
        <div className="brutalist-border bg-card p-5">
          <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
            RECENT_ACTIVITY
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <p className="font-mono text-[9px] uppercase text-on-surface/30 tracking-widest text-center py-4">
                NO_RECENT_ACTIVITY
              </p>
            ) : (
              recentActivity.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-on-surface/5 last:border-0">
                  <span className="material-symbols-outlined text-xs text-primary flex-shrink-0 mt-0.5">
                    {ACTION_ICONS[a.action] || "radio_button_unchecked"}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] text-on-surface/70 leading-tight">
                      <span className="font-bold text-card-text">{a.userName}</span>
                      {" "}
                      <span className="lowercase">{a.action.replace(/_/g, " ")}</span>
                      {a.taskTitle && (
                        <span className="text-primary"> {a.taskTitle}</span>
                      )}
                    </p>
                    <p className="font-mono text-[7px] text-on-surface/30 uppercase tracking-widest mt-0.5">
                      {new Date(a.createdAt).toLocaleString("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── KPI Card Component ────────────────────────────────────────────────────
function KPICard({
  label,
  value,
  sub,
  icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: string;
  accent: string;
}) {
  return (
    <div className="brutalist-border bg-card p-4 relative overflow-hidden group hover:bg-card/80 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <span className={`material-symbols-outlined text-xl ${accent}`}>{icon}</span>
        <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface/30">{label}</span>
      </div>
      <p className="font-headline text-2xl md:text-3xl text-card-text tracking-tight">{value}</p>
      <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface/40 mt-1">{sub}</p>
    </div>
  );
}
