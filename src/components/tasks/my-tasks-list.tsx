"use client";

import { useState, startTransition, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { TaskStatus, Priority, Role } from "@prisma/client";
import { reassignTask } from "@/app/actions/tasks";
import { createClient } from "@/lib/realtime";

// ─── PERF: Lazy-load heavy modal/drawer but prefetch eagerly ────────────────
const TaskDetailDrawer = dynamic(
  () => import("./task-detail-drawer").then((m) => m.TaskDetailDrawer),
  { ssr: false }
);
const CreateTaskModal = dynamic(
  () => import("./create-task-modal").then((m) => m.CreateTaskModal),
  { ssr: false }
);

// Prefetch: trigger module compilation immediately on page load
if (typeof window !== "undefined") {
  import("./task-detail-drawer");
  import("./create-task-modal");
}

const STATUS_SECTIONS: { status: TaskStatus; label: string; accent: string }[] = [
  { status: TaskStatus.TODO, label: "TODO", accent: "border-l-blue-500" },
  { status: TaskStatus.IN_PROGRESS, label: "IN_PROGRESS", accent: "border-l-amber-500" },
  { status: TaskStatus.IN_REVIEW, label: "IN_REVIEW", accent: "border-l-purple-500" },
  { status: TaskStatus.REVISION, label: "REVISION", accent: "border-l-red-500" },
  { status: TaskStatus.APPROVED, label: "APPROVED", accent: "border-l-green-500" },
  { status: TaskStatus.DONE, label: "DONE", accent: "border-l-green-700" },
  { status: TaskStatus.BACKLOG, label: "BACKLOG", accent: "border-l-neutral-400" },
];

const PRIORITY_CHIP: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
};

interface TeamMember {
  id: string;
  name: string;
  role: string;
  department: string | null;
  image: string | null;
}

interface TaskType {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: Date | null;
  revisionCount: number;
  projectId: string | null;
  assignedById?: string | null;
  assignedTo: { id: string; name: string; image: string | null } | null;
  assignedBy?: { id: string; name: string } | null;
  project?: { id: string; title: string } | null;
  _count: { files: number };
  subtasks: Array<{ id: string; title: string; isDone: boolean }>;
}

interface MyTasksListProps {
  tasks: TaskType[];
  userId: string;
  userRole: Role;
  canAssign?: boolean;
  canCreateTask?: boolean;
  teamMembers?: TeamMember[];
  projects?: Array<{ id: string; title: string; clientId?: string | null }>;
  brands?: Array<{ id: string; companyName: string }>;
}

