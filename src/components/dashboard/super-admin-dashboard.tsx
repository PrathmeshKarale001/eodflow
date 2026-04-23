"use client";

import Link from "next/link";

interface Props {
  activeProjects: number;
  totalClients: number;
  overdueTasks: number;
  totalTeam: number;
  weeklyHours: number;
  lastWeekHours: number;
  tasksInReview: number;
  completedThisWeek: number;
  bottlenecks: Array<{
    id: string;
    title: string;
    status: string;
    assignedTo: { name: string } | null;
    project: { title: string };
    updatedAt: Date;
  }>;
  recentActivities: Array<{
    id: string;
    action: string;
    createdAt: Date;
    user: { name: string };
    task: { title: string } | null;
  }>;
}

function hoursChange(curr: number, prev: number) {
  if (prev === 0) return null;
  const diff = curr - prev;
  return { diff, pct: Math.round((diff / prev) * 100) };
}

function timeAgo(date: Date) {
  const now = new Date().getTime(); // Stable enough within the same render cycle
  const secs = Math.floor((now - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

const ACTION_LABELS: Record<string, string> = {
  CREATED: "created",
  UPDATED: "updated",
  STATUS_CHANGED: "changed status on",
  COMMENTED: "commented on",
  TIME_LOGGED: "logged time on",
  FILE_UPLOADED: "uploaded file to",
  ASSIGNED: "assigned",
  APPROVED: "approved",
};

export function SuperAdminDashboard({
  activeProjects,
  totalClients,
  overdueTasks,
  totalTeam,
  weeklyHours,
  lastWeekHours,
  tasksInReview,
  completedThisWeek,
  bottlenecks,
  recentActivities,
}: Props) {
  const change = hoursChange(weeklyHours, lastWeekHours);

  const kpis = [
    { label: "ACTIVE_PROJECTS", value: activeProjects, icon: "folder_open", color: "text-blue-400", border: "border-t-blue-500", href: "/projects" },
    { label: "CLIENTS", value: totalClients, icon: "business", color: "text-purple-400", border: "border-t-purple-500", href: "/clients" },
    { label: "TEAM_SIZE", value: totalTeam, icon: "group", color: "text-green-400", border: "border-t-green-500", href: "/settings" },
    { label: "OVERDUE", value: overdueTasks, icon: "warning", color: "text-red-400", border: "border-t-red-500", href: "/tasks" },
    { label: "IN_REVIEW", value: tasksInReview, icon: "rate_review", color: "text-amber-400", border: "border-t-amber-500", href: "/tasks" },
    { label: "DONE_THIS_WEEK", value: completedThisWeek, icon: "check_circle", color: "text-emerald-400", border: "border-t-emerald-500", href: "/reports" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={`brutalist-border bg-card p-4 border-t-4 ${k.border} hover:bg-card/80 transition-colors group block`}>
            <div className="flex items-start justify-between">
              <span className={`material-symbols-outlined text-lg ${k.color}`}>{k.icon}</span>
            </div>
            <p className="font-mono text-3xl font-bold text-on-surface mt-2 group-hover:text-primary transition-colors">{k.value}</p>
            <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/50 mt-1">{k.label}</p>
          </Link>
        ))}
      </div>

      {/* Hours + Bottlenecks row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours card */}
        <div className="brutalist-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">HOURS_LOGGED</h3>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="font-mono text-5xl font-bold text-on-surface">{weeklyHours}</p>
              <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/40 mt-1">THIS WEEK</p>
            </div>
            {change && (
              <div className={`text-sm font-mono mb-1 ${change.diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change.diff >= 0 ? "▲" : "▼"} {Math.abs(change.pct)}%
                <p className="text-[8px] text-on-surface/30 uppercase">vs last week ({lastWeekHours}h)</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottleneck alerts */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-amber-400">warning</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">BOTTLENECKS</h3>
            <span className="ml-auto font-mono text-[9px] text-on-surface/40">STUCK &gt; 48h</span>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-48 overflow-y-auto">
            {bottlenecks.length === 0 ? (
              <p className="px-4 py-6 font-mono text-[9px] text-on-surface/30 text-center uppercase">
                No bottlenecks — all clear ✓
              </p>
            ) : (
              bottlenecks.slice(0, 6).map((t) => (
                <div key={t.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="font-mono text-[8px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 flex-shrink-0 uppercase">
                    {t.status.replace("_", " ")}
                  </span>
                  <div className="min-w-0">
                    <p className="font-headline text-[9px] uppercase tracking-wider text-card-text truncate">{t.title}</p>
                    <p className="font-mono text-[8px] text-on-surface/40 truncate">
                      {t.project.title} · {t.assignedTo?.name ?? "Unassigned"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="brutalist-border bg-card overflow-hidden">
        <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">history</span>
          <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">RECENT_ACTIVITY</h3>
        </div>
        <div className="divide-y divide-outline-variant/20 max-h-64 overflow-y-auto">
          {recentActivities.slice(0, 15).map((a) => (
            <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="flex h-5 w-5 items-center justify-center bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                <span className="font-headline text-[8px] uppercase">{a.user.name.charAt(0)}</span>
              </div>
              <p className="font-mono text-[9px] text-on-surface/70 flex-1">
                <span className="text-on-surface">{a.user.name}</span>
                {" "}{ACTION_LABELS[a.action] ?? a.action.toLowerCase()}
                {a.task && <span className="text-primary"> {a.task.title}</span>}
              </p>
              <span className="font-mono text-[8px] text-on-surface/30 flex-shrink-0" suppressHydrationWarning>{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
