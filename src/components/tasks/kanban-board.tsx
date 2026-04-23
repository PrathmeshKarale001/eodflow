"use client";

import { useState } from "react";
import { TaskStatus } from "@prisma/client";
import { TaskColumn } from "@/components/tasks/task-column";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

// ─── PERF: Lazy-load modal (only shown on button click) ─────────────────────
const CreateTaskModal = dynamic(
  () => import("@/components/tasks/create-task-modal").then((m) => m.CreateTaskModal),
  { ssr: false }
);

const KANBAN_COLUMNS: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.REVISION,
  TaskStatus.CLIENT_REVISION,
  TaskStatus.CLIENT_APPROVAL,
  TaskStatus.APPROVED,
  TaskStatus.DONE,
];

interface KanbanBoardProps {
  tasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    priority: any;
    dueDate: Date | null;
    revisionCount: number;
    assignedTo: { id: string; name: string; image: string | null } | null;
    _count: { comments: number; files: number; subtasks: number };
  }>;
  projectId: string;
  teamMembers: Array<{ id: string; name: string; department: string | null }>;
  canCreateTask: boolean;
}

export function KanbanBoard({ tasks, projectId, teamMembers, canCreateTask }: KanbanBoardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleCreateSuccess = (taskId: string) => {
    toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <span className="font-headline uppercase text-sm">Task Created</span>
          <button
            onClick={() => {
              router.push(`/tasks?taskId=${taskId}`);
              toast.dismiss(t.id);
            }}
            className="text-xs font-mono uppercase bg-on-surface text-surface px-3 py-1.5 hover:opacity-80 transition-opacity"
          >
            VIEW_TASK
          </button>
        </div>
      ),
      { duration: 5000 }
    );
  };

  const groupedTasks = KANBAN_COLUMNS.reduce(
    (acc, status) => {
      acc[status] = tasks.filter((t) => t.status === status);
      return acc;
    },
    {} as Record<TaskStatus, typeof tasks>
  );

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-xl">view_kanban</span>
          <h2 className="font-headline text-lg uppercase tracking-tight">TASK_BOARD</h2>
          <span className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[9px] font-mono uppercase tracking-widest">{tasks.length} ITEMS</span>
        </div>

        {canCreateTask ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 mono-clip bg-[#5847d2] text-white px-4 py-2 font-headline text-[10px] uppercase shadow-[4px_4px_0px_#180065] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0px_#180065] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            CREATE_TASK
          </button>
        ) : null}
      </div>

      {/* Kanban Columns */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {KANBAN_COLUMNS.map((status) => (
          <TaskColumn
            key={status}
            status={status}
            tasks={groupedTasks[status] || []}
          />
        ))}
      </div>

      {/* Create Modal */}
      <CreateTaskModal
        projectId={projectId}
        teamMembers={teamMembers}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
