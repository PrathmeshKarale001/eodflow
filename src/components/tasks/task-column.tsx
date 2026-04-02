"use client";

import { TaskStatus } from "@prisma/client";
import { TaskCard } from "./task-card";

const COLUMN_STYLES: Record<string, { label: string; accent: string }> = {
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
    <div className={`brutalist-border bg-[#FAFAFA] min-w-[280px] max-w-[320px] flex flex-col border-t-4 ${style.accent}`}>
      {/* Column Header */}
      <div className="p-4 brutalist-border border-t-0 border-x-0 flex items-center justify-between">
        <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
          {style.label}
        </h3>
        <span className="bg-[#180065] text-white px-2 py-0.5 text-[10px] font-mono min-w-[24px] text-center">
          {tasks.length}
        </span>
      </div>

      {/* Task List */}
      <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-280px)]">
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <span className="material-symbols-outlined text-2xl text-neutral-300 mb-2 block">inbox</span>
            <p className="font-mono text-[9px] uppercase text-muted-foreground tracking-widest">
              EMPTY_QUEUE
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
