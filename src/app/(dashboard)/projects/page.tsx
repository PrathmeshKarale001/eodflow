import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { Role, ProjectStatus } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import { ProjectsListClient } from "@/components/projects/projects-list-client";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; color: string }> = {
  DRAFT: { label: "DRAFT", color: "bg-neutral-500/20 text-neutral-400" },
  ACTIVE: { label: "ACTIVE", color: "bg-green-500/20 text-green-400" },
  ON_HOLD: { label: "ON_HOLD", color: "bg-amber-500/20 text-amber-400" },
  COMPLETED: { label: "COMPLETED", color: "bg-blue-500/20 text-blue-400" },
  ARCHIVED: { label: "ARCHIVED", color: "bg-neutral-600/20 text-neutral-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  URGENT: { label: "URG", color: "bg-red-600 text-white" },
  HIGH: { label: "HI", color: "bg-orange-500 text-white" },
  MEDIUM: { label: "MED", color: "bg-amber-400 text-black" },
  LOW: { label: "LO", color: "bg-neutral-300 text-neutral-700" },
};

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const userRole = session.user.role as Role;
  const canCreateProject = hasPermission(userRole, "createProject");

  // Admin/Super Admin see all; others see projects they manage or have tasks in
  const projects = await db.project.findMany({
    where:
      userRole === "SUPER_ADMIN" || userRole === "ADMIN"
        ? {}
        : {
            OR: [
              { assignedManagerId: session.user.id },
              { createdById: session.user.id },
              { tasks: { some: { assignedToId: session.user.id } } },
            ],
          },
    include: {
      client: { select: { companyName: true, brandColor: true } },
      assignedManager: { select: { name: true } },
      _count: { select: { tasks: true, files: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });

  // Compute task stats per project
  const projectsWithStats = projects.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE" || t.status === "APPROVED").length;
    const inProgress = p.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      id: p.id,
      title: p.title,
      status: p.status,
      priority: p.priority,
      clientName: p.client.companyName,
      clientColor: p.client.brandColor,
      managerName: p.assignedManager?.name || null,
      deadline: p.deadline,
      taskCount: total,
      fileCount: p._count.files,
      tasksDone: done,
      tasksInProgress: inProgress,
      progress,
      updatedAt: p.updatedAt,
    };
  });

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              PROJECTS
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50">
              {activeCount} ACTIVE // {projects.length} TOTAL
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canCreateProject && (
              <Link
                href="/projects/new"
                className="mono-clip bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                NEW_PROJECT
              </Link>
            )}
            <span className="material-symbols-outlined text-[36px] text-primary">folder_open</span>
          </div>
        </div>
      </div>

      {/* Project Cards */}
      {projectsWithStats.length === 0 ? (
        <div className="brutalist-border bg-card p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-3 block">folder_off</span>
          <h3 className="font-headline text-lg uppercase tracking-tight text-card-text mb-1">NO_PROJECTS</h3>
          <p className="font-mono text-xs uppercase text-muted-foreground tracking-widest mb-4">
            {canCreateProject ? "CREATE YOUR FIRST PROJECT TO GET STARTED" : "NO PROJECTS ASSIGNED TO YOU YET"}
          </p>
          {canCreateProject && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-2 mono-clip bg-primary text-white px-6 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              INIT_PROJECT
            </Link>
          )}
        </div>
      ) : (
        <ProjectsListClient
          projects={projectsWithStats}
          statusConfig={STATUS_CONFIG}
          priorityConfig={PRIORITY_CONFIG}
        />
      )}
    </div>
  );
}
