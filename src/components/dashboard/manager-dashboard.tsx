"use client";

function formatMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function daysUntil(date: Date) {
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  return diff;
}

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "bg-gray-500/20 text-gray-400",
  ACTIVE: "bg-blue-500/20 text-blue-400",
  ON_HOLD: "bg-amber-500/20 text-amber-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  ARCHIVED: "bg-gray-500/10 text-gray-500",
};

interface Props {
  managedProjects: Array<{
    id: string;
    title: string;
    status: string;
    deadline: Date | null;
    _count: { tasks: number };
  }>;
  teamWorkload: Array<{
    userId: string;
    userName: string;
    taskCount: number;
    inProgressCount: number;
  }>;
  pendingReview: Array<{
    id: string;
    title: string;
    status: string;
    project: { title: string };
    assignedTo: { name: string } | null;
  }>;
  upcomingDeadlines: Array<{
    id: string;
    title: string;
    dueDate: Date;
    priority: string;
    project: { title: string };
    assignedTo: { name: string } | null;
  }>;
  weeklyHours: number;
}

const PRIORITY_COLOR: Record<string, string> = {
  URGENT: "text-red-400",
  HIGH: "text-amber-400",
  MEDIUM: "text-blue-400",
  LOW: "text-gray-400",
};

export function ManagerDashboard({
  managedProjects,
  teamWorkload,
  pendingReview,
  upcomingDeadlines,
  weeklyHours,
}: Props) {
  const maxTasks = Math.max(...teamWorkload.map((m) => m.taskCount), 1);

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "PROJECTS_MANAGED", value: managedProjects.length, icon: "folder_managed", color: "border-t-blue-500" },
          { label: "PENDING_REVIEW", value: pendingReview.length, icon: "rate_review", color: "border-t-amber-500" },
          { label: "DUE_THIS_WEEK", value: upcomingDeadlines.filter(t => daysUntil(t.dueDate) <= 7).length, icon: "event_upcoming", color: "border-t-red-500" },
          { label: "HOURS_THIS_WEEK", value: weeklyHours, icon: "timer", color: "border-t-green-500" },
        ].map((k) => (
          <div key={k.label} className={`brutalist-border bg-card p-4 border-t-4 ${k.color}`}>
            <span className="material-symbols-outlined text-lg text-on-surface/40">{k.icon}</span>
            <p className="font-mono text-3xl font-bold text-on-surface mt-2">{k.value}</p>
            <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/50 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Managed Projects */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">folder_open</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">MY_PROJECTS</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {managedProjects.length === 0 ? (
              <p className="px-4 py-6 font-mono text-[9px] text-on-surface/30 text-center uppercase">No projects assigned</p>
            ) : (
              managedProjects.map((p) => {
                const days = p.deadline ? daysUntil(p.deadline) : null;
                return (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <span className={`font-mono text-[8px] px-2 py-0.5 flex-shrink-0 uppercase ${STATUS_COLOR[p.status] ?? ""}`}>
                      {p.status}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">{p.title}</p>
                      <p className="font-mono text-[8px] text-on-surface/40">{p._count.tasks} tasks</p>
                    </div>
                    {days !== null && (
                      <span className={`font-mono text-[8px] flex-shrink-0 ${days < 0 ? "text-red-400" : days <= 3 ? "text-amber-400" : "text-on-surface/30"}`}>
                        {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `${days}d`}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Team Workload */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">group</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">TEAM_WORKLOAD</h3>
          </div>
          <div className="p-4 space-y-3">
            {teamWorkload.length === 0 ? (
              <p className="font-mono text-[9px] text-on-surface/30 text-center uppercase py-4">No team members</p>
            ) : (
              teamWorkload.map((m) => (
                <div key={m.userId} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-headline text-[9px] uppercase tracking-wider text-card-text">{m.userName}</span>
                    <span className="font-mono text-[8px] text-on-surface/50">{m.taskCount} tasks</span>
                  </div>
                  <div className="h-1.5 bg-card-muted w-full">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${Math.min((m.taskCount / maxTasks) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Review */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-400">pending_actions</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">NEEDS_REVIEW</h3>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-48 overflow-y-auto">
            {pendingReview.length === 0 ? (
              <p className="px-4 py-6 font-mono text-[9px] text-on-surface/30 text-center uppercase">Nothing pending review ✓</p>
            ) : (
              pendingReview.map((t) => (
                <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                  <span className="font-mono text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 flex-shrink-0 uppercase">
                    {t.status.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-[9px] uppercase tracking-wider text-card-text truncate">{t.title}</p>
                    <p className="font-mono text-[8px] text-on-surface/40">{t.project.title} · {t.assignedTo?.name}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-red-400">event_upcoming</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">UPCOMING_DEADLINES</h3>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-48 overflow-y-auto">
            {upcomingDeadlines.length === 0 ? (
              <p className="px-4 py-6 font-mono text-[9px] text-on-surface/30 text-center uppercase">No upcoming deadlines</p>
            ) : (
              upcomingDeadlines.map((t) => {
                const days = daysUntil(t.dueDate);
                return (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3">
                    <span className={`font-mono text-[8px] w-12 text-center flex-shrink-0 ${days < 0 ? "text-red-400" : days <= 2 ? "text-amber-400" : "text-on-surface/40"}`}>
                      {days < 0 ? "LATE" : days === 0 ? "TODAY" : `${days}d`}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-headline text-[9px] uppercase tracking-wider truncate ${PRIORITY_COLOR[t.priority]}`}>{t.title}</p>
                      <p className="font-mono text-[8px] text-on-surface/40">{t.assignedTo?.name ?? "Unassigned"}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
