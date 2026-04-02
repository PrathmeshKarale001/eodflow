"use client";

import { useState } from "react";
import { TaskStatus, Priority } from "@prisma/client";
import { TaskDetailDrawer } from "./task-detail-drawer";

const STATUS_SECTIONS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: TaskStatus.TODO, label: "TODO", accent: "border-l-blue-500" },
  { status: TaskStatus.IN_PROGRESS, label: "IN_PROGRESS", accent: "border-l-amber-500" },
  { status: TaskStatus.IN_REVIEW, label: "IN_REVIEW", accent: "border-l-purple-500" },
  { status: TaskStatus.REVISION, label: "REVISION", accent: "border-l-red-500" },
  { status: TaskStatus.CLIENT_REVISION, label: "CLIENT_REVISION", accent: "border-l-orange-500" },
  { status: TaskStatus.DONE, label: "DONE", accent: "border-l-green-700" },
  { status: TaskStatus.APPROVED, label: "APPROVED", accent: "border-l-green-500" },
];

const PRIORITY_CHIP: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
};

interface TaskType {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  revisionCount: number;
  projectId: string;
  assignedTo: { id: string; name: string; image: string | null } | null;
  files: Array<{ id: string; filename: string; fileUrl: string; mimeType: string; fileSize: number; createdAt: Date }>;
  subtasks: Array<{ id: string; title: string; isDone: boolean }>;
}

interface MyTasksListProps {
  tasks: TaskType[];
  userId: string;
}

export function MyTasksList({ tasks, userId }: MyTasksListProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const grouped = STATUS_SECTIONS.map((section) => ({
    ...section,
    tasks: tasks.filter((t) => t.status === section.status),
  })).filter((section) => section.tasks.length > 0);

  return (
    <div className="space-y-6">
      {grouped.length === 0 ? (
        <div className="brutalist-border bg-card p-12 text-center">
          <span className="material-symbols-outlined text-4xl text-neutral-300 mb-3 block">task_alt</span>
          <h3 className="font-headline text-lg uppercase tracking-tight text-card-text mb-1">NO_TASKS_ASSIGNED</h3>
          <p className="font-mono text-xs uppercase text-muted-foreground tracking-widest">
            ALL QUEUES ARE CLEAR
          </p>
        </div>
      ) : (
        grouped.map((section) => (
          <div key={section.status} className={`brutalist-border bg-card border-l-4 ${section.accent}`}>
            {/* Section Header */}
            <div className="px-5 py-3 border-b border-neutral-200 flex items-center justify-between">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
                {section.label}
              </h3>
              <span className="bg-[#180065] text-white px-2 py-0.5 text-[10px] font-mono min-w-[24px] text-center">
                {section.tasks.length}
              </span>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-outline-variant/30">
              {section.tasks.map((task) => {
                const dueLabel = task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : null;
                const isOverdue = task.dueDate
                  ? new Date(task.dueDate) < new Date() && task.status !== "DONE" && task.status !== "APPROVED"
                  : false;

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`inline-block px-1.5 py-0.5 text-[8px] font-headline uppercase ${PRIORITY_CHIP[task.priority]} flex-shrink-0`}>
                        {task.priority[0]}
                      </span>
                      <span className="font-headline text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                        {task.title}
                      </span>
                      {task.revisionCount > 0 ? (
                        <span className="text-[8px] font-mono text-red-600 bg-red-500/10 px-1.5 py-0.5 brutalist-border border-red-200 flex-shrink-0">
                          R{task.revisionCount}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-mono text-muted-foreground uppercase flex-shrink-0">
                      {task.files.length > 0 ? (
                        <span className="flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-xs">attach_file</span>
                          {task.files.length}
                        </span>
                      ) : null}
                      {dueLabel ? (
                        <span className={isOverdue ? "text-red-600 font-bold" : ""}>{dueLabel}</span>
                      ) : null}
                      <span className="material-symbols-outlined text-sm text-neutral-400 group-hover:text-primary transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* Task Detail Drawer */}
      {selectedTask ? (
        <TaskDetailDrawer
          task={selectedTask}
          userId={userId}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      ) : null}
    </div>
  );
}
