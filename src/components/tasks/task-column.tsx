"use client";

import { TaskStatus } from "@prisma/client";
import { TaskCard } from "./task-card";

const COLUMN_STYLES: Record<string, { label: string; accent: string }> = {
  PENDING_APPROVAL: { label: "PENDING_APPROVAL", accent: "border-t-amber-400" },
  BACKLOG: { label: "BACKLOG", accent: "border-t-neutral-400" },
  TODO: { label: "TODO", accent: "border-t-blue-500" },
  IN_PROGRESS: { label: "IN_PROGRESS", accent: "border-t-amber-500" },
  IN_REVIEW: { label: "IN_REVIEW", accent: "border-t-purple-500" },
  REVISION: { label: "REVISION", accent: "border-t-red-500" },
  CLIENT_APPROVAL: { label: "CLIENT_APPROVAL", accent: "border-t-indigo-500" },
  CLIENT_REVISION: { label: "CLIENT_REVISION", accent: "border-t-orange-500" },
  APPROVED: { label: "APPROVED", accent: "border-t-green-500" },
  DONE: { label: "DONE", accent: "border-t-green-700" },
};

interface TaskColumnProps {
  status: TaskStatus;
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
  onTaskClick?: (taskId: string) => void;
}

export function TaskColumn({ status, tasks, onTaskClick }: TaskColumnProps) {
  const style = COLUMN_STYLES[status] || { label: status, accent: "border-t-neutral-400" };

  return (
    <div className={`brutalist-border bg-surface-container-low min-w-[280px] max-w-[320px] flex flex-col border-t-2 ${style.accent}`}>
      {/* Column Header */}
      <div className="p-3 brutalist-border border-t-0 border-x-0 flex items-center justify-between bg-surface-container-high/50">
        <h3 className="font-headline text-[10px] uppercase tracking-[0.2em] text-on-surface/60">
          {style.label}
        </h3>
        <span className="bg-primary/20 text-primary px-2 py-0.5 text-[11px] font-mono min-w-[20px] text-center border border-primary/30">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto min-h-0">
        {tasks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center opacity-20">
            <span className="material-symbols-outlined text-3xl mb-2">dashboard_customize</span>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em]">
              NO_TASKS_IN_QUEUE
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onClick={onTaskClick} />
          ))
        )}
      </div>
    </div>
  );
}
