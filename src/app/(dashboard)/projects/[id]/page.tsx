import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectWithTasks } from "@/app/actions/tasks";
import { hasPermission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { ProjectActions } from "@/components/projects/project-actions";
import { Role } from "@prisma/client";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { project, tasks, teamMembers } = await getProjectWithTasks(id);

  if (!project) return notFound();

  const userRole = session.user.role as Role;
  const canCreateTask = hasPermission(userRole, "createTask") || userRole === Role.EMPLOYEE;

  // All team members available (admins assign to anyone, employees self-assign via UI)
  const filteredTeamMembers = teamMembers;

  // Managers are any ADMIN or SUPER_ADMIN user
  const managers = teamMembers
    .filter((m) => m.role === "SUPER_ADMIN" || m.role === "ADMIN")
    .map((m) => ({ id: m.id, name: m.name }));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Project Header */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary text-white px-3 py-1 text-[10px] font-headline uppercase tracking-widest">
                {project.status}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {project.client.companyName}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-headline tracking-tighter uppercase leading-none">
              {project.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <span className="font-mono text-[9px] uppercase text-muted-foreground tracking-widest block">
                PROJECT_ID // {project.id.slice(-8)}
              </span>
              {project.deadline ? (
                <span className="font-mono text-[9px] uppercase tracking-widest text-card-text block">
                  DEADLINE // {new Date(project.deadline).toLocaleDateString()}
                </span>
              ) : null}
            </div>
            <ProjectActions
              project={{
                id: project.id,
                title: project.title,
                priority: project.priority,
                status: project.status,
                deadline: project.deadline,
                briefObjective: project.briefObjective ?? null,
                briefDeliverables: project.briefDeliverables ?? null,
                assignedManagerId: project.assignedManagerId ?? null,
              }}
              managers={managers}
              userRole={userRole}
            />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        projectId={project.id}
        teamMembers={filteredTeamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          department: m.department,
        }))}
        canCreateTask={canCreateTask}
      />
    </div>
  );
}
