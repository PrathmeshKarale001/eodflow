"use client";

import { useState } from "react";
import { TaskStatus } from "@prisma/client";
import { TaskColumn } from "@/components/tasks/task-column";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";

const KANBAN_COLUMNS: TaskStatus[] = [
  TaskStatus.BACKLOG,
  TaskStatus.TODO,
  TaskStatus.IN_PROGRESS,
  TaskStatus.IN_REVIEW,
  TaskStatus.REVISION,
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
          <span className="bg-neutral-200 px-2 py-0.5 text-[10px] font-mono">{tasks.length} ITEMS</span>
        </div>

        {canCreateTask ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 mono-clip bg-[#180065] text-white px-5 py-3 font-headline text-xs uppercase shadow-[4px_4px_0px_#5847d2] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#5847d2] active:translate-y-[4px] active:shadow-none transition-all"
          >
            <span className="material-symbols-outlined text-base">add</span>
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
      />
    </div>
  );
}
