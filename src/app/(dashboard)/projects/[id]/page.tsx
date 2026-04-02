import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getProjectWithTasks } from "@/app/actions/tasks";
import { hasPermission } from "@/lib/permissions";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { Role } from "@prisma/client";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { project, tasks, teamMembers } = await getProjectWithTasks(params.id);

  if (!project) return notFound();

  const userRole = session.user.role as Role;
  const canCreateTask = hasPermission(userRole, "createTask");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Project Header */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary text-white px-3 py-1 text-[10px] font-headline uppercase tracking-widest">
                {project.status}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                {project.client.companyName}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase">
              {project.title}
            </h1>
          </div>

          <div className="flex flex-col items-end gap-1 text-right">
            <span className="font-mono text-[9px] uppercase text-muted-foreground tracking-widest">
              PROJECT_ID // {project.id.slice(-8)}
            </span>
            {project.deadline ? (
              <span className="font-mono text-[9px] uppercase tracking-widest text-card-text">
                DEADLINE // {new Date(project.deadline).toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={tasks}
        projectId={project.id}
        teamMembers={teamMembers.map((m) => ({
          id: m.id,
          name: m.name,
          department: m.department,
        }))}
        canCreateTask={canCreateTask}
      />
    </div>
  );
}
