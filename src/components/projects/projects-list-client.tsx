"use client";

import { useState } from "react";
import Link from "next/link";
import type { ProjectStatus, Priority } from "@prisma/client";

interface ProjectCard {
  id: string;
  title: string;
  status: ProjectStatus;
  priority: Priority;
  clientId: string;
  clientName: string;
  clientColor: string;
  managerName: string | null;
  deadline: Date | null;
  taskCount: number;
  fileCount: number;
  tasksDone: number;
  tasksInProgress: number;
  progress: number;
  updatedAt: Date;
}

interface StatusConfig {
  label: string;
  color: string;
}

interface PriorityConfig {
  label: string;
  color: string;
}

interface ProjectsListClientProps {
  projects: ProjectCard[];
  statusConfig: Record<ProjectStatus, StatusConfig>;
  priorityConfig: Record<string, PriorityConfig>;
}

const STATUS_FILTERS: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "ALL" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "DRAFT", label: "DRAFT" },
  { value: "ON_HOLD", label: "ON_HOLD" },
  { value: "COMPLETED", label: "DONE" },
  { value: "ARCHIVED", label: "ARCHIVED" },
];

export function ProjectsListClient({ projects, statusConfig, priorityConfig }: ProjectsListClientProps) {
  const [filter, setFilter] = useState<ProjectStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [collapsedBrands, setCollapsedBrands] = useState<Record<string, boolean>>({});

  const filtered = projects.filter((p) => {
    if (filter !== "ALL" && p.status !== filter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.clientName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by brand (clientName)
  const brandGroups = filtered.reduce((acc, project) => {
    const key = project.clientName;
    if (!acc[key]) {
      acc[key] = { clientId: project.clientId, color: project.clientColor, projects: [] };
    }
    acc[key].projects.push(project);
    return acc;
  }, {} as Record<string, { clientId: string; color: string; projects: ProjectCard[] }>);

  // Sort brands alphabetically
  const sortedBrands = Object.keys(brandGroups).sort();

  const toggleBrand = (brand: string) => {
    setCollapsedBrands((prev) => ({ ...prev, [brand]: !prev[brand] }));
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
        {/* Status tabs */}
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const count = f.value === "ALL" ? projects.length : projects.filter((p) => p.status === f.value).length;
            if (count === 0 && f.value !== "ALL") return null;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 font-headline text-[11px] uppercase tracking-widest brutalist-border transition-colors ${
                  filter === f.value
                    ? "bg-primary text-white border-primary"
                    : "bg-transparent text-on-surface/60 hover:bg-surface-container-high"
                }`}
              >
                {f.label} [{count}]
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex-1 md:max-w-xs ml-auto">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-sm text-on-surface/30">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH PROJECTS..."
              className="w-full h-8 brutalist-border bg-transparent pl-8 pr-3 font-mono text-[10px] uppercase tracking-widest text-on-surface focus:border-primary focus:outline-none placeholder:text-on-surface/20"
            />
          </div>
        </div>
      </div>

      {/* Brand-grouped Projects */}
      {filtered.length === 0 ? (
        <div className="brutalist-border bg-card p-8 text-center">
          <span className="material-symbols-outlined text-2xl text-on-surface/20 mb-2 block">search_off</span>
          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">
            NO_MATCHING_PROJECTS
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedBrands.map((brandName) => {
            const group = brandGroups[brandName];
            const isCollapsed = collapsedBrands[brandName] ?? false;
            const totalTasks = group.projects.reduce((sum, p) => sum + p.taskCount, 0);

            return (
              <div key={brandName} className="brutalist-border bg-card overflow-hidden">
                {/* Brand Header */}
                <button
                  onClick={() => toggleBrand(brandName)}
                  className="w-full flex items-center gap-3 p-3 px-4 hover:bg-surface-container-high/50 transition-colors text-left"
                >
                  <span
                    className={`material-symbols-outlined text-sm transition-transform duration-200 text-on-surface/40 ${
                      isCollapsed ? "" : "rotate-90"
                    }`}
                  >
                    chevron_right
                  </span>
                  <span
                    className="w-3.5 h-3.5 flex-shrink-0 rounded-sm"
                    style={{ backgroundColor: group.color }}
                  />
                  <span className="font-headline text-sm uppercase tracking-widest text-card-text flex-1">
                    {brandName}
                  </span>
                  <span className="font-mono text-[11px] text-on-surface/30 uppercase tracking-widest">
                    {group.projects.length} {group.projects.length === 1 ? "PROJECT" : "PROJECTS"} · {totalTasks} TASKS
                  </span>
                </button>

                {/* Project Cards — collapsible */}
                {!isCollapsed && (
                  <div className="border-t border-on-surface/10 p-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {group.projects.map((project) => {
                      const dueLabel = project.deadline
                        ? new Date(project.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : null;
                      const isOverdue = project.deadline
                        ? new Date(project.deadline) < new Date() && project.status !== "COMPLETED" && project.status !== "ARCHIVED"
                        : false;

                      return (
                        <Link
                          key={project.id}
                          href={`/projects/${project.id}`}
                          className="brutalist-border bg-surface-container-low hover:bg-surface-container-high transition-all group block relative overflow-hidden"
                        >
                          {/* Priority accent */}
                          <div className="p-4">
                            {/* Top row: status + priority */}
                            <div className="flex items-center gap-2 mb-2.5">
                              <span className={`px-2 py-0.5 text-[10px] font-headline uppercase tracking-widest ${statusConfig[project.status]?.color}`}>
                                {statusConfig[project.status]?.label}
                              </span>
                              <span className={`px-1.5 py-0.5 text-[11px] font-headline uppercase ${priorityConfig[project.priority]?.color}`}>
                                {priorityConfig[project.priority]?.label}
                              </span>
                              {isOverdue && (
                                <span className="px-1.5 py-0.5 text-[11px] font-headline uppercase bg-red-600 text-white animate-pulse">
                                  OVERDUE
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="font-headline text-sm uppercase tracking-tight text-card-text mb-1 group-hover:text-primary transition-colors line-clamp-2">
                              {project.title}
                            </h3>

                            {/* Manager */}
                            {project.managerName && (
                              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30 mb-3">
                                MGR: {project.managerName}
                              </p>
                            )}

                            {/* Progress bar */}
                            <div className="mb-2.5">
                              <div className="flex justify-between mb-0.5">
                                <span className="font-mono text-[10px] uppercase text-on-surface/40 tracking-widest">
                                  PROGRESS
                                </span>
                                <span className="font-mono text-[10px] text-primary font-bold">
                                  {project.progress}%
                                </span>
                              </div>
                              <div className="h-1.5 bg-surface-container-high brutalist-border overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${project.progress}%` }}
                                />
                              </div>
                            </div>

                            {/* Stats row */}
                            <div className="flex items-center gap-3 text-[10px] font-mono uppercase text-on-surface/40 tracking-widest">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">task</span>
                                {project.tasksDone}/{project.taskCount}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">attach_file</span>
                                {project.fileCount}
                              </span>
                              {project.tasksInProgress > 0 && (
                                <span className="flex items-center gap-1 text-amber-400">
                                  <span className="material-symbols-outlined text-xs">pending</span>
                                  {project.tasksInProgress}
                                </span>
                              )}
                              {dueLabel && (
                                <span className={`ml-auto ${isOverdue ? "text-red-500 font-bold" : ""}`}>
                                  {dueLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      );
                    })}

                    {/* Quick add project under this brand */}
                    <Link
                      href={`/projects/new?clientId=${group.clientId}`}
                      className="brutalist-border border-dashed bg-transparent flex items-center justify-center gap-2 p-6 text-on-surface/20 hover:text-primary hover:border-primary/30 transition-colors min-h-[120px]"
                    >
                      <span className="material-symbols-outlined text-xl">add</span>
                      <span className="font-headline text-[10px] uppercase tracking-widest">ADD PROJECT</span>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
