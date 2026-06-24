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
  productivitySnapshot: {
    completedToday: number;
    avgCompletionHours: number;
    revisionRate: number;
    topPerformers: Array<{ name: string; count: number }>;
    blockedTasks: Array<{
      id: string;
      title: string;
      status: string;
      assignedTo: { name: string } | null;
      project: { title: string } | null;
      updatedAt: Date;
    }>;
  };
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
  productivitySnapshot,
  recentActivities,
}: Props) {
  const change = hoursChange(weeklyHours, lastWeekHours);

  const kpis = [
    { label: "Active Projects", value: activeProjects, icon: "folder_open", color: "text-blue-400", border: "border-t-blue-500", href: "/projects" },
    { label: "Clients", value: totalClients, icon: "business", color: "text-purple-400", border: "border-t-purple-500", href: "/clients" },
    { label: "Team Size", value: totalTeam, icon: "group", color: "text-green-400", border: "border-t-green-500", href: "/settings" },
    { label: "Overdue", value: overdueTasks, icon: "warning", color: "text-red-400", border: "border-t-red-500", href: "/tasks" },
    { label: "In Review", value: tasksInReview, icon: "rate_review", color: "text-amber-400", border: "border-t-amber-500", href: "/tasks" },
    { label: "Done This Week", value: completedThisWeek, icon: "check_circle", color: "text-emerald-400", border: "border-t-emerald-500", href: "/reports" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className={`brutalist-border bg-card p-4 border-t-4 ${k.border} card-hover-lift group block`}>
            <div className="flex items-start justify-between">
              <span className={`material-symbols-outlined text-lg ${k.color}`}>{k.icon}</span>
            </div>
            <p className="font-mono text-3xl font-bold text-on-surface mt-2 group-hover:text-primary transition-colors">{k.value}</p>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface/50 mt-1">{k.label.replaceAll('_', ' ')}</p>
          </Link>
        ))}
      </div>

      {/* Hours + Bottlenecks row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hours card */}
        <div className="brutalist-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <h3 className="font-headline text-[12px] uppercase tracking-widest text-card-text">Hours Logged</h3>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="font-mono text-5xl font-bold text-on-surface">{weeklyHours}</p>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface/40 mt-1">THIS WEEK</p>
            </div>
            {change && (
              <div className={`text-sm font-mono mb-1 ${change.diff >= 0 ? "text-green-400" : "text-red-400"}`}>
                {change.diff >= 0 ? "▲" : "▼"} {Math.abs(change.pct)}%
                <p className="text-[10px] text-on-surface/30 uppercase">vs last week ({lastWeekHours}h)</p>
              </div>
            )}
          </div>
        </div>

        {/* Team Productivity Snapshot */}
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">insights</span>
            <h3 className="font-headline text-[12px] uppercase tracking-widest text-card-text">Team Productivity</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <div className="brutalist-border bg-surface-container-lowest p-3 text-center">
                <p className="font-mono text-2xl font-bold text-green-400">{productivitySnapshot.completedToday}</p>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/40 mt-1">Done Today</p>
              </div>
              <div className="brutalist-border bg-surface-container-lowest p-3 text-center">
                <p className={`font-mono text-2xl font-bold ${productivitySnapshot.avgCompletionHours <= 24 ? "text-green-400" : productivitySnapshot.avgCompletionHours <= 48 ? "text-amber-400" : "text-red-400"}`}>
                  {productivitySnapshot.avgCompletionHours > 0 ? `${productivitySnapshot.avgCompletionHours}h` : "—"}
                </p>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/40 mt-1">Avg Time to Complete</p>
              </div>
              <div className="brutalist-border bg-surface-container-lowest p-3 text-center">
                <p className={`font-mono text-2xl font-bold ${productivitySnapshot.revisionRate <= 15 ? "text-green-400" : productivitySnapshot.revisionRate <= 30 ? "text-amber-400" : "text-red-400"}`}>
                  {productivitySnapshot.revisionRate}%
                </p>
                <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/40 mt-1">Revision Rate</p>
              </div>
            </div>

            {/* Top Performers This Week */}
            {productivitySnapshot.topPerformers.length > 0 && (
              <div>
                <p className="font-headline text-[10px] uppercase tracking-widest text-on-surface/40 mb-2">Top Performers This Week</p>
                <div className="space-y-1.5">
                  {productivitySnapshot.topPerformers.map((p, idx) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <span className={`w-5 h-5 flex items-center justify-center text-[10px] font-headline font-bold ${idx === 0 ? "bg-primary/20 text-primary" : "bg-surface-container-high text-on-surface/40"}`}>
                        {idx + 1}
                      </span>
                      <span className="font-headline text-[11px] uppercase tracking-wider text-card-text flex-1">{p.name}</span>
                      <span className="font-mono text-[11px] text-green-400 font-bold">{p.count} done</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blocked Tasks (tasks stuck in review > 24h) */}
            {productivitySnapshot.blockedTasks.length > 0 && (
              <div>
                <p className="font-headline text-[10px] uppercase tracking-widest text-amber-400 mb-2">Needs Attention</p>
                <div className="space-y-1">
                  {productivitySnapshot.blockedTasks.slice(0, 4).map((t) => (
                    <div key={t.id} className="flex items-center gap-2 py-1">
                      <span className="font-mono text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 flex-shrink-0 uppercase">
                        {t.status.replace(/_/g, " ")}
                      </span>
                      <span className="font-headline text-[11px] uppercase tracking-wider text-card-text truncate flex-1">{t.title}</span>
                      <span className="font-mono text-[10px] text-on-surface/30 flex-shrink-0">{t.assignedTo?.name ?? "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity feed */}
      <div className="brutalist-border bg-card overflow-hidden">
        <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">history</span>
          <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">Recent Activity</h3>
        </div>
        <div className="divide-y divide-outline-variant/20 max-h-64 overflow-y-auto">
          {recentActivities.slice(0, 15).map((a) => (
            <div key={a.id} className="px-4 py-2.5 flex items-start gap-3">
              <div className="flex h-5 w-5 items-center justify-center bg-primary/10 text-primary flex-shrink-0 mt-0.5">
                <span className="font-headline text-[10px] uppercase">{a.user.name.charAt(0)}</span>
              </div>
              <p className="font-mono text-[11px] text-on-surface/70 flex-1">
                <span className="text-on-surface">{a.user.name}</span>
                {" "}{ACTION_LABELS[a.action] ?? a.action.toLowerCase()}
                {a.task && <span className="text-primary"> {a.task.title}</span>}
              </p>
              <span className="font-mono text-[10px] text-on-surface/30 flex-shrink-0" suppressHydrationWarning>{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
