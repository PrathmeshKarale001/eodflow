"use client";

import Link from "next/link";

function formatMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function daysUntil(date: Date) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

const STATUS_COLOR: Record<string, string> = {
  BACKLOG: "bg-gray-500/20 text-gray-400",
  TODO: "bg-blue-500/20 text-blue-400",
  IN_PROGRESS: "bg-amber-500/20 text-amber-400",
  IN_REVIEW: "bg-purple-500/20 text-purple-400",
  REVISION: "bg-orange-500/20 text-orange-400",
  CLIENT_APPROVAL: "bg-cyan-500/20 text-cyan-400",
  DONE: "bg-green-500/20 text-green-400",
  APPROVED: "bg-emerald-500/20 text-emerald-400",
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  HIGH: "bg-amber-500",
  MEDIUM: "bg-blue-500",
  LOW: "bg-gray-400",
};

interface MyTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: { title: string };
}

interface Props {
  myName: string;
  myTasks: MyTask[];
  todayHours: number;
  weekHours: number;
  weekTarget: number;
  recentComments: Array<{
    id: string;
    content: string;
    createdAt: Date;
    user: { name: string };
    task: { title: string };
  }>;
}

export function EmployeeDashboard({ myName, myTasks, todayHours, weekHours, weekTarget, recentComments }: Props) {
  const inProgress = myTasks.filter((t) => t.status === "IN_PROGRESS");
  const upcomingThisWeek = myTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) <= 7 && daysUntil(t.dueDate) >= 0);
  const overdue = myTasks.filter((t) => t.dueDate && daysUntil(t.dueDate) < 0 && !["DONE", "APPROVED"].includes(t.status));

  const weekPct = Math.min(Math.round((weekHours / weekTarget) * 100), 100);

  // Status breakdown for mini chart
  const statusGroups: Record<string, number> = {};
  for (const t of myTasks) {
    statusGroups[t.status] = (statusGroups[t.status] || 0) + 1;
  }

  return (
    <div className="space-y-6">
      {/* Greeting + KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MY_TASKS", value: myTasks.length, icon: "task_alt", color: "border-t-blue-500", href: "/tasks" },
          { label: "IN_PROGRESS", value: inProgress.length, icon: "pending", color: "border-t-amber-500", href: "/tasks" },
          { label: "OVERDUE", value: overdue.length, icon: "warning", color: "border-t-red-500", href: "/tasks" },
          { label: "DUE_THIS_WEEK", value: upcomingThisWeek.length, icon: "event_upcoming", color: "border-t-purple-500", href: "/calendar" },
        ].map((k) => (
          <Link key={k.label} href={k.href} className={`brutalist-border bg-card p-4 border-t-4 ${k.color} hover:bg-card/80 transition-colors group block`}>
            <span className="material-symbols-outlined text-lg text-on-surface/40">{k.icon}</span>
            <p className="font-mono text-3xl font-bold text-on-surface mt-2 group-hover:text-primary transition-colors">{k.value}</p>
            <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/50 mt-1">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hours card */}
        <div className="brutalist-border bg-card p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-sm text-primary">schedule</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">MY_HOURS</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="font-mono text-4xl font-bold text-on-surface">{formatMins(weekHours * 60)}</p>
              <p className="font-label text-[8px] uppercase tracking-widest text-on-surface/40 mt-1">THIS WEEK</p>
            </div>
            {/* Progress bar */}
            <div>
              <div className="flex justify-between font-mono text-[8px] text-on-surface/40 mb-1">
                <span>{weekPct}% of {weekTarget}h target</span>
                <span>{formatMins(todayHours * 60)} today</span>
              </div>
              <div className="h-2 bg-card-muted w-full">
                <div
                  className={`h-full transition-all ${weekPct >= 100 ? "bg-green-500" : weekPct >= 60 ? "bg-primary" : "bg-amber-500"}`}
                  style={{ width: `${weekPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* My Tasks */}
        <div className="brutalist-border bg-card overflow-hidden lg:col-span-2">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">checklist</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">MY_TASKS</h3>
            <span className="ml-auto font-mono text-[9px] text-on-surface/40">{myTasks.length} TOTAL</span>
          </div>
          <div className="divide-y divide-outline-variant/20 max-h-64 overflow-y-auto">
            {myTasks.length === 0 ? (
              <p className="px-4 py-8 font-mono text-[9px] text-on-surface/30 text-center uppercase">No tasks assigned 🎉</p>
            ) : (
              myTasks.slice(0, 12).map((t) => {
                const days = t.dueDate ? daysUntil(t.dueDate) : null;
                return (
                  <Link key={t.id} href="/tasks" className="px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors group block">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority] ?? "bg-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-headline text-[9px] uppercase tracking-wider text-card-text truncate group-hover:text-primary transition-colors">{t.title}</p>
                      <p className="font-mono text-[8px] text-on-surface/40 truncate">{t.project.title}</p>
                    </div>
                    <span className={`font-mono text-[8px] px-1.5 py-0.5 ${STATUS_COLOR[t.status] ?? ""}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                    {days !== null && (
                      <span className={`font-mono text-[8px] w-10 text-right flex-shrink-0 ${days < 0 ? "text-red-400 font-bold" : days <= 2 ? "text-amber-400" : "text-on-surface/30"}`}>
                        {days < 0 ? `+${Math.abs(days)}d` : days === 0 ? "today" : `${days}d`}
                      </span>
                    )}
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Recent mentions / comments */}
      {recentComments.length > 0 && (
        <div className="brutalist-border bg-card overflow-hidden">
          <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
            <span className="material-symbols-outlined text-sm text-primary">chat_bubble</span>
            <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">RECENT_COMMENTS_ON_MY_TASKS</h3>
          </div>
          <div className="divide-y divide-outline-variant/20">
            {recentComments.slice(0, 5).map((c) => (
              <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center bg-primary/10 text-primary flex-shrink-0 text-[8px] font-headline">
                  {c.user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-[9px] text-on-surface/70">
                    <span className="text-on-surface">{c.user.name}</span> on <span className="text-primary">{c.task.title}</span>
                  </p>
                  <p className="font-mono text-[9px] text-on-surface/50 truncate mt-0.5">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
