"use client";

import { useState } from "react";
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
}: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<"DASHBOARD" | "TEAM_AUDIT" | "TASK_AUDIT">("DASHBOARD");
  const [taskFilter, setTaskFilter] = useState<"ALL" | "ONGOING" | "OVERDUE" | "REVISIONS">("ALL");

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
          {/* KPI Cards */}
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

          {/* Task Status Breakdown */}
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
            {/* Project Progress */}
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

            {/* Team Performance */}
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

          {/* Monthly Stats + Recent Activity */}
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
        </>
      )}

      {/* ── View 2: Team Performance Audit ── */}
      {activeTab === "TEAM_AUDIT" && (
        <div className="space-y-6">
          {/* Employee Performance Audit Table */}
          <div className="brutalist-border bg-card p-5">
            <h3 className="font-headline text-sm uppercase tracking-[0.2em] text-card-text mb-4">
              EMPLOYEE PERFORMANCE AUDIT
            </h3>
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

                      return (
                        <tr key={emp.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3 font-bold text-card-text uppercase">{emp.name}</td>
                          <td className="py-3 uppercase text-on-surface/60">{emp.department || "—"}</td>
                          <td className="py-3 text-center">{emp.ongoingCount}</td>
                          <td className="py-3 text-center">{emp.completedCount}</td>
                          <td className={`py-3 text-center ${properlyRateColor}`}>
                            {emp.doneProperlyRate}%
                            <span className="text-[9px] block text-on-surface/30 uppercase tracking-tighter">
                              {emp.totalRevisions} revisions
                            </span>
                          </td>
                          <td className={`py-3 text-center ${overdueColor}`}>{emp.overdueRate}%</td>
                          <td className="py-3 text-right font-bold text-primary">{emp.hoursLogged.toFixed(1)} hrs</td>
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

                  return (
                    <div key={emp.id} className="brutalist-border bg-surface-container-lowest p-4 space-y-3 font-mono text-xs">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                            {emp.name}
                          </span>
                          <span className="text-[9px] text-on-surface/40 uppercase tracking-wider block">
                            {emp.department || "—"}
                          </span>
                        </div>
                        <span className="text-primary font-bold">{emp.hoursLogged.toFixed(1)} hrs</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-on-surface/5 text-[9px] uppercase">
                        <div>
                          <span className="text-on-surface/40 block">ACTIVE / DONE</span>
                          <span className="text-foreground font-bold">{emp.ongoingCount} / {emp.completedCount}</span>
                        </div>
                        <div>
                          <span className="text-on-surface/40 block">PROPERLY RATE</span>
                          <span className={properlyRateColor}>{emp.doneProperlyRate}%</span>
                          <span className="text-[7px] text-on-surface/30 block">({emp.totalRevisions} revisions)</span>
                        </div>
                        <div>
                          <span className="text-on-surface/40 block">OVERDUE RATE</span>
                          <span className={overdueColor}>{emp.overdueRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Manager & POC Oversight Table */}
          <div className="brutalist-border bg-card p-5">
            <h3 className="font-headline text-sm uppercase tracking-[0.2em] text-card-text mb-4">
              MANAGEMENT & POC OVERSIGHT ACTIVITY
            </h3>
            
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
                    .map((mgr: any) => (
                      <tr key={mgr.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-3 font-bold text-card-text uppercase">{mgr.name}</td>
                        <td className="py-3 text-on-surface/60 text-[10px] uppercase font-bold">{mgr.role.replace("_", " ")}</td>
                        <td className="py-3 text-center">{mgr.projectsManaged}</td>
                        <td className="py-3 text-center">{mgr.tasksCreated}</td>
                        <td className="py-3 text-center text-amber-400 font-bold">{mgr.reviewsPerformed}</td>
                        <td className="py-3 text-right font-bold text-primary">{mgr.hoursLogged.toFixed(1)} hrs</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {teamPerformanceReport
                .filter((u: any) => u.type === "manager")
                .map((mgr: any) => (
                  <div key={mgr.id} className="brutalist-border bg-surface-container-lowest p-4 space-y-3 font-mono text-xs">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                          {mgr.name}
                        </span>
                        <span className="text-[9px] text-on-surface/40 uppercase tracking-wider block">
                          {mgr.role.replace("_", " ")}
                        </span>
                      </div>
                      <span className="text-primary font-bold">{mgr.hoursLogged.toFixed(1)} hrs</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-on-surface/5 text-[9px] uppercase text-center">
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
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ── View 3: Quality & Delay Task Audit ── */}
      {activeTab === "TASK_AUDIT" && (() => {
        const ongoingCount = managementTasksReport.filter(t => t.status !== "DONE" && t.status !== "APPROVED").length;
        const overdueCount = managementTasksReport.filter(t => t.isOverdue).length;
        const revisionsCount = managementTasksReport.filter(t => t.revisionCount > 0).length;

        const totalDelays = managementTasksReport
          .filter(t => t.isOverdue && t.overdueDays > 0)
          .reduce((sum, t) => sum + t.overdueDays, 0);
        const overdueTasksCount = managementTasksReport.filter(t => t.isOverdue && t.overdueDays > 0).length;
        const avgDelay = overdueTasksCount > 0 ? Math.round(totalDelays / overdueTasksCount) : 0;

        const filteredTasks = managementTasksReport.filter((t) => {
          if (taskFilter === "ONGOING") return t.status !== "DONE" && t.status !== "APPROVED";
          if (taskFilter === "OVERDUE") return t.isOverdue;
          if (taskFilter === "REVISIONS") return t.revisionCount > 0;
          return true;
        });

        return (
          <div className="space-y-6">
            {/* Audit KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="ONGOING_TASKS"
                value={String(ongoingCount)}
                sub="active assignments"
                icon="pending_actions"
                accent="text-blue-400"
              />
              <KPICard
                label="QUALITY_CONCERNS"
                value={String(revisionsCount)}
                sub="tasks requiring revisions"
                icon="rate_review"
                accent={revisionsCount > 0 ? "text-amber-400" : "text-green-400"}
              />
              <KPICard
                label="OVERDUE_TRACK"
                value={String(overdueCount)}
                sub="missed deadlines"
                icon="event_busy"
                accent={overdueCount > 0 ? "text-red-500" : "text-green-400"}
              />
              <KPICard
                label="AVG_DELAY_TIME"
                value={`${avgDelay} days`}
                sub="for late tasks"
                icon="hourglass_empty"
                accent={avgDelay > 0 ? "text-red-400" : "text-green-400"}
              />
            </div>

            {/* Filter Toggle Row */}
            <div className="flex flex-wrap gap-2 brutalist-border bg-card p-2">
              {(["ALL", "ONGOING", "OVERDUE", "REVISIONS"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`px-4 py-1.5 font-headline text-[10px] uppercase tracking-wider transition-all duration-150 border brutalist-border ${
                    taskFilter === filter
                      ? "bg-primary text-white"
                      : "bg-surface-container-high text-on-surface/75 hover:bg-surface-container-highest"
                  }`}
                >
                  {filter.replace("_", " ")}
                </button>
              ))}
            </div>

            {/* Detailed Audit Table */}
            <div className="brutalist-border bg-card p-5">
              <h3 className="font-headline text-sm uppercase tracking-[0.2em] text-card-text mb-4">
                QUALITY & DELAY AUDIT LOGS
              </h3>
              {/* Desktop View */}
              <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b brutalist-border uppercase text-on-surface/50 text-[10px]">
                    <th className="pb-3 font-headline">Task & Project</th>
                    <th className="pb-3 font-headline">Assigned By</th>
                    <th className="pb-3 font-headline">Assigned To</th>
                    <th className="pb-3 font-headline">Status</th>
                    <th className="pb-3 font-headline text-center">Due Date</th>
                    <th className="pb-3 font-headline text-center">Quality / Revisions</th>
                    <th className="pb-3 font-headline text-right">Delay Tracker</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-on-surface/5">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-on-surface/30 uppercase tracking-wider">
                        NO_AUDIT_DATA_MATCHING_FILTER
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((t) => {
                      const isCompleted = t.status === "DONE" || t.status === "APPROVED";
                      
                      let delayStatusText = "On Time";
                      let delayColorClass = "text-green-400";
                      
                      if (t.isOverdue) {
                        delayColorClass = "text-red-500 font-bold";
                        delayStatusText = isCompleted
                          ? `Completed ${t.overdueDays} Days Late`
                          : `${t.overdueDays} Days Overdue`;
                      } else if (!isCompleted && t.dueDate) {
                        const diffTime = new Date(t.dueDate).getTime() - new Date().getTime();
                        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        delayStatusText = `${daysLeft} Days Left`;
                        delayColorClass = "text-on-surface/50";
                      } else if (isCompleted && !t.isOverdue) {
                        delayStatusText = "Completed On Time";
                        delayColorClass = "text-green-400";
                      } else {
                        delayStatusText = "No Due Date";
                        delayColorClass = "text-on-surface/30";
                      }

                      return (
                        <tr key={t.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-3">
                            <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                              {t.title}
                            </span>
                            <span className="text-[9px] text-on-surface/40 uppercase tracking-wider block">
                              {t.projectTitle}
                            </span>
                          </td>
                          <td className="py-3">
                            <span className="block font-bold text-card-text uppercase">{t.creatorName}</span>
                            <span className="text-[9px] text-on-surface/45 uppercase tracking-widest">{t.creatorRole}</span>
                          </td>
                          <td className="py-3">
                            <span className="block font-bold text-card-text uppercase">{t.assigneeName}</span>
                            <span className="text-[9px] text-on-surface/45 uppercase tracking-widest">{t.assigneeDept || "—"}</span>
                          </td>
                          <td className="py-3">
                            <span className="`px-2 py-0.5 text-[8px] uppercase tracking-widest text-white font-bold ${TASK_STATUS_COLORS[t.status] || 'bg-neutral-500'}`">
                              {t.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-3 text-center text-on-surface/70">
                            {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                          </td>
                          <td className="py-3 text-center">
                            {t.revisionCount > 0 ? (
                              <span className="text-amber-400 font-bold">
                                {t.revisionCount} {t.revisionCount === 1 ? "Revision" : "Revisions"}
                              </span>
                            ) : (
                              <span className="text-green-400">0 Revisions</span>
                            )}
                          </td>
                          <td className={`py-3 text-right font-bold ${delayColorClass}`}>
                            {delayStatusText}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
              {filteredTasks.length === 0 ? (
                <div className="py-8 text-center text-on-surface/30 uppercase tracking-wider font-mono text-[10px]">
                  NO_AUDIT_DATA_MATCHING_FILTER
                </div>
              ) : (
                filteredTasks.map((t) => {
                  const isCompleted = t.status === "DONE" || t.status === "APPROVED";
                  
                  let delayStatusText = "On Time";
                  let delayColorClass = "text-green-400";
                  
                  if (t.isOverdue) {
                    delayColorClass = "text-red-500 font-bold";
                    delayStatusText = isCompleted
                      ? `Completed ${t.overdueDays} Days Late`
                      : `${t.overdueDays} Days Overdue`;
                  } else if (!isCompleted && t.dueDate) {
                    const diffTime = new Date(t.dueDate).getTime() - new Date().getTime();
                    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    delayStatusText = `${daysLeft} Days Left`;
                    delayColorClass = "text-on-surface/50";
                  } else if (isCompleted && !t.isOverdue) {
                    delayStatusText = "Completed On Time";
                    delayColorClass = "text-green-400";
                  } else {
                    delayStatusText = "No Due Date";
                    delayColorClass = "text-on-surface/30";
                  }

                  return (
                    <div key={t.id} className="brutalist-border bg-surface-container-lowest p-4 space-y-3 font-mono text-xs">
                      <div>
                        <span className="font-headline font-bold text-card-text block uppercase leading-snug">
                          {t.title}
                        </span>
                        <span className="text-[9px] text-on-surface/40 uppercase tracking-wider block">
                          {t.projectTitle}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-on-surface/5 text-[9px] uppercase">
                        <div>
                          <span className="text-on-surface/40 block">ASSIGNED BY</span>
                          <span className="text-foreground font-bold">{t.creatorName}</span>
                          <span className="text-[7px] text-on-surface/45 block">({t.creatorRole})</span>
                        </div>
                        <div>
                          <span className="text-on-surface/40 block">ASSIGNED TO</span>
                          <span className="text-foreground font-bold">{t.assigneeName}</span>
                          <span className="text-[7px] text-on-surface/45 block">({t.assigneeDept || "—"})</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-on-surface/5 text-[9px] uppercase">
                        <div>
                          <span className={`px-2 py-0.5 text-[8px] uppercase tracking-widest text-white font-bold inline-block mr-2 ${TASK_STATUS_COLORS[t.status] || "bg-neutral-500"}`}>
                            {t.status.replace("_", " ")}
                          </span>
                          <span className="text-on-surface/70">
                            DUE: {t.dueDate ? new Date(t.dueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                          </span>
                        </div>
                        <span className={delayColorClass}>
                          {delayStatusText}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-on-surface/5 flex justify-between text-[9px] uppercase">
                        <span className="text-on-surface/40">QUALITY / REVISIONS</span>
                        {t.revisionCount > 0 ? (
                          <span className="text-amber-400 font-bold">
                            {t.revisionCount} {t.revisionCount === 1 ? "Revision" : "Revisions"}
                          </span>
                        ) : (
                          <span className="text-green-400">0 Revisions</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
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
        <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface/30">{label}</span>
      </div>
      <p className="font-headline text-2xl md:text-3xl text-card-text tracking-tight">{value}</p>
      <p className="font-mono text-[8px] uppercase tracking-widest text-on-surface/40 mt-1">{sub}</p>
    </div>
  );
}
