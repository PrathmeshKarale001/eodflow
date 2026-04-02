"use client";

import { Priority, TaskStatus } from "@prisma/client";

const STATUS_LABELS: Record<string, string> = {
  BACKLOG: "BACKLOG",
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  IN_REVIEW: "IN_REVIEW",
  REVISION: "REVISION",
  CLIENT_APPROVAL: "CLIENT_APPROVAL",
  CLIENT_REVISION: "CLIENT_REVISION",
  APPROVED: "APPROVED",
  DONE: "DONE",
};

const STATUS_COLORS: Record<string, string> = {
  BACKLOG: "bg-neutral-200 text-neutral-700",
  TODO: "bg-blue-100 text-blue-800",
  IN_PROGRESS: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-purple-100 text-purple-800",
  REVISION: "bg-red-100 text-red-800",
  CLIENT_APPROVAL: "bg-indigo-100 text-indigo-800",
  CLIENT_REVISION: "bg-orange-100 text-orange-800",
  APPROVED: "bg-green-100 text-green-800",
  DONE: "bg-green-200 text-green-900",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
};

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date | null;
    revisionCount: number;
    assignedTo: { id: string; name: string; image: string | null } | null;
    _count: { comments: number; files: number; subtasks: number };
  };
  onClick?: (taskId: string) => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const initials = task.assignedTo?.name
    ? task.assignedTo.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "??";

  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  const isOverdue = task.dueDate ? new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "APPROVED" : false;

  return (
    <div
      onClick={() => onClick?.(task.id)}
      className="brutalist-border bg-card p-4 cursor-pointer hover:bg-surface-container-high hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[3px_3px_0px_rgba(0,0,0,0.1)] transition-all group"
    >
      {/* Priority + Revision */}
      <div className="flex items-center justify-between mb-3">
        <span className={`inline-block px-2 py-0.5 text-[9px] font-headline uppercase tracking-widest ${PRIORITY_COLORS[task.priority]}`}>
          {task.priority}
        </span>
        {task.revisionCount > 0 ? (
          <span className="text-[9px] font-mono uppercase tracking-widest text-red-600 bg-red-500/10 px-2 py-0.5 brutalist-border border-red-200">
            REV:{task.revisionCount}
          </span>
        ) : null}
      </div>

      {/* Title */}
      <h4 className="font-headline text-sm uppercase tracking-tight leading-tight mb-3 group-hover:text-primary transition-colors">
        {task.title}
      </h4>

      {/* Footer: Assignee + Meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="w-6 h-6 bg-[#180065] text-white flex items-center justify-center text-[9px] font-headline">
            {initials}
          </div>
          <span className="font-mono text-[9px] text-muted-foreground uppercase">
            {task.assignedTo?.name || "UNASSIGNED"}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[9px] font-mono text-muted-foreground">
          {task._count.comments > 0 ? (
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">chat_bubble</span>
              {task._count.comments}
            </span>
          ) : null}
          {task._count.files > 0 ? (
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-xs">attach_file</span>
              {task._count.files}
            </span>
          ) : null}
          {dueLabel ? (
            <span className={`${isOverdue ? "text-red-600 font-bold" : ""}`}>
              {dueLabel}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
