import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { MyTasksList } from "@/components/tasks/my-tasks-list";

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const tasks = await db.task.findMany({
    where: { assignedToId: session.user.id },
    include: {
      assignedTo: { select: { id: true, name: true, image: true } },
      files: {
        select: { id: true, filename: true, fileUrl: true, mimeType: true, fileSize: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      subtasks: {
        select: { id: true, title: true, isDone: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1">
              MY_TASKS
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              ACTIVE ASSIGNMENTS // {tasks.length} ITEMS
            </p>
          </div>
          <span className="material-symbols-outlined text-[36px] text-primary">checklist</span>
        </div>
      </div>

      {/* Task List */}
      <MyTasksList tasks={tasks} userId={session.user.id} />
    </div>
  );
}
