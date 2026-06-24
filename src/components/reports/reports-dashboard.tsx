"use client";

import { useState } from "react";
import Link from "next/link";
import { fetchActivitiesAction } from "@/app/actions/reports";

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
  userRole: string;
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
  managementTasksReport: any[];
  teamPerformanceReport: any[];
  taskActivityMap?: Record<string, Array<{
    action: string;
    metadata: any;
    createdAt: Date;
    userName: string;
    userRole: string;
  }>>;
}

const ACTION_ICONS: Record<string, string> = {
  CREATED: "add_circle",
  UPDATED: "edit",
  DELETED: "Delete",
  ASSIGNED: "person_add",
  STATUS_CHANGED: "swap_horiz",
  COMMENTED: "comment",
  FILE_UPLOADED: "Upload File",
  APPROVED: "check_circle",
  REJECTED: "Cancel",
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
  userRole,
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
  managementTasksReport,
  teamPerformanceReport,
  taskActivityMap = {},
}: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "TEAM_AUDIT" | "TASK_AUDIT">("DASHBOARD");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "ONGOING" | "OVERDUE" | "REVISIONS">("ALL");
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set());
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personTaskFilter, setPersonTaskFilter] = useState<"ALL" | "DONE" | "PENDING" | "REVISIONS" | "OVERDUE">("ALL");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [activitiesList, setActivitiesList] = useState<Activity[]>(recentActivity);
  const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
  const [hasMoreActivities, setHasMoreActivities] = useState(recentActivity.length >= 20);

  const handleLoadMoreActivities = async () => {
    setIsLoadingMoreActivities(true);
    try {
      const nextBatch = await fetchActivitiesAction(activitiesList.length);
      if (nextBatch.length === 0) {
        setHasMoreActivities(false);
      } else {
        setActivitiesList((prev) => [...prev, ...nextBatch]);
        if (nextBatch.length < 20) {
          setHasMoreActivities(false);
        }
      }
    } catch (err) {
      console.error("Failed to load more activities", err);
    } finally {
      setIsLoadingMoreActivities(false);
    }
  };

  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportProjectProgress = () => {
    const headers = ["Project ID", "Title", "Status", "Client Name", "Deadline", "Task Count", "Completed Tasks", "Progress %"];
    const rows = projectProgress.map(p => [
      p.id,
      p.title,
      p.status,
      p.clientName,
      p.deadline ? new Date(p.deadline).toISOString() : "None",
      String(p.taskCount),
      String(p.completedCount),
      `${p.progress}%`
    ]);
    downloadCSV("project_progress_report.csv", headers, rows);
  };

  const exportTeamPerformance = () => {
    const headers = ["User ID", "Name", "Role", "Department", "Total Tasks", "Completed This Month"];
    const rows = teamPerformance.map(m => [
      m.id,
      m.name,
      m.role,
      m.department || "None",
      String(m.totalTasks),
      String(m.completedThisMonth)
    ]);
    downloadCSV("team_performance_report.csv", headers, rows);
  };

  const exportActivityLog = () => {
    const headers = ["Activity ID", "Action", "User Name", "Task Title", "Project Title", "Created At"];
    const rows = activitiesList.map(a => [
      a.id,
      a.action,
      a.userName,
      a.taskTitle || "None",
      a.projectTitle || "None",
      new Date(a.createdAt).toISOString()
    ]);
    downloadCSV("recent_activity_report.csv", headers, rows);
  };

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* ── Tab Navigation (Visible to Director/SUPER_ADMIN only) ── */}
      {userRole === "SUPER_ADMIN" && (
        <div className="flex border brutalist-border bg-card p-1">
          <button
            onClick={() => setActiveTab("DASHBOARD")}
            className={`flex-1 py-3 font-headline text-xs uppercase tracking-wider transition-all duration-200 border-r brutalist-border last:border-0 ${
              activeTab === "DASHBOARD"
                ? "bg-primary text-white"
                : "text-on-surface/60 hover:bg-surface-container-high hover:text-card-text"
            }`}
          >
            GENERAL DASHBOARD
          </button>
          <button
            onClick={() => setActiveTab("TEAM_AUDIT")}
            className={`flex-1 py-3 font-headline text-xs uppercase tracking-wider transition-all duration-200 border-r brutalist-border last:border-0 ${
              activeTab === "TEAM_AUDIT"
                ? "bg-primary text-white"
                : "text-on-surface/60 hover:bg-surface-container-high hover:text-card-text"
            }`}
          >
            EXECUTIVE TEAM PERFORMANCE
          </button>
          <button
            onClick={() => setActiveTab("TASK_AUDIT")}
            className={`flex-1 py-3 font-headline text-xs uppercase tracking-wider transition-all duration-200 ${
              activeTab === "TASK_AUDIT"
                ? "bg-primary text-white"
                : "text-on-surface/60 hover:bg-surface-container-high hover:text-card-text"
            }`}
          >
            QUALITY & DELAY TASK AUDIT
          </button>
        </div>
      )}

      {/* ── View 1: General Dashboard ── */}
      {activeTab === "DASHBOARD" && (
        <>
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              aside, nav, header, button, .no-print, [role="navigation"], .data-actions-toolbar {
                display: none !important;
              }
              main, .print-full-width {
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                box-shadow: none !important;
              }
              .brutalist-border {
                border: 1px solid black !important;
                box-shadow: none !important;
              }
              body {
                background: white !important;
                color: black !important;
              }
            }
          `}} />

          {/* Data Actions Toolbar */}
          <div className="flex flex-wrap gap-2 brutalist-border bg-card p-3 items-center justify-between shadow-lg data-actions-toolbar mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-on-surface/50">download</span>
              <span className="font-mono text-xs uppercase tracking-wider text-on-surface/70">Data Actions:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={exportProjectProgress}
                className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider bg-surface hover:bg-surface-container-high border brutalist-border shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Export Projects CSV
              </button>
              <button
                onClick={exportTeamPerformance}
                className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider bg-surface hover:bg-surface-container-high border brutalist-border shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Export Team CSV
              </button>
              <button
                onClick={exportActivityLog}
                className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider bg-surface hover:bg-surface-container-high border brutalist-border shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Export Activities CSV
              </button>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider bg-primary text-white border brutalist-border hover:bg-primary/90 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              >
                Print PDF / Save
              </button>
            </div>
          </div>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <KPICard label="Completion" value={`${completionRate}%`} sub={`${completedTasks}/${totalTasks} tasks`} icon="donut_large" accent={completionRate >= 70 ? "text-green-400" : completionRate >= 40 ? "text-amber-400" : "text-red-400"} />
            <KPICard label="Overdue" value={String(overdueTasks)} sub="past deadline" icon="warning" accent={overdueTasks > 0 ? "text-red-500" : "text-green-400"} />
            <KPICard label="In Progress" value={String(taskStatusCounts["IN_PROGRESS"] || 0)} sub="actively working" icon="pending_actions" accent="text-amber-400" />
            <KPICard label="This Week" value={String(weeklyCompletions)} sub="completed" icon="event_available" accent="text-blue-400" />
            <KPICard label="Hours Logged" value={totalHoursThisWeek.toFixed(1)} sub="this week" icon="schedule" accent="text-purple-400" />
          </div>

          {/* Task Pipeline */}
          <div className="brutalist-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">TASK PIPELINE</h3>
              <span className="font-mono text-[11px] text-on-surface/40 uppercase">{totalTasks} total</span>
            </div>
            {totalTasks > 0 && (
              <div className="h-7 brutalist-border flex overflow-hidden mb-4">
                {Object.entries(taskStatusCounts)
                  .sort(([a], [b]) => {
                    const order = ["TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION", "CLIENT_APPROVAL", "CLIENT_REVISION", "DONE", "APPROVED", "BACKLOG"];
                    return order.indexOf(a) - order.indexOf(b);
                  })
                  .map(([status, count]) => {
                    const pct = (count / totalTasks) * 100;
                    if (pct < 1) return null;
                    return (
                      <div key={status} className={`${TASK_STATUS_COLORS[status] || "bg-neutral-500"} h-full transition-all relative group cursor-default`} style={{ width: `${pct}%` }} title={`${status}: ${count}`}>
                        {pct > 6 && <span className="absolute inset-0 flex items-center justify-center font-mono text-[10px] text-white/90 font-bold">{count}</span>}
                      </div>
                    );
                  })}
              </div>
            )}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-x-4 gap-y-2">
              {Object.entries(taskStatusCounts)
                .sort(([a], [b]) => {
                  const order = ["TODO", "IN_PROGRESS", "IN_REVIEW", "REVISION", "CLIENT_APPROVAL", "CLIENT_REVISION", "DONE", "APPROVED", "BACKLOG"];
                  return order.indexOf(a) - order.indexOf(b);
                })
                .map(([status, count]) => (
                <div key={status} className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 flex-shrink-0 ${TASK_STATUS_COLORS[status] || "bg-neutral-500"}`} />
                  <div className="min-w-0">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface/50 block truncate">{status.replace(/_/g, " ")}</span>
                    <span className="font-mono text-[10px] text-card-text font-bold">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Health */}
            <div className="brutalist-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">PROJECT HEALTH</h3>
                <span className="font-mono text-[11px] text-on-surface/40 uppercase">{projectProgress.length} active</span>
              </div>
              <div className="space-y-3">
                {projectProgress.length === 0 ? (
                  <p className="font-mono text-[11px] uppercase text-on-surface/30 tracking-widest text-center py-8">NO ACTIVE PROJECTS</p>
                ) : (
                  projectProgress.map((p) => {
                    const isOverdue = p.deadline && new Date(p.deadline) < new Date() && p.status !== "COMPLETED";
                    const daysLeft = p.deadline ? Math.ceil((new Date(p.deadline).getTime() - new Date().getTime()) / 864e5) : null;
                    const isAtRisk = !isOverdue && daysLeft !== null && daysLeft < 7 && p.progress < 80;
                    const barColor = isOverdue ? "bg-red-500" : isAtRisk ? "bg-amber-400" : "bg-primary";
                    return (
                      <Link key={p.id} href={`/projects/${p.id}`} className="block group">
                        <div className="flex items-start justify-between mb-1.5 gap-2">
                          <div className="min-w-0 flex-1">
                            <span className="font-headline text-[11px] uppercase tracking-wider text-card-text group-hover:text-primary transition-colors truncate block">{p.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="font-mono text-[10px] text-on-surface/30 uppercase">{p.clientName}</span>
                              {p.deadline && <span className="font-mono text-[10px] text-on-surface/30">· {new Date(p.deadline).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}</span>}
                              {isOverdue && <span className="font-mono text-[11px] px-1.5 py-0.5 bg-red-500/15 text-red-400 font-bold">OVERDUE</span>}
                              {isAtRisk && <span className="font-mono text-[11px] px-1.5 py-0.5 bg-amber-500/15 text-amber-400 font-bold">AT RISK</span>}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className="font-headline text-sm text-primary">{p.progress}%</span>
                            <span className="font-mono text-[10px] text-on-surface/30 block">{p.completedCount}/{p.taskCount}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-surface-container-high overflow-hidden rounded-sm">
                          <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${p.progress}%` }} />
                        </div>
                      </Link>
                    );
                  })
                )}
              </div>
            </div>

            {/* Team Leaderboard */}
            <div className="brutalist-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">TEAM LEADERBOARD</h3>
                <span className="font-mono text-[11px] text-on-surface/40 uppercase">This Month</span>
              </div>
              <div className="space-y-1">
                {teamPerformance.length === 0 ? (
                  <p className="font-mono text-[11px] uppercase text-on-surface/30 tracking-widest text-center py-8">NO TEAM DATA</p>
                ) : (
                  teamPerformance
                    .sort((a, b) => b.completedThisMonth - a.completedThisMonth)
                    .slice(0, 10)
                    .map((m, idx) => {
                      const ratio = m.totalTasks > 0 ? Math.round((m.completedThisMonth / m.totalTasks) * 100) : 0;
                      return (
                        <div key={m.id} className="flex items-center gap-3 py-2 hover:bg-surface-container-lowest/50 transition-colors px-1 -mx-1">
                          <span className={`w-5 h-5 flex items-center justify-center font-headline text-[11px] font-bold flex-shrink-0 ${idx < 3 ? "bg-primary/20 text-primary" : "bg-surface-container-high text-on-surface/40"}`}>{idx + 1}</span>
                          <div className="h-7 w-7 flex items-center justify-center bg-surface-container-high text-[10px] font-headline font-bold uppercase flex-shrink-0">{m.name.charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between">
                              <span className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">{m.name}</span>
                              <span className="font-mono text-[10px] text-on-surface/30 ml-2 flex-shrink-0">{m.department || "—"}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <div className="flex-1 h-1 bg-surface-container-high overflow-hidden rounded-sm">
                                <div className="h-full bg-green-500/70 transition-all duration-500" style={{ width: `${ratio}%` }} />
                              </div>
                              <span className="font-mono text-[10px] text-green-400 font-bold flex-shrink-0">{m.completedThisMonth}</span>
                              <span className="font-mono text-[10px] text-on-surface/25 flex-shrink-0">/ {m.totalTasks}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>

          {/* Monthly Stats + Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Status */}
            <div className="brutalist-border bg-card p-5">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">PROJECT STATUS</h3>
              <div className="space-y-2">
                {Object.entries(projectStatusCounts).map(([status, count]) => {
                  const colors: Record<string, string> = { ACTIVE: "text-green-400", DRAFT: "text-blue-400", COMPLETED: "text-purple-400", ARCHIVED: "text-on-surface/30", ON_HOLD: "text-amber-400" };
                  return (
                    <div key={status} className="flex items-center justify-between py-1.5">
                      <span className="font-mono text-[11px] uppercase tracking-widest text-on-surface/50">{status.replace(/_/g, " ")}</span>
                      <span className={`font-headline text-lg ${colors[status] || "text-card-text"}`}>{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Velocity */}
            <div className="brutalist-border bg-card p-5">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">MONTHLY VELOCITY</h3>
              <div className="space-y-4">
                <div className="text-center py-3">
                  <span className="font-headline text-5xl text-primary">{monthlyCompletions}</span>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface/40 mt-1">Tasks This Month</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="brutalist-border bg-surface-container-lowest p-3 text-center">
                    <span className="font-headline text-lg text-card-text block">{(monthlyCompletions / 4).toFixed(1)}</span>
                    <span className="font-mono text-[10px] text-on-surface/40 uppercase">Weekly Avg</span>
                  </div>
                  <div className="brutalist-border bg-surface-container-lowest p-3 text-center">
                    <span className="font-headline text-lg text-card-text block">{weeklyCompletions}</span>
                    <span className="font-mono text-[10px] text-on-surface/40 uppercase">This Week</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent activity feed */}
            <div className="brutalist-border bg-card p-5">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text mb-4">
                Recent Activity
              </h3>
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {activitiesList.length === 0 ? (
                  <p className="font-mono text-[11px] uppercase text-on-surface/30 tracking-widest text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  activitiesList.map((a) => (
                    <div key={a.id} className="flex items-start gap-2 py-1.5 border-b border-on-surface/5 last:border-0">
                      <span className="material-symbols-outlined text-xs text-primary flex-shrink-0 mt-0.5">
                        {ACTION_ICONS[a.action] || "radio_button_unchecked"}
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[11px] text-on-surface/70 leading-tight">
                          <span className="font-bold text-card-text">{a.userName}</span>
                          {" "}
                          <span className="lowercase">{a.action.replace(/_/g, " ")}</span>
                          {a.taskTitle && (
                            <span className="text-primary"> {a.taskTitle}</span>
                          )}
                        </p>
                        <p className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest mt-0.5">
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
                {hasMoreActivities && (
                  <button
                    onClick={handleLoadMoreActivities}
                    disabled={isLoadingMoreActivities}
                    className="w-full text-center py-1.5 font-mono text-[11px] uppercase tracking-wider border brutalist-border bg-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5 mt-2"
                  >
                    {isLoadingMoreActivities ? "LOADING..." : "LOAD MORE ACTIVITIES"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── View 2: Executive Team Performance (Enhanced) ── */}
      {activeTab === "TEAM_AUDIT" && (() => {
        const employees = teamPerformanceReport.filter((u: any) => u.type === "employee");
        const managers = teamPerformanceReport.filter((u: any) => u.type === "manager");
        const avgProperlyRate = employees.length > 0 ? Math.round(employees.reduce((s: number, e: any) => s + e.doneProperlyRate, 0) / employees.length) : 100;
        const avgOverdueRate = employees.length > 0 ? Math.round(employees.reduce((s: number, e: any) => s + e.overdueRate, 0) / employees.length) : 0;
        const totalCompleted = employees.reduce((s: number, e: any) => s + e.completedCount, 0);
        const totalOngoing = employees.reduce((s: number, e: any) => s + e.ongoingCount, 0);

        const selectedPerson = teamPerformanceReport.find((u: any) => u.id === selectedPersonId) || null;

        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

        const PRIORITY_CHIP: Record<string, string> = {
          URGENT: "bg-red-600 text-white",
          HIGH: "bg-orange-500 text-white",
          MEDIUM: "bg-blue-500/80 text-white",
          LOW: "bg-neutral-400 text-white",
        };

        const togglePerson = (id: string) => {
          if (selectedPersonId === id) {
            setSelectedPersonId(null);
            setPersonTaskFilter("ALL");
          } else {
            setSelectedPersonId(id);
            setPersonTaskFilter("ALL");
          }
        };

        // Filter tasks for the selected person
        const getFilteredTasks = (tasks: any[]) => {
          if (!tasks) return [];
          return tasks.filter((t: any) => {
            if (personTaskFilter === "DONE") return t.status === "DONE" || t.status === "APPROVED";
            if (personTaskFilter === "PENDING") return t.status !== "DONE" && t.status !== "APPROVED";
            if (personTaskFilter === "REVISIONS") return t.revisionCount > 0;
            if (personTaskFilter === "OVERDUE") return t.isOverdue;
            return true;
          });
        };

        // Render the person detail panel
        const renderPersonPanel = (person: any, isManager = false) => {
          const tasks = person.tasks || [];
          const createdTasks = person.createdTasksList || [];
          const allTasks = isManager ? [...tasks, ...createdTasks] : tasks;

          const totalAssigned = tasks.length;
          const doneCount = tasks.filter((t: any) => t.status === "DONE" || t.status === "APPROVED").length;
          const pendingCount = tasks.filter((t: any) => t.status !== "DONE" && t.status !== "APPROVED").length;
          const revisionCount = tasks.filter((t: any) => t.revisionCount > 0).length;
          const overdueCount = tasks.filter((t: any) => t.isOverdue).length;
          const createdCount = createdTasks.length;

          const filteredTasks = getFilteredTasks(personTaskFilter === "ALL" && isManager ? allTasks : tasks);

          const statChips = [
            { label: "ASSIGNED", value: totalAssigned, color: "bg-blue-500/15 text-blue-400", icon: "assignment" },
            { label: "COMPLETED", value: doneCount, color: "bg-green-500/15 text-green-400", icon: "check_circle" },
            { label: "PENDING", value: pendingCount, color: "bg-amber-500/15 text-amber-400", icon: "pending" },
            { label: "REVISIONS", value: revisionCount, color: "bg-orange-500/15 text-orange-400", icon: "replay" },
            { label: "OVERDUE", value: overdueCount, color: overdueCount > 0 ? "bg-red-500/15 text-red-400" : "bg-green-500/15 text-green-400", icon: overdueCount > 0 ? "warning" : "check" },
            ...(isManager ? [{ label: "CREATED_BY_THEM", value: createdCount, color: "bg-purple-500/15 text-purple-400", icon: "Add Task" }] : []),
          ];

          return (
            <div className="animate-in slide-in-from-top-2 duration-300 border-t-2 border-primary/30">
              {/* Summary Stat Chips */}
              <div className="p-4 bg-surface-container-lowest">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 flex items-center justify-center bg-primary text-on-primary font-headline text-sm font-bold uppercase">
                      {person.name.charAt(0)}
                    </div>
                    <div>
                      <span className="font-headline text-sm uppercase tracking-wider text-card-text block">{person.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40">
                        {person.department || person.role?.replace("_", " ") || "—"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPersonId(null)}
                    className="p-1 hover:bg-surface-container-high transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm text-on-surface/40">Close</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {statChips.map((chip) => (
                    <div key={chip.label} className={`${chip.color} px-3 py-2 text-center`}>
                      <span className="material-symbols-outlined text-sm block mb-0.5">{chip.icon}</span>
                      <span className="font-headline text-lg block">{chip.value}</span>
                      <span className="font-mono text-[11px] uppercase tracking-widest block">{chip.label.replace(/_/g, " ")}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1 px-4 py-2 bg-surface-container-low border-y border-on-surface/5">
                {(["ALL", "DONE", "PENDING", "REVISIONS", "OVERDUE"] as const).map((f) => {
                  const counts: Record<string, number> = {
                    ALL: isManager ? allTasks.length : tasks.length,
                    DONE: doneCount,
                    PENDING: pendingCount,
                    REVISIONS: revisionCount,
                    OVERDUE: overdueCount,
                  };
                  return (
                    <button
                      key={f}
                      onClick={() => setPersonTaskFilter(f)}
                      className={`px-3 py-1 font-mono text-[10px] uppercase tracking-wider transition-all duration-150 border brutalist-border ${
                        personTaskFilter === f
                          ? "bg-primary text-white"
                          : "bg-card text-on-surface/60 hover:bg-surface-container-high"
                      }`}
                    >
                      {f} ({counts[f]})
                    </button>
                  );
                })}
              </div>

              {/* Task List */}
              {filteredTasks.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <span className="material-symbols-outlined text-2xl text-on-surface/20 block mb-2">search_off</span>
                  <p className="font-mono text-[11px] uppercase tracking-widest text-on-surface/30">NO TASKS MATCH THIS FILTER</p>
                </div>
              ) : (
                <>
                  {/* Desktop Task Table */}
                  <div className="hidden md:block overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left font-mono text-[10px] border-collapse">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-surface-container-low border-b border-on-surface/10 uppercase text-on-surface/40 text-[10px]">
                          <th className="px-3 py-2 font-headline">Task</th>
                          <th className="px-3 py-2 font-headline">Project</th>
                          <th className="px-3 py-2 font-headline text-center">Status</th>
                          <th className="px-3 py-2 font-headline text-center">Priority</th>
                          <th className="px-3 py-2 font-headline">{isManager ? "Assignee" : "Assigned By"}</th>
                          <th className="px-3 py-2 font-headline text-center">Created</th>
                          <th className="px-3 py-2 font-headline text-center">Started</th>
                          <th className="px-3 py-2 font-headline text-center">Due</th>
                          <th className="px-3 py-2 font-headline text-center">Completed</th>
                          <th className="px-3 py-2 font-headline text-center">Rev</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-on-surface/5">
                        {filteredTasks.map((t: any) => {
                          const isDone = t.status === "DONE" || t.status === "APPROVED";
                          const isTaskSelected = selectedTaskId === t.id;
                          return (
                            <tr key={t.id} className="group" style={{ verticalAlign: "top" }}>
                              <td colSpan={10} className="p-0">
                                <div
                                  onClick={() => setSelectedTaskId(isTaskSelected ? null : t.id)}
                                  className={`flex items-center cursor-pointer transition-all duration-150 px-0 py-2.5 ${
                                    isTaskSelected
                                      ? "bg-primary/5"
                                      : `hover:bg-surface-container-lowest/50 ${isDone ? "opacity-60" : ""}`
                                  }`}
                                >
                                  <span className={`material-symbols-outlined text-[10px] text-on-surface/25 ml-1 mr-1 transition-transform duration-200 ${isTaskSelected ? "rotate-90" : ""}`}>chevron_right</span>
                                  <span className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate flex-1 min-w-0 px-1" style={{ maxWidth: 180 }}>{t.title}</span>
                                  <span className="text-on-surface/50 uppercase truncate px-2" style={{ maxWidth: 110 }}>{t.projectTitle}</span>
                                  <span className="px-2 text-center" style={{ minWidth: 80 }}>
                                    <span className={`inline-block px-2 py-0.5 text-[11px] uppercase tracking-widest text-white font-bold ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>
                                      {t.status.replace(/_/g, " ")}
                                    </span>
                                  </span>
                                  <span className="px-2 text-center" style={{ minWidth: 60 }}>
                                    <span className={`inline-block px-1.5 py-0.5 text-[11px] uppercase font-bold ${PRIORITY_CHIP[t.priority] || "bg-neutral-400 text-white"}`}>
                                      {t.priority}
                                    </span>
                                  </span>
                                  <span className="px-2 text-on-surface/50 uppercase" style={{ minWidth: 85 }}>
                                    {isManager && t.assigneeName ? t.assigneeName : (t.assignerName || "—")}
                                  </span>
                                  <span className="px-2 text-center text-on-surface/60" style={{ minWidth: 55 }}>{fmtDate(t.createdAt)}</span>
                                  <span className="px-2 text-center" style={{ minWidth: 55 }}>
                                    {t.startedAt ? <span className="text-blue-400">{fmtDate(t.startedAt)}</span> : <span className="text-on-surface/20">—</span>}
                                  </span>
                                  <span className="px-2 text-center" style={{ minWidth: 55 }}>
                                    {t.dueDate
                                      ? <span className={t.isOverdue ? "text-red-400 font-bold" : "text-on-surface/60"}>{fmtDate(t.dueDate)}</span>
                                      : <span className="text-on-surface/20">—</span>
                                    }
                                  </span>
                                  <span className="px-2 text-center" style={{ minWidth: 60 }}>
                                    {isDone
                                      ? <span className={t.isOverdue ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{fmtDate(t.completedAt)}</span>
                                      : <span className="text-on-surface/20">Pending</span>
                                    }
                                  </span>
                                  <span className="px-2 text-center" style={{ minWidth: 35 }}>
                                    {t.revisionCount > 0
                                      ? <span className="text-amber-400 font-bold">{t.revisionCount}</span>
                                      : <span className="text-green-400/50">0</span>
                                    }
                                  </span>
                                </div>
                                {/* Expanded Task Detail */}
                                {isTaskSelected && (
                                  <div className="animate-in slide-in-from-top-1 fade-in duration-200 bg-surface-container-lowest border-t border-primary/20 border-b border-b-primary/10">
                                    <div className="p-4 space-y-3">
                                      {/* Task Header */}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                          <h4 className="font-headline text-sm uppercase tracking-wider text-card-text">{t.title}</h4>
                                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest text-white font-bold ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>{t.status.replace(/_/g, " ")}</span>
                                            <span className={`px-1.5 py-0.5 text-[10px] uppercase font-bold ${PRIORITY_CHIP[t.priority] || "bg-neutral-400 text-white"}`}>{t.priority}</span>
                                            {t.revisionCount > 0 && <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-amber-500/20 text-amber-400">REV: {t.revisionCount}</span>}
                                            {t.isOverdue && <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-red-500/20 text-red-400">OVERDUE</span>}
                                          </div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); setSelectedTaskId(null); }} className="p-1 hover:bg-surface-container-high transition-colors flex-shrink-0">
                                          <span className="material-symbols-outlined text-sm text-on-surface/40">Close</span>
                                        </button>
                                      </div>

                                      {/* Description */}
                                      {t.description ? (
                                        <div className="border-l-2 border-primary/40 pl-3 py-1">
                                          <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40 block mb-1">DESCRIPTION</span>
                                          <p className="font-mono text-[11px] text-on-surface/80 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                                        </div>
                                      ) : (
                                        <div className="border-l-2 border-on-surface/10 pl-3 py-1">
                                          <span className="font-mono text-[11px] text-on-surface/25 uppercase tracking-widest">NO DESCRIPTION PROVIDED</span>
                                        </div>
                                      )}

                                      {/* Detail Grid */}
                                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                        <div className="brutalist-border bg-card p-2.5">
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">PROJECT</span>
                                          <span className="font-headline text-[10px] text-card-text uppercase block mt-0.5">{t.projectTitle}</span>
                                        </div>
                                        <div className="brutalist-border bg-card p-2.5">
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">{isManager && t.assigneeName ? "ASSIGNED TO" : "ASSIGNED BY"}</span>
                                          <span className="font-headline text-[10px] text-primary uppercase block mt-0.5">{isManager && t.assigneeName ? t.assigneeName : (t.assignerName || "—")}</span>
                                        </div>
                                        <div className="brutalist-border bg-card p-2.5">
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">CREATED</span>
                                          <span className="font-headline text-[10px] text-on-surface/70 uppercase block mt-0.5">{fmtDate(t.createdAt)}</span>
                                        </div>
                                        <div className="brutalist-border bg-card p-2.5">
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">STARTED</span>
                                          <span className={`font-headline text-[10px] uppercase block mt-0.5 ${t.startedAt ? "text-blue-400" : "text-on-surface/20"}`}>{t.startedAt ? fmtDate(t.startedAt) : "NOT STARTED"}</span>
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div className={`brutalist-border p-2.5 ${t.isOverdue ? "bg-red-500/5 border-red-500/20" : "bg-card"}`}>
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">DUE DATE</span>
                                          <span className={`font-headline text-[10px] uppercase block mt-0.5 ${t.isOverdue ? "text-red-400 font-bold" : t.dueDate ? "text-on-surface/70" : "text-on-surface/20"}`}>
                                            {t.dueDate ? fmtDate(t.dueDate) : "NO DUE DATE"}
                                          </span>
                                        </div>
                                        <div className={`brutalist-border p-2.5 ${isDone ? (t.isOverdue ? "bg-red-500/5" : "bg-green-500/5") : "bg-card"}`}>
                                          <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">COMPLETED</span>
                                          <span className={`font-headline text-[10px] uppercase block mt-0.5 ${isDone ? (t.isOverdue ? "text-red-400 font-bold" : "text-green-400 font-bold") : "text-on-surface/20"}`}>
                                            {isDone ? fmtDate(t.completedAt) : "PENDING"}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Task Lifecycle Timeline */}
                                      {taskActivityMap[t.id] && taskActivityMap[t.id].length > 0 && (() => {
                                        const activities = taskActivityMap[t.id];
                                        const fmtDateTime = (d: any) => d ? new Date(d).toLocaleString("en-IN", {
                                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                        }) : "—";
                                        const calcDuration = (from: any, to: any) => {
                                          if (!from || !to) return null;
                                          const ms = new Date(to).getTime() - new Date(from).getTime();
                                          if (ms < 0) return null;
                                          const mins = Math.floor(ms / 60000);
                                          if (mins < 60) return `${mins}m`;
                                          const hrs = Math.floor(mins / 60);
                                          if (hrs < 24) return `${hrs}h ${mins % 60}m`;
                                          const days = Math.floor(hrs / 24);
                                          return `${days}d ${hrs % 24}h`;
                                        };

                                        // Build timeline events: start with CREATED
                                        interface TimelineEvent {
                                          label: string;
                                          time: Date;
                                          who: string;
                                          role: string;
                                          detail?: string;
                                          color: string;
                                        }
                                        const events: TimelineEvent[] = [{
                                          label: "CREATED",
                                          time: new Date(t.createdAt),
                                          who: t.assignerName || "System",
                                          role: "",
                                          color: "bg-blue-500",
                                        }];

                                        for (const act of activities) {
                                          const meta = act.metadata as any;
                                          let label = act.action.replace(/_/g, " ");
                                          let detail = "";
                                          let color = "bg-blue-400";

                                          if (act.action === "STATUS_CHANGED" && meta) {
                                            label = `${(meta.oldStatus || "").replace(/_/g, " ")} → ${(meta.newStatus || "").replace(/_/g, " ")}`;
                                            if (meta.newStatus === "DONE" || meta.newStatus === "APPROVED") color = "bg-green-500";
                                            else if (meta.newStatus === "REVISION" || meta.newStatus === "CLIENT_REVISION") { color = "bg-red-500"; detail = "Requested revision"; }
                                            else if (meta.newStatus === "IN_PROGRESS") color = "bg-amber-500";
                                            else if (meta.newStatus === "IN_REVIEW" || meta.newStatus === "CLIENT_APPROVAL") color = "bg-purple-500";
                                            else if (meta.newStatus === "TODO") color = "bg-blue-400";
                                          } else if (act.action === "APPROVED") {
                                            label = "APPROVED";
                                            color = "bg-green-500";
                                            detail = "Task approved";
                                          } else if (act.action === "REVISION_REQUESTED") {
                                            label = "REVISION REQUESTED";
                                            color = "bg-red-500";
                                            detail = "Sent back for revision";
                                          } else if (act.action === "ASSIGNED") {
                                            label = "ASSIGNED";
                                            color = "bg-cyan-500";
                                            detail = "Task assigned";
                                          } else if (act.action === "UPDATED") {
                                            const fields = meta?.updatedFields as string[] | undefined;
                                            if (fields?.includes("status")) {
                                              label = "TASK EDITED (STATUS CHANGED)";
                                              color = "bg-yellow-500";
                                              detail = `Fields updated: ${fields.join(", ")}`;
                                            } else {
                                              // Skip non-status UPDATED entries to avoid timeline noise
                                              continue;
                                            }
                                          }

                                          events.push({
                                            label,
                                            time: new Date(act.createdAt),
                                            who: act.userName,
                                            role: act.userRole.replace(/_/g, " "),
                                            detail,
                                            color,
                                          });
                                        }

                                        // Calculate total lifecycle
                                        const totalDuration = events.length > 1 ? calcDuration(events[0].time, events[events.length - 1].time) : null;

                                        return (
                                          <div className="mt-3">
                                            <div className="flex items-center justify-between mb-2">
                                              <span className="font-headline text-[10px] uppercase tracking-widest text-primary">TASK LIFECYCLE TIMELINE</span>
                                              {totalDuration && (
                                                <span className="font-mono text-[10px] text-on-surface/40">
                                                  TOTAL: {totalDuration} · REV: {t.revisionCount}
                                                </span>
                                              )}
                                            </div>
                                            <div className="border-l-2 border-primary/20 ml-2 space-y-0">
                                              {events.map((evt, idx) => {
                                                const elapsed = idx > 0 ? calcDuration(events[idx - 1].time, evt.time) : null;
                                                return (
                                                  <div key={idx} className="relative pl-5 py-1.5">
                                                    {/* Dot */}
                                                    <div className={`absolute -left-[5px] top-2.5 w-2 h-2 rounded-full ${evt.color} ring-2 ring-card`} />
                                                    <div className="flex items-baseline justify-between gap-2">
                                                      <div className="min-w-0">
                                                        <span className="font-headline text-[11px] uppercase tracking-wider text-card-text">{evt.label}</span>
                                                        <span className="font-mono text-[10px] text-on-surface/40 ml-2">
                                                          by {evt.who}{evt.role ? ` (${evt.role})` : ""}
                                                        </span>
                                                        {evt.detail && (
                                                          <span className="font-mono text-[10px] text-on-surface/30 ml-1">— {evt.detail}</span>
                                                        )}
                                                      </div>
                                                      <div className="flex items-center gap-2 flex-shrink-0">
                                                        {elapsed && (
                                                          <span className="font-mono text-[11px] text-primary/60 bg-primary/5 px-1.5 py-0.5">⏱ {elapsed}</span>
                                                        )}
                                                        <span className="font-mono text-[10px] text-on-surface/40">{fmtDateTime(evt.time)}</span>
                                                      </div>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        );
                                      })()}

                                    </div>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Task Cards */}
                  <div className="md:hidden max-h-[500px] overflow-y-auto divide-y divide-on-surface/5">
                    {filteredTasks.map((t: any) => {
                      const isDone = t.status === "DONE" || t.status === "APPROVED";
                      const isTaskSelected = selectedTaskId === t.id;
                      return (
                        <div key={t.id} className={`${isDone && !isTaskSelected ? "opacity-60" : ""}`}>
                          <div
                            onClick={() => setSelectedTaskId(isTaskSelected ? null : t.id)}
                            className={`p-3 space-y-2 cursor-pointer transition-colors ${isTaskSelected ? "bg-primary/5" : ""}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <span className={`material-symbols-outlined text-xs text-on-surface/25 transition-transform duration-200 flex-shrink-0 ${isTaskSelected ? "rotate-90" : ""}`}>chevron_right</span>
                                <div className="min-w-0 flex-1">
                                  <span className="font-headline text-[10px] uppercase tracking-wider text-card-text block truncate">{t.title}</span>
                                  <span className="font-mono text-[10px] text-on-surface/40 uppercase">{t.projectTitle}</span>
                                </div>
                              </div>
                              <span className={`px-1.5 py-0.5 text-[11px] uppercase tracking-widest text-white font-bold flex-shrink-0 ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>
                                {t.status.replace(/_/g, " ")}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px] uppercase brutalist-border bg-surface-container-lowest p-2">
                              <div>
                                <span className="text-on-surface/30 block">Created</span>
                                <span className="text-on-surface/60 font-bold">{fmtDate(t.createdAt)}</span>
                              </div>
                              <div>
                                <span className="text-on-surface/30 block">Started</span>
                                {t.startedAt ? <span className="text-blue-400 font-bold">{fmtDate(t.startedAt)}</span> : <span className="text-on-surface/20">—</span>}
                              </div>
                              <div>
                                <span className="text-on-surface/30 block">Due</span>
                                {t.dueDate ? <span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-on-surface/60"}`}>{fmtDate(t.dueDate)}</span> : <span className="text-on-surface/20">—</span>}
                              </div>
                              <div>
                                <span className="text-on-surface/30 block">Done</span>
                                {isDone ? <span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-green-400"}`}>{fmtDate(t.completedAt)}</span> : <span className="text-on-surface/20">—</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-on-surface/40">
                              <span className={`px-1 py-0.5 ${PRIORITY_CHIP[t.priority] || "bg-neutral-400 text-white"}`}>{t.priority}</span>
                              <span>{isManager && t.assigneeName ? `→ ${t.assigneeName}` : `BY ${t.assignerName || "—"}`}</span>
                              {t.revisionCount > 0 && <span className="text-amber-400 font-bold">{t.revisionCount} rev</span>}
                            </div>
                          </div>
                          {/* Expanded Detail (Mobile) */}
                          {isTaskSelected && (
                            <div className="animate-in slide-in-from-top-1 fade-in duration-200 bg-surface-container-lowest border-t border-primary/20 p-3 space-y-3">
                              {t.description ? (
                                <div className="border-l-2 border-primary/40 pl-3 py-1">
                                  <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40 block mb-1">DESCRIPTION</span>
                                  <p className="font-mono text-[11px] text-on-surface/80 leading-relaxed whitespace-pre-wrap">{t.description}</p>
                                </div>
                              ) : (
                                <div className="border-l-2 border-on-surface/10 pl-3 py-1">
                                  <span className="font-mono text-[11px] text-on-surface/25 uppercase tracking-widest">NO DESCRIPTION PROVIDED</span>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div className="brutalist-border bg-card p-2">
                                  <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">PROJECT</span>
                                  <span className="font-headline text-[11px] text-card-text uppercase block mt-0.5">{t.projectTitle}</span>
                                </div>
                                <div className="brutalist-border bg-card p-2">
                                  <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest block">{isManager && t.assigneeName ? "ASSIGNED TO" : "ASSIGNED BY"}</span>
                                  <span className="font-headline text-[11px] text-primary uppercase block mt-0.5">{isManager && t.assigneeName ? t.assigneeName : (t.assignerName || "—")}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          );
        };

        return (
        <div className="space-y-6">
          {/* Team KPI Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard label="TEAM_SIZE" value={String(employees.length)} sub="active employees" icon="groups" accent="text-blue-400" />
            <KPICard label="QUALITY_SCORE" value={`${avgProperlyRate}%`} sub="avg done-properly rate" icon="verified" accent={avgProperlyRate >= 80 ? "text-green-400" : avgProperlyRate >= 60 ? "text-amber-400" : "text-red-500"} />
            <KPICard label="OVERDUE_RATE" value={`${avgOverdueRate}%`} sub="avg across team" icon="event_busy" accent={avgOverdueRate < 15 ? "text-green-400" : avgOverdueRate < 30 ? "text-amber-400" : "text-red-500"} />
            <KPICard label="THROUGHPUT" value={String(totalCompleted)} sub={`completed / ${totalOngoing} active`} icon="trending_up" accent="text-green-400" />
          </div>

          {/* Employee Performance Audit Table */}
          <div className="brutalist-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-sm uppercase tracking-[0.2em] text-card-text">EMPLOYEE PERFORMANCE AUDIT</h3>
              <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">CLICK ROW TO EXPAND</span>
            </div>
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b brutalist-border uppercase text-on-surface/50 text-[10px]">
                    <th className="pb-3 font-headline">Employee Name</th>
                    <th className="pb-3 font-headline">Department</th>
                    <th className="pb-3 font-headline text-center">Active Tasks</th>
                    <th className="pb-3 font-headline text-center">Completed Tasks</th>
                    <th className="pb-3 font-headline text-center">Done Properly Rate</th>
                    <th className="pb-3 font-headline text-center">Overdue Rate</th>
                    <th className="pb-3 font-headline text-right">Hours Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-on-surface/5">
                  {teamPerformanceReport
                    .filter((u: any) => u.type === "employee")
                    .map((emp: any) => {
                      const properlyRateColor =
                        emp.doneProperlyRate >= 90
                          ? "text-green-400 font-bold"
                          : emp.doneProperlyRate >= 70
                          ? "text-amber-400"
                          : "text-red-500 font-bold animate-pulse";

                      const overdueColor =
                        emp.overdueRate < 15
                          ? "text-green-400"
                          : emp.overdueRate <= 30
                          ? "text-amber-400"
                          : "text-red-500 font-bold";

                      const isSelected = selectedPersonId === emp.id;

                      return (
                        <tr key={emp.id} className="group" style={{ verticalAlign: "top" }}>
                          <td colSpan={7} className="p-0">
                            <div
                              onClick={() => togglePerson(emp.id)}
                              className={`px-0 py-3 flex items-center cursor-pointer transition-colors ${
                                isSelected ? "bg-primary/5" : "hover:bg-surface-container-low"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                <span className={`material-symbols-outlined text-xs text-on-surface/30 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`}>chevron_right</span>
                                <span className="font-bold text-card-text uppercase flex-1" style={{ minWidth: 0 }}>{emp.name}</span>
                                <span className="uppercase text-on-surface/60 w-24 text-left">{emp.department || "—"}</span>
                                <span className="text-center w-20">{emp.ongoingCount}</span>
                                <span className="text-center w-24">{emp.completedCount}</span>
                                <span className={`text-center w-28 ${properlyRateColor}`}>
                                  {emp.doneProperlyRate}%
                                  <span className="text-[11px] block text-on-surface/30 uppercase tracking-tighter">
                                    {emp.totalRevisions} revisions
                                  </span>
                                </span>
                                <span className={`text-center w-20 ${overdueColor}`}>{emp.overdueRate}%</span>
                                <span className="text-right font-bold text-primary w-20">{emp.hoursLogged.toFixed(1)} hrs</span>
                              </div>
                            </div>
                            {isSelected && renderPersonPanel(emp, false)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {teamPerformanceReport
                .filter((u: any) => u.type === "employee")
                .map((emp: any) => {
                  const properlyRateColor =
                    emp.doneProperlyRate >= 90
                      ? "text-green-400 font-bold"
                      : emp.doneProperlyRate >= 70
                      ? "text-amber-400"
                      : "text-red-500 font-bold";

                  const overdueColor =
                    emp.overdueRate < 15
                      ? "text-green-400"
                      : emp.overdueRate <= 30
                      ? "text-amber-400"
                      : "text-red-500 font-bold";

                  const isSelected = selectedPersonId === emp.id;

                  return (
                    <div key={emp.id} className={`brutalist-border overflow-hidden ${isSelected ? "border-primary/30" : ""}`}>
                      <div
                        onClick={() => togglePerson(emp.id)}
                        className={`bg-surface-container-lowest p-4 space-y-3 font-mono text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm text-on-surface/30 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`}>chevron_right</span>
                            <div>
                              <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                                {emp.name}
                              </span>
                              <span className="text-[11px] text-on-surface/40 uppercase tracking-wider block">
                                {emp.department || "—"}
                              </span>
                            </div>
                          </div>
                          <span className="text-primary font-bold">{emp.hoursLogged.toFixed(1)} hrs</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-on-surface/5 text-[11px] uppercase">
                          <div>
                            <span className="text-on-surface/40 block">ACTIVE / DONE</span>
                            <span className="text-foreground font-bold">{emp.ongoingCount} / {emp.completedCount}</span>
                          </div>
                          <div>
                            <span className="text-on-surface/40 block">PROPERLY RATE</span>
                            <span className={properlyRateColor}>{emp.doneProperlyRate}%</span>
                            <span className="text-[11px] text-on-surface/30 block">({emp.totalRevisions} revisions)</span>
                          </div>
                          <div>
                            <span className="text-on-surface/40 block">OVERDUE RATE</span>
                            <span className={overdueColor}>{emp.overdueRate}%</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && renderPersonPanel(emp, false)}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Manager & POC Oversight Table */}
          <div className="brutalist-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-headline text-sm uppercase tracking-[0.2em] text-card-text">
                MANAGEMENT & POC OVERSIGHT ACTIVITY
              </h3>
              <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">CLICK ROW TO EXPAND</span>
            </div>
            
            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b brutalist-border uppercase text-on-surface/50 text-[10px]">
                    <th className="pb-3 font-headline">Manager Name</th>
                    <th className="pb-3 font-headline">Role</th>
                    <th className="pb-3 font-headline text-center">Projects Managed</th>
                    <th className="pb-3 font-headline text-center">Tasks Created</th>
                    <th className="pb-3 font-headline text-center">Reviews Performed</th>
                    <th className="pb-3 font-headline text-right">Hours Logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-on-surface/5">
                  {teamPerformanceReport
                    .filter((u: any) => u.type === "manager")
                    .map((mgr: any) => {
                      const isSelected = selectedPersonId === mgr.id;
                      return (
                        <tr key={mgr.id} style={{ verticalAlign: "top" }}>
                          <td colSpan={6} className="p-0">
                            <div
                              onClick={() => togglePerson(mgr.id)}
                              className={`px-0 py-3 flex items-center cursor-pointer transition-colors ${
                                isSelected ? "bg-primary/5" : "hover:bg-surface-container-low"
                              }`}
                            >
                              <div className="flex items-center gap-1.5 w-full">
                                <span className={`material-symbols-outlined text-xs text-on-surface/30 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`}>chevron_right</span>
                                <span className="font-bold text-card-text uppercase flex-1" style={{ minWidth: 0 }}>{mgr.name}</span>
                                <span className="text-on-surface/60 text-[10px] uppercase font-bold w-24">{mgr.role.replace("_", " ")}</span>
                                <span className="text-center w-28">{mgr.projectsManaged}</span>
                                <span className="text-center w-24">{mgr.tasksCreated}</span>
                                <span className="text-center text-amber-400 font-bold w-28">{mgr.reviewsPerformed}</span>
                                <span className="text-right font-bold text-primary w-20">{mgr.hoursLogged.toFixed(1)} hrs</span>
                              </div>
                            </div>
                            {isSelected && renderPersonPanel(mgr, true)}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {teamPerformanceReport
                .filter((u: any) => u.type === "manager")
                .map((mgr: any) => {
                  const isSelected = selectedPersonId === mgr.id;
                  return (
                    <div key={mgr.id} className={`brutalist-border overflow-hidden ${isSelected ? "border-primary/30" : ""}`}>
                      <div
                        onClick={() => togglePerson(mgr.id)}
                        className={`bg-surface-container-lowest p-4 space-y-3 font-mono text-xs cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-sm text-on-surface/30 transition-transform duration-200 ${isSelected ? "rotate-90" : ""}`}>chevron_right</span>
                            <div>
                              <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                                {mgr.name}
                              </span>
                              <span className="text-[11px] text-on-surface/40 uppercase tracking-wider block">
                                {mgr.role.replace("_", " ")}
                              </span>
                            </div>
                          </div>
                          <span className="text-primary font-bold">{mgr.hoursLogged.toFixed(1)} hrs</span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-on-surface/5 text-[11px] uppercase text-center">
                          <div className="border-r border-on-surface/5 last:border-0 pr-1">
                            <span className="text-on-surface/40 block">PROJECTS</span>
                            <span className="text-foreground font-bold">{mgr.projectsManaged}</span>
                          </div>
                          <div className="border-r border-on-surface/5 last:border-0 px-1">
                            <span className="text-on-surface/40 block">TASKS</span>
                            <span className="text-foreground font-bold">{mgr.tasksCreated}</span>
                          </div>
                          <div className="pl-1">
                            <span className="text-on-surface/40 block">REVIEWS</span>
                            <span className="text-amber-400 font-bold">{mgr.reviewsPerformed}</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && renderPersonPanel(mgr, true)}
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
        );
      })()}

      {/* ── View 3: Quality & Delay Task Audit (Redesigned) ── */}
      {activeTab === "TASK_AUDIT" && (() => {
        const completedInReport = managementTasksReport.filter((t: any) => t.status === "DONE" || t.status === "APPROVED");
        const ongoingCount = managementTasksReport.length - completedInReport.length;
        const overdueCount = managementTasksReport.filter((t: any) => t.isOverdue).length;
        const revisionsCount = managementTasksReport.filter((t: any) => t.revisionCount > 0).length;
        const onTimeCount = completedInReport.filter((t: any) => !t.isOverdue).length;
        const onTimeRate = completedInReport.length > 0 ? Math.round((onTimeCount / completedInReport.length) * 100) : 100;
        const tasksWithStart = managementTasksReport.filter((t: any) => t.startedAt && t.createdAt);
        const avgStartDelay = tasksWithStart.length > 0 ? (tasksWithStart.reduce((sum: number, t: any) => sum + Math.max(0, (new Date(t.startedAt).getTime() - new Date(t.createdAt).getTime()) / 864e5), 0) / tasksWithStart.length).toFixed(1) : "0";
        const overdueWithDays = managementTasksReport.filter((t: any) => t.isOverdue && t.overdueDays > 0);
        const avgDelay = overdueWithDays.length > 0 ? Math.round(overdueWithDays.reduce((s: number, t: any) => s + t.overdueDays, 0) / overdueWithDays.length) : 0;
        const filteredTasks = managementTasksReport.filter((t: any) => {
          if (taskFilter === "ONGOING") return t.status !== "DONE" && t.status !== "APPROVED";
          if (taskFilter === "OVERDUE") return t.isOverdue;
          if (taskFilter === "REVISIONS") return t.revisionCount > 0;
          return true;
        });
        const groupMap: Record<string, any[]> = {};
        filteredTasks.forEach((t: any) => { const k = t.projectTitle; if (!groupMap[k]) groupMap[k] = []; groupMap[k].push(t); });
        const projectGroups = Object.entries(groupMap).map(([title, tasks]) => ({ title, tasks, total: tasks.length, overdue: tasks.filter((t: any) => t.isOverdue).length, revisions: tasks.filter((t: any) => t.revisionCount > 0).length, completed: tasks.filter((t: any) => t.status === "DONE" || t.status === "APPROVED").length })).sort((a, b) => b.overdue - a.overdue || b.total - a.total);
        const toggleProject = (title: string) => { setCollapsedProjects((prev) => { const next = new Set(prev); next.has(title) ? next.delete(title) : next.add(title); return next; }); };
        const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
        const getTimelineInfo = (t: any) => {
          const now = new Date(); const created = t.createdAt ? new Date(t.createdAt) : null; const due = t.dueDate ? new Date(t.dueDate) : null; const done = t.completedAt ? new Date(t.completedAt) : null; const isComp = t.status === "DONE" || t.status === "APPROVED"; const ageDays = created ? Math.floor((now.getTime() - created.getTime()) / 864e5) : null;
          let pct = 0; let barColor = "bg-primary";
          if (created && due) { const total = due.getTime() - created.getTime(); if (total > 0) { const end = isComp && done ? done : now; pct = Math.min(Math.round(((end.getTime() - created.getTime()) / total) * 100), 150); } }
          if (t.isOverdue) barColor = "bg-red-500"; else if (pct > 75 && !isComp) barColor = "bg-amber-400"; else if (isComp) barColor = "bg-green-500";
          let delayText = "No deadline"; let delayColor = "text-on-surface/30"; let delayIcon = "remove";
          if (t.isOverdue) { delayColor = "text-red-500"; delayIcon = "error"; delayText = isComp ? `${t.overdueDays}d late` : `${t.overdueDays}d overdue`; }
          else if (!isComp && due) { const left = Math.ceil((due.getTime() - now.getTime()) / 864e5); if (left <= 1) { delayColor = "text-amber-400"; delayIcon = "warning"; delayText = left <= 0 ? "Due today" : "1d left"; } else { delayColor = "text-on-surface/60"; delayIcon = "schedule"; delayText = `${left}d left`; } }
          else if (isComp && !t.isOverdue) { delayColor = "text-green-400"; delayIcon = "check_circle"; delayText = "On time"; }
          return { pct, barColor, delayText, delayColor, delayIcon, ageDays };
        };
        return (
          <div className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard label="ON_TIME_DELIVERY" value={`${onTimeRate}%`} sub={`${onTimeCount}/${completedInReport.length} on time`} icon="verified" accent={onTimeRate >= 80 ? "text-green-400" : onTimeRate >= 50 ? "text-amber-400" : "text-red-500"} />
              <KPICard label="AVG_START_DELAY" value={`${avgStartDelay}d`} sub="days to begin work" icon="play_circle" accent={Number(avgStartDelay) <= 1 ? "text-green-400" : Number(avgStartDelay) <= 3 ? "text-amber-400" : "text-red-400"} />
              <KPICard label="OVERDUE_TASKS" value={String(overdueCount)} sub="missed deadlines" icon="event_busy" accent={overdueCount > 0 ? "text-red-500" : "text-green-400"} />
              <KPICard label="AVG_DELAY" value={`${avgDelay}d`} sub="for late tasks" icon="hourglass_empty" accent={avgDelay > 0 ? "text-red-400" : "text-green-400"} />
            </div>
            <div className="flex flex-wrap gap-2 brutalist-border bg-card p-2">
              {(["ALL", "ONGOING", "OVERDUE", "REVISIONS"] as const).map((f) => {
                const counts = { ALL: managementTasksReport.length, ONGOING: ongoingCount, OVERDUE: overdueCount, REVISIONS: revisionsCount };
                return (<button key={f} onClick={() => setTaskFilter(f)} className={`px-4 py-1.5 font-headline text-[10px] uppercase tracking-wider transition-all duration-150 border brutalist-border ${taskFilter === f ? "bg-primary text-white" : "bg-surface-container-high text-on-surface/75 hover:bg-surface-container-highest"}`}>{f.replace("_", " ")} ({counts[f]})</button>);
              })}
            </div>
            {filteredTasks.length === 0 && (<div className="brutalist-border bg-card p-12 text-center"><span className="material-symbols-outlined text-3xl text-on-surface/20 block mb-2">search_off</span><p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">NO TASKS MATCH THIS FILTER</p></div>)}
            {projectGroups.map((grp) => {
              const collapsed = collapsedProjects.has(grp.title);
              const pct = grp.total > 0 ? Math.round((grp.completed / grp.total) * 100) : 0;
              return (
                <div key={grp.title} className="brutalist-border bg-card overflow-hidden">
                  <button onClick={() => toggleProject(grp.title)} className="w-full flex items-center gap-3 p-4 bg-surface-container-low hover:bg-surface-container-high transition-colors text-left group">
                    <span className={`material-symbols-outlined text-sm text-on-surface/40 transition-transform duration-200 ${collapsed ? "" : "rotate-90"}`}>chevron_right</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-headline text-xs uppercase tracking-wider text-card-text">{grp.title}</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 bg-surface-container-highest text-on-surface/50">{grp.total} tasks</span>
                        {grp.overdue > 0 && <span className="font-mono text-[11px] px-2 py-0.5 bg-red-500/15 text-red-400 font-bold">{grp.overdue} overdue</span>}
                        {grp.revisions > 0 && <span className="font-mono text-[11px] px-2 py-0.5 bg-amber-500/15 text-amber-400">{grp.revisions} rev</span>}
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1 bg-surface-container-highest overflow-hidden"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} /></div>
                        <span className="font-mono text-[10px] text-on-surface/40 w-8 text-right">{pct}%</span>
                      </div>
                    </div>
                  </button>
                  {!collapsed && (<div className="divide-y divide-on-surface/5">
                    {grp.tasks.map((t: any) => {
                      const info = getTimelineInfo(t); const isComp = t.status === "DONE" || t.status === "APPROVED";
                      return (
                        <div key={t.id}>
                          <div className="hidden md:block px-4 py-3 hover:bg-surface-container-lowest/50 transition-colors">
                            <div className="flex items-start gap-4">
                              <div className="flex-1 min-w-0">
                                <span className="font-headline text-[11px] uppercase tracking-wider text-card-text block truncate">{t.title}</span>
                                <span className="font-mono text-[11px] text-on-surface/40 uppercase tracking-wider">{t.creatorName} <span className="text-primary">→</span> {t.assigneeName}{t.assigneeDept && <span className="text-on-surface/25 ml-1">({t.assigneeDept})</span>}</span>
                              </div>
                              <span className={`px-2 py-0.5 text-[10px] uppercase tracking-widest text-white font-bold flex-shrink-0 ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>{t.status.replace(/_/g, " ")}</span>
                              <div className="w-16 text-center flex-shrink-0">{t.revisionCount > 0 ? <span className="text-amber-400 font-bold font-mono text-[10px]">{t.revisionCount} rev</span> : <span className="text-green-400/60 font-mono text-[10px]">0 rev</span>}</div>
                              <div className="w-14 text-center flex-shrink-0"><span className="font-mono text-[10px] text-on-surface/40">{info.ageDays !== null ? `${info.ageDays}d` : "—"}</span></div>
                              <div className={`w-28 text-right flex-shrink-0 flex items-center justify-end gap-1 ${info.delayColor}`}><span className="material-symbols-outlined text-xs">{info.delayIcon}</span><span className="font-mono text-[10px] font-bold">{info.delayText}</span></div>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="grid grid-cols-4 gap-3 font-mono text-[10px] uppercase tracking-wider flex-shrink-0 min-w-[340px]">
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-on-surface/30 mb-0.5">Created</span>
                                  <span className="text-on-surface/60 font-bold">{fmtDate(t.createdAt)}</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-on-surface/30 mb-0.5">Started</span>
                                  {t.startedAt ? <span className="text-blue-400 font-bold">{fmtDate(t.startedAt)}</span> : <span className="text-on-surface/20">Not started</span>}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-on-surface/30 mb-0.5">Due</span>
                                  {t.dueDate ? <span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-on-surface/60"}`}>{fmtDate(t.dueDate)}</span> : <span className="text-on-surface/20">No due date</span>}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] text-on-surface/30 mb-0.5">Completed</span>
                                  {isComp ? <span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-green-400"}`}>{fmtDate(t.completedAt)}</span> : <span className="text-on-surface/20">Pending</span>}
                                </div>
                              </div>
                              <div className="flex-1 h-2 bg-surface-container-high overflow-hidden rounded-sm"><div className={`h-full transition-all duration-700 ${info.barColor}`} style={{ width: `${Math.min(info.pct, 100)}%` }} /></div>
                              <span className="font-mono text-[11px] text-on-surface/30 w-8 text-right flex-shrink-0">{Math.min(info.pct, 100)}%</span>
                            </div>
                            {/* Expand/collapse timeline toggle */}
                            {taskActivityMap[t.id] && taskActivityMap[t.id].length > 0 && (
                              <div className="mt-1">
                                <button
                                  onClick={() => setSelectedTaskId(selectedTaskId === t.id ? null : t.id)}
                                  className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-primary/60 hover:text-primary transition-colors py-1"
                                >
                                  <span className="material-symbols-outlined text-xs">
                                    {selectedTaskId === t.id ? "expand_less" : "timeline"}
                                  </span>
                                  {selectedTaskId === t.id ? "HIDE TIMELINE" : "VIEW LIFECYCLE TIMELINE"}
                                </button>
                                {selectedTaskId === t.id && (() => {
                                  const activities = taskActivityMap[t.id];
                                  const fmtDateTime2 = (d: any) => d ? new Date(d).toLocaleString("en-IN", {
                                    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                                  }) : "\u2014";
                                  const calcDuration2 = (from: any, to: any) => {
                                    if (!from || !to) return null;
                                    const ms = new Date(to).getTime() - new Date(from).getTime();
                                    if (ms < 0) return null;
                                    const mins = Math.floor(ms / 60000);
                                    if (mins < 60) return `${mins}m`;
                                    const hrs = Math.floor(mins / 60);
                                    if (hrs < 24) return `${hrs}h ${mins % 60}m`;
                                    const days = Math.floor(hrs / 24);
                                    return `${days}d ${hrs % 24}h`;
                                  };
                                  const events2: Array<{label:string;time:Date;who:string;role:string;detail?:string;color:string}> = [{
                                    label: "CREATED", time: new Date(t.createdAt), who: t.creatorName || "System", role: t.creatorRole || "", color: "bg-blue-500",
                                  }];
                                  for (const act of activities) {
                                    const meta = act.metadata as any;
                                    let label = act.action.replace(/_/g, " ");
                                    let detail = "";
                                    let color = "bg-blue-400";
                                    if (act.action === "STATUS_CHANGED" && meta) {
                                      label = `${(meta.oldStatus||"").replace(/_/g," ")} \u2192 ${(meta.newStatus||"").replace(/_/g," ")}`;
                                      if (meta.newStatus === "DONE" || meta.newStatus === "APPROVED") color = "bg-green-500";
                                      else if (meta.newStatus === "REVISION") { color = "bg-red-500"; detail = "Revision requested"; }
                                      else if (meta.newStatus === "IN_PROGRESS") color = "bg-amber-500";
                                      else if (meta.newStatus === "IN_REVIEW" || meta.newStatus === "CLIENT_APPROVAL") color = "bg-purple-500";
                                    } else if (act.action === "APPROVED") { label = "APPROVED"; color = "bg-green-500"; }
                                    else if (act.action === "REVISION_REQUESTED") { label = "REVISION REQUESTED"; color = "bg-red-500"; }
                                    else if (act.action === "ASSIGNED") { label = "ASSIGNED"; color = "bg-cyan-500"; }
                                    else if (act.action === "UPDATED") {
                                      const fields = meta?.updatedFields as string[] | undefined;
                                      if (fields?.includes("status")) {
                                        label = "TASK EDITED (STATUS CHANGED)";
                                        color = "bg-yellow-500";
                                        detail = `Fields: ${fields.join(", ")}`;
                                      } else {
                                        continue;
                                      }
                                    }
                                    events2.push({ label, time: new Date(act.createdAt), who: act.userName, role: act.userRole.replace(/_/g, " "), detail, color });
                                  }
                                  const totalDur = events2.length > 1 ? calcDuration2(events2[0].time, events2[events2.length - 1].time) : null;
                                  return (
                                    <div className="mt-2 mb-1 pl-2 border-l-2 border-primary/20 space-y-0 animate-in slide-in-from-top-2 duration-200">
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-headline text-[10px] uppercase tracking-widest text-primary">LIFECYCLE</span>
                                        {totalDur && <span className="font-mono text-[10px] text-on-surface/40">TOTAL: {totalDur} · REV: {t.revisionCount}</span>}
                                      </div>
                                      {events2.map((evt, idx) => {
                                        const elapsed = idx > 0 ? calcDuration2(events2[idx - 1].time, evt.time) : null;
                                        return (
                                          <div key={idx} className="relative pl-4 py-1">
                                            <div className={`absolute -left-[4px] top-2 w-2 h-2 rounded-full ${evt.color} ring-2 ring-card`} />
                                            <div className="flex items-baseline justify-between gap-2">
                                              <div className="min-w-0">
                                                <span className="font-headline text-[11px] uppercase tracking-wider text-card-text">{evt.label}</span>
                                                <span className="font-mono text-[10px] text-on-surface/40 ml-2">by {evt.who}{evt.role ? ` (${evt.role})` : ""}</span>
                                                {evt.detail && <span className="font-mono text-[10px] text-on-surface/30 ml-1">— {evt.detail}</span>}
                                              </div>
                                              <div className="flex items-center gap-2 flex-shrink-0">
                                                {elapsed && <span className="font-mono text-[11px] text-primary/60 bg-primary/5 px-1.5 py-0.5">⏱ {elapsed}</span>}
                                                <span className="font-mono text-[10px] text-on-surface/40">{fmtDateTime2(evt.time)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                          <div className="md:hidden p-4 space-y-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1"><span className="font-headline text-[11px] uppercase tracking-wider text-card-text block truncate">{t.title}</span><span className="font-mono text-[11px] text-on-surface/40 uppercase">{t.creatorName} <span className="text-primary">→</span> {t.assigneeName}</span></div>
                              <span className={`px-2 py-0.5 text-[11px] uppercase tracking-widest text-white font-bold flex-shrink-0 ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>{t.status.replace(/_/g, " ")}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center font-mono text-[10px] uppercase brutalist-border bg-surface-container-lowest p-2">
                              <div><span className="text-[10px] text-on-surface/30 block mb-0.5">Created</span><span className="text-on-surface/60 font-bold">{fmtDate(t.createdAt)}</span></div>
                              <div><span className="text-[10px] text-on-surface/30 block mb-0.5">Started</span>{t.startedAt ? <span className="text-blue-400 font-bold">{fmtDate(t.startedAt)}</span> : <span className="text-on-surface/20">—</span>}</div>
                              <div><span className="text-[10px] text-on-surface/30 block mb-0.5">Due</span><span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-on-surface/60"}`}>{fmtDate(t.dueDate)}</span></div>
                              <div><span className="text-[10px] text-on-surface/30 block mb-0.5">Completed</span>{isComp ? <span className={`font-bold ${t.isOverdue ? "text-red-400" : "text-green-400"}`}>{fmtDate(t.completedAt)}</span> : <span className="text-on-surface/20">Pending</span>}</div>
                            </div>
                            <div className="h-1.5 bg-surface-container-high overflow-hidden rounded-sm"><div className={`h-full transition-all duration-700 ${info.barColor}`} style={{ width: `${Math.min(info.pct, 100)}%` }} /></div>
                            <div className="flex items-center justify-between pt-1 border-t border-on-surface/5 text-[11px]">
                              <div className="flex items-center gap-3">{t.revisionCount > 0 ? <span className="text-amber-400 font-bold font-mono">{t.revisionCount} rev</span> : <span className="text-green-400/60 font-mono">0 rev</span>}{info.ageDays !== null && <span className="text-on-surface/30 font-mono">{info.ageDays}d old</span>}</div>
                              <div className={`flex items-center gap-1 ${info.delayColor}`}><span className="material-symbols-outlined text-xs">{info.delayIcon}</span><span className="font-mono font-bold">{info.delayText}</span></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>)}
                </div>
              );
            })}
          </div>
        );
      })()}

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
        <span className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">{label}</span>
      </div>
      <p className="font-headline text-2xl md:text-3xl text-card-text tracking-tight">{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40 mt-1">{sub}</p>
    </div>
  );
}
