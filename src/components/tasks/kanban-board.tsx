"use client";

import { useState, useEffect } from "react";
import { TaskStatus, Role } from "@prisma/client";
import { TaskColumn } from "@/components/tasks/task-column";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { subscribeToProjectTasks } from "@/lib/realtime";

// ─── PERF: Lazy-load heavy modal/drawer but prefetch eagerly ────────────────
// Using dynamic() so the page renders instantly without waiting for these heavy
// components. But we prefetch them immediately on mount so they're compiled
// and ready BEFORE the user clicks.
const TaskDetailDrawer = dynamic(
  () => import("@/components/tasks/task-detail-drawer").then((m) => m.TaskDetailDrawer),
  { ssr: false }
);
const CreateTaskModal = dynamic(
  () => import("@/components/tasks/create-task-modal").then((m) => m.CreateTaskModal),
  { ssr: false }
);

// Prefetch: trigger module compilation immediately on page load
if (typeof window !== "undefined") {
  import("@/components/tasks/task-detail-drawer");
  import("@/components/tasks/create-task-modal");
}

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
    description?: string | null;
    status: TaskStatus;
    priority: any;
    dueDate: Date | null;
    revisionCount: number;
    projectId?: string;
    assignedTo: { id: string; name: string; image: string | null } | null;
    assignees?: Array<{ id: string; name: string; image: string | null }>;
    _count: { comments: number; files: number; subtasks: number };
    subtasks?: Array<{ id: string; title: string; isDone: boolean }>;
    files?: any[];
  }>;
  projectId: string;
  teamMembers: Array<{ id: string; name: string; department: string | null }>;
  canCreateTask: boolean;
  userId?: string;
  userRole?: Role;
}

export function KanbanBoard({ tasks, projectId, teamMembers, canCreateTask, userId, userRole }: KanbanBoardProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Subscribe to real-time project task updates
  useEffect(() => {
    const channel = subscribeToProjectTasks(projectId, () => {
      router.refresh();
    });

    return () => {
      channel.unsubscribe();
    };
  }, [projectId, router]);

  const selectedTask = selectedTaskId ? tasks.find((t) => t.id === selectedTaskId) : null;

  const handleCreateSuccess = (taskId: string) => {
    toast.success(
      (t) => (
        <div className="flex flex-col gap-2">
          <span className="font-headline uppercase text-sm">Task Created</span>
          <button
            onClick={() => {
              setSelectedTaskId(taskId);
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

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
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
            onTaskClick={handleTaskClick}
          />
        ))}
      </div>

      {/* Create Modal — lazy loaded but prefetched */}
      {isModalOpen && (
        <CreateTaskModal
          projectId={projectId}
          teamMembers={teamMembers}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Task Detail Drawer — lazy loaded but prefetched */}
      {selectedTask && userId && userRole && (
        <TaskDetailDrawer
          task={{
            ...selectedTask,
            description: selectedTask.description ?? null,
            projectId: selectedTask.projectId ?? projectId,
            subtasks: selectedTask.subtasks ?? [],
            files: selectedTask.files,
          }}
          userId={userId}
          userRole={userRole}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