export function MyTasksList({
  tasks,
  userId,
  userRole,
  canAssign = false,
  canCreateTask = false,
  teamMembers = [],
  projects = [],
  brands = [],
}: MyTasksListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Sync action=new-task from other pages to open the modal instantly
  useEffect(() => {
    if (searchParams.get("action") === "new-task") {
      setIsCreateModalOpen(true);
      // clean up URL to avoid reopening on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("action");
      router.replace(`/tasks?${params.toString()}`);
    }
  }, [searchParams, router]);
  
  useEffect(() => {
    const urlTaskId = searchParams.get("taskId");
    if (urlTaskId && !selectedTaskId) {
      setSelectedTaskId(urlTaskId);
      // clean up URL to avoid reopening on refresh
      const params = new URLSearchParams(searchParams.toString());
      params.delete("taskId");
      router.replace(`/tasks?${params.toString()}`);
    }
  }, [searchParams, selectedTaskId, router]);

  // Subscribe to real-time task notifications for automatic UI refresh
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("task-notifications-refresh")
      .on("broadcast", { event: "task-event" }, () => {
        startTransition(() => {
          router.refresh();
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

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

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || null;

  const grouped = STATUS_SECTIONS.map((section) => ({
    ...section,
    tasks: tasks.filter((t) => t.status === section.status),
  })).filter((section) => section.tasks.length > 0);

  const handleReassign = (taskId: string, newAssigneeId: string) => {
    setReassigning(true);
    startTransition(async () => {
      try {
        await reassignTask(taskId, newAssigneeId);
        setAssigningTaskId(null);
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to reassign task.", { duration: 5000 });
      } finally {
        setReassigning(false);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text leading-none">
              {canAssign ? "ALL_TASKS" : "MY_TASKS"}
            </h1>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-on-surface/50">
              {canAssign ? "MANAGE & ASSIGN" : "ACTIVE ASSIGNMENTS"} // {tasks.length} ITEMS
            </p>
          </div>
          <div className="flex items-center gap-3">
            {canCreateTask && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mono-clip bg-primary-container text-white px-5 py-2.5 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                NEW_TASK
              </button>
            )}
            <span className="material-symbols-outlined text-[36px] text-primary">checklist</span>
          </div>
        </div>
      </div>

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
                  <div key={task.id}>
                    <div
                      onClick={() => setSelectedTaskId(task.id)}
                      className="px-4 py-4 md:px-5 md:py-3 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors group gap-3"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className={`inline-block px-1.5 py-0.5 text-[8px] font-headline uppercase ${PRIORITY_CHIP[task.priority]} flex-shrink-0 mt-1 sm:mt-0`}>
                          {task.priority[0]}
                        </span>
                        <div className="min-w-0">
                          <span className="font-headline text-sm uppercase tracking-tight truncate group-hover:text-primary transition-colors block leading-tight">
                            {task.title}
                          </span>
                          {/* Show project name and assignee for Admin/Super Admin */}
                          {canAssign && (
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                              {task.project && (
                                <span className="font-mono text-[8px] uppercase text-on-surface/40 tracking-widest">
                                  {task.project?.title || "No Project"}
                                </span>
                              )}
                              {task.assignedTo && (
                                <span className="font-mono text-[8px] uppercase text-primary/60 tracking-widest">
                                  → {task.assignedTo.name}
                                </span>
                              )}
                              {task.assignedBy && (
                                <span className="font-mono text-[8px] uppercase text-on-surface/30 tracking-widest">
                                  BY {task.assignedBy.name}
                                </span>
                              )}
                              {!task.assignedTo && (
                                <span className="font-mono text-[8px] uppercase text-error/60 tracking-widest">
                                  UNASSIGNED
                                </span>
                              )}
                            </div>
                          )}
                          {/* For non-admins: show who assigned this task */}
                          {!canAssign && task.assignedBy && task.assignedBy.id !== userId && (
                            <div className="flex items-center gap-1 mt-1">
                              <span className="font-mono text-[8px] uppercase text-on-surface/40 tracking-widest">
                                BY {task.assignedBy.name}
                              </span>
                              {task.project && (
                                <span className="font-mono text-[8px] uppercase text-on-surface/30 tracking-widest">
                                  • {task.project.title}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {task.revisionCount > 0 ? (
                          <span className="text-[8px] font-mono text-red-600 bg-red-500/10 px-1.5 py-0.5 brutalist-border border-red-200 flex-shrink-0">
                            R{task.revisionCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-4 text-[9px] font-mono text-muted-foreground uppercase flex-shrink-0">
                        <div className="flex items-center gap-3">
                          {task._count.files > 0 ? (
                            <span className="flex items-center gap-0.5">
                              <span className="material-symbols-outlined text-xs">attach_file</span>
                              {task._count.files}
                            </span>
                          ) : null}
                          {dueLabel ? (
                            <span className={isOverdue ? "text-red-600 font-bold" : ""}>{dueLabel}</span>
                          ) : null}
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Assign button for Admin/Super Admin */}
                          {canAssign && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setAssigningTaskId(assigningTaskId === task.id ? null : task.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-2 sm:px-2 sm:py-1 brutalist-border text-[9px] sm:text-[8px] hover:bg-primary/10 hover:text-primary transition-colors bg-card sm:bg-transparent"
                              title="Assign task"
                            >
                              <span className="material-symbols-outlined text-xs">person_add</span>
                              <span className="sm:inline">ASSIGN</span>
                            </button>
                          )}
                          <span className="material-symbols-outlined text-sm text-neutral-400 group-hover:text-primary transition-colors">
                            chevron_right
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Inline Assignment Dropdown — Multi-select for managers */}
                    {canAssign && assigningTaskId === task.id && (
                      <div className="px-4 md:px-5 pb-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="brutalist-border bg-surface-container-lowest p-4 md:p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-headline text-[9px] uppercase tracking-widest text-on-surface/60">
                              ASSIGN_TO → {selectedAssignees.length > 0 && (
                                <span className="text-primary">{selectedAssignees.length} SELECTED</span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              {selectedAssignees.length > 0 && (
                                <button
                                  onClick={() => {
                                    // Assign primary (first) + fire off all at once
                                    const primary = selectedAssignees[0];
                                    handleReassign(task.id, primary);
                                    // Assign additional co-assignees
                                    selectedAssignees.slice(1).forEach((id) => {
                                      reassignTask(task.id, id).catch(() => {});
                                    });
                                    setSelectedAssignees([]);
                                  }}
                                  disabled={reassigning}
                                  className="flex items-center gap-1 px-3 py-1 bg-primary text-on-primary font-headline text-[8px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-xs">check</span>
                                  CONFIRM
                                </button>
                              )}
                              <button
                                onClick={() => { setAssigningTaskId(null); setSelectedAssignees([]); }}
                                className="material-symbols-outlined text-xs text-on-surface/40 hover:text-error p-1"
                              >
                                close
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 sm:max-h-40 overflow-y-auto pr-1">
                            {teamMembers.map((member) => {
                              const isSelected = selectedAssignees.includes(member.id);
                              const isCurrent = member.id === task.assignedTo?.id;
                              return (
                                <button
                                  key={member.id}
                                  disabled={reassigning}
                                  onClick={() => {
                                    if (isCurrent) return;
                                    setSelectedAssignees((prev) =>
                                      prev.includes(member.id)
                                        ? prev.filter((id) => id !== member.id)
                                        : [...prev, member.id]
                                    );
                                  }}
                                  className={`flex items-center gap-2 px-3 py-2 brutalist-border text-left transition-colors ${
                                    isCurrent
                                      ? "bg-primary/10 border-primary/30 opacity-60 cursor-default"
                                      : isSelected
                                      ? "bg-primary/20 border-primary/50 ring-1 ring-primary/30"
                                      : "hover:bg-primary/10 hover:border-primary/30"
                                  }`}
                                >
                                  <div className={`h-6 w-6 flex items-center justify-center text-[9px] font-headline font-bold uppercase flex-shrink-0 ${
                                    isSelected ? "bg-primary text-on-primary" : "bg-surface-container-high"
                                  }`}>
                                    {isSelected ? "✓" : member.name.charAt(0)}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-headline text-[10px] uppercase tracking-wider truncate text-on-surface">
                                      {member.name}
                                    </p>
                                    <p className="font-mono text-[7px] uppercase text-on-surface/40">
                                      {member.role} · {member.department || "—"}
                                    </p>
                                  </div>
                                  {isCurrent && (
                                    <span className="material-symbols-outlined text-xs text-primary ml-auto flex-shrink-0">check</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          {reassigning && (
                            <div className="flex items-center gap-2 text-primary">
                              <span className="material-symbols-outlined text-xs animate-spin">progress_activity</span>
                              <span className="font-mono text-[9px] uppercase tracking-widest">REASSIGNING...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
          userRole={userRole}
          isOpen={!!selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          teamMembers={teamMembers}
        />
      ) : null}

      {/* Global Create Task Modal */}
      {isCreateModalOpen && (
        <CreateTaskModal
          projects={projects}
          brands={brands}
          teamMembers={teamMembers}
          isOpen={isCreateModalOpen}
          onClose={closeCreateModal}
          onSuccess={handleCreateSuccess}
        />
      )}
      </div>
    </div>
  );
}
