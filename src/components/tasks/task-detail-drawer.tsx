"use client";

import { useState, useCallback, useEffect, startTransition } from "react";
import { getTaskFiles } from "@/app/actions/tasks";
import { TaskStatus, Priority } from "@prisma/client";
import { submitForReview, createTaskFileRecord } from "@/app/actions/task-submissions";
import { updateTaskStatus, deleteTask, markTaskDone } from "@/app/actions/tasks";
import { uploadFile } from "@/lib/storage-client";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import dynamic from "next/dynamic";

// ─── PERF: Lazy-load tab content and edit modal ────────────────────────────
// CommentThread and TimeLogger are only shown when their tab is active.
// EditTaskModal is only shown on click. Lazy-loading saves ~35KB.
const CommentThread = dynamic(
  () => import("@/components/comments/comment-thread").then((m) => m.CommentThread),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-3 animate-pulse">
        <div className="h-4 bg-surface-container-high w-1/3" />
        <div className="h-20 bg-surface-container-high w-full" />
      </div>
    ),
  }
);
const TimeLogger = dynamic(
  () => import("@/components/time/time-logger").then((m) => m.TimeLogger),
  {
    ssr: false,
    loading: () => (
      <div className="p-6 space-y-3 animate-pulse">
        <div className="h-4 bg-surface-container-high w-1/4" />
        <div className="h-16 bg-surface-container-high w-full" />
      </div>
    ),
  }
);
const EditTaskModal = dynamic(
  () => import("./edit-task-modal").then((m) => m.EditTaskModal),
  { ssr: false }
);

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-error text-white",
  HIGH: "bg-tertiary text-black",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-surface-container-highest text-outline",
};

interface TaskDetailDrawerProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: Priority;
    dueDate: Date | null;
    revisionCount: number;
    projectId: string;
    assignedTo: { id: string; name: string } | null;
    files?: Array<{ id: string; filename: string; fileUrl: string; mimeType: string; fileSize: number; createdAt: Date }>;
    subtasks: Array<{ id: string; title: string; isDone: boolean }>;
  };
  userId: string;
  userRole: Role;
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
}

type TabId = "details" | "comments" | "time";

export function TaskDetailDrawer({ task, userId, userRole, isOpen, onClose, teamMembers = [] }: TaskDetailDrawerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [files, setFiles] = useState(task.files ?? []);
  const [isLoadingFiles, setIsLoadingFiles] = useState(!task.files);

  // ─── PERF: Load files on-demand when drawer opens ──────────────────────────
  useEffect(() => {
    if (isOpen && !task.files) {
      setIsLoadingFiles(true);
      getTaskFiles(task.id).then((data) => {
        setFiles(data);
        setIsLoadingFiles(false);
      }).catch(() => setIsLoadingFiles(false));
    } else if (task.files) {
      setFiles(task.files);
    }
  }, [isOpen, task.id, task.files]);

  const isAssignee = task.assignedTo?.id === userId;
  const canSubmit = isAssignee && (
    task.status === TaskStatus.IN_PROGRESS || 
    task.status === TaskStatus.REVISION || 
    task.status === TaskStatus.CLIENT_REVISION
  );
  const canStartWork = isAssignee && task.status === TaskStatus.TODO;

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;
    await handleUploadFiles(files);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.id, userId]);

  const handleUploadFiles = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        const { url } = await uploadFile(file, `tasks/${task.id}`);
        await createTaskFileRecord({
          taskId: task.id,
          uploadedById: userId,
          filename: file.name,
          originalName: file.name,
          fileUrl: url,
          mimeType: file.type,
          fileSize: file.size,
        });
      }
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Upload failed.", { duration: 5000 });
    } finally {
      setIsUploading(false);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await handleUploadFiles(Array.from(e.target.files));
  };

  const handleSubmitForReview = () => {
    setIsSubmitting(true);
    startTransition(async () => {
      try {
        await submitForReview(task.id);
        onClose();
      } catch (error: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(error?.message || "Failed to submit for review.", { duration: 5000 });
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleStartWork = () => {
    startTransition(async () => {
      try {
        await updateTaskStatus({ taskId: task.id, status: TaskStatus.IN_PROGRESS });
        onClose();
      } catch (error: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(error?.message || "Failed to start work.", { duration: 5000 });
      }
    });
  };

  const handleMarkDone = async () => {
    if (!confirm("Is this task finalized? This will notify management.")) return;
    setIsMarkingDone(true);
    try {
      await markTaskDone(task.id);
      onClose();
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to mark done.", { duration: 5000 });
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm("Are you sure you want to delete this task? This action cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await deleteTask(task.id);
      onClose();
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to delete task.", { duration: 5000 });
    } finally {
      setIsDeleting(false);
    }
  };

  const canManage = hasPermission(userRole, "editAnyTask") || (isAssignee && hasPermission(userRole, "editOwnTask"));
  const canDelete = hasPermission(userRole, "deleteTask");
  const canMarkStatusDone = task.status !== TaskStatus.DONE;

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "details", label: "DETAILS", icon: "description" },
    { id: "comments", label: "COMMENTS", icon: "forum" },
    { id: "time", label: "TIME", icon: "timer" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-background border-l-2 brutalist-border shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-surface-container-lowest border-b border-on-surface/10 relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
          <div className="relative z-10 flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`px-1.5 py-0.5 text-[8px] sm:text-[9px] font-headline uppercase ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-headline uppercase bg-card/10 text-foreground">
                  {task.status.replace(/_/g, " ")}
                </span>
                {task.revisionCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[8px] sm:text-[9px] font-headline uppercase bg-error text-white">REV:{task.revisionCount}</span>
                ) : null}
              </div>
              <div className="flex items-center gap-1.5">
                {canManage && (
                  <button
                    onClick={() => setIsEditModalOpen(true)}
                    className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-primary transition-colors"
                    title="Edit Task"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDeleteTask}
                    disabled={isDeleting}
                    className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-error transition-colors disabled:opacity-50"
                    title="Delete Task"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isDeleting ? "progress_activity" : "delete"}
                    </span>
                  </button>
                )}
                <button 
                  onClick={onClose} 
                  className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-error transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>
            </div>
            
            <div>
              <h2 className="font-headline text-lg sm:text-xl uppercase tracking-tight text-foreground leading-tight">{task.title}</h2>
              {task.assignedTo && (
                <p className="font-label text-[9px] text-outline uppercase tracking-widest mt-1.5">
                  ASSIGNED → <span className="text-primary font-bold">{task.assignedTo.name}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-on-surface/10 flex-shrink-0 bg-card-muted/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-3 font-label text-[9px] sm:text-[10px] uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-b-primary bg-primary/5 font-bold"
                  : "text-outline hover:text-foreground hover:bg-card/5"
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-[8px]">{tab.label.slice(0, 3)}</span>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="brutalist-border p-3 bg-surface-container-lowest">
                  <span className="font-label text-[8px] sm:text-[9px] text-outline uppercase tracking-widest block mb-1">DUE_DATE</span>
                  <span className="font-headline text-xs sm:text-sm text-foreground uppercase whitespace-nowrap">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "NOT_SET"}
                  </span>
                </div>
                <div className="brutalist-border p-3 bg-surface-container-lowest">
                  <span className="font-label text-[8px] sm:text-[9px] text-outline uppercase tracking-widest block mb-1">PROGRESS</span>
                  <span className="font-headline text-xs sm:text-sm text-foreground">
                    {task.subtasks.filter(s => s.isDone).length}/{task.subtasks.length} DONE
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description ? (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <h3 className="font-label text-[9px] uppercase tracking-widest text-outline mb-2.5">DESCRIPTION</h3>
                  <p className="font-body text-sm text-foreground/80 leading-relaxed border-l-3 border-primary pl-4 py-1">{task.description}</p>
                </div>
              ) : null}

              {/* Subtasks */}
              {task.subtasks.length > 0 ? (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <h3 className="font-label text-[9px] uppercase tracking-widest text-outline mb-3">
                    SUBTASKS CHECKLIST
                  </h3>
                  <ul className="space-y-2">
                    {task.subtasks.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-3 font-label text-[10px] sm:text-[11px] uppercase tracking-wide group">
                        <span className={`w-5 h-5 brutalist-border flex items-center justify-center text-[10px] transition-colors ${sub.isDone ? "bg-primary text-white border-primary" : "bg-card hover:border-primary"}`}>
                          {sub.isDone ? "✓" : ""}
                        </span>
                        <span className={sub.isDone ? "line-through text-outline/50" : "text-foreground group-hover:text-primary transition-colors"}>{sub.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Deliverables Upload */}
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <h3 className="font-label text-[9px] uppercase tracking-widest text-outline mb-3">FILE_DELIVERABLES</h3>
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`brutalist-border border-dashed p-6 sm:p-8 flex flex-col items-center justify-center text-center transition-all relative cursor-pointer
                    ${isDragging ? "bg-primary/10 border-primary" : "bg-surface-container-lowest hover:bg-surface-container-low"}
                  `}
                >
                  <input type="file" multiple onChange={handleManualUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <span className="material-symbols-outlined text-3xl mb-2.5 text-primary">
                    {isUploading ? "progress_activity" : "cloud_upload"}
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-outline px-4">
                    {isUploading ? "TRANSMITTING_DATA..." : "TAP_OR_DROP_FILES"}
                  </span>
                </div>

                {/* File List */}
                {isLoadingFiles ? (
                  <div className="mt-4 p-4 text-center">
                    <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    <p className="font-label text-[9px] text-outline uppercase tracking-widest mt-2">LOADING_FILES...</p>
                  </div>
                ) : files.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 brutalist-border bg-surface-container-lowest">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span className="material-symbols-outlined text-lg text-primary flex-shrink-0">
                            {file.mimeType.includes("image") ? "image" : "description"}
                          </span>
                          <span className="truncate font-label text-[10px] uppercase tracking-wide text-foreground">
                            {file.filename}
                          </span>
                        </div>
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="flex h-8 w-8 items-center justify-center text-outline hover:text-primary transition-colors ml-2">
                          <span className="material-symbols-outlined text-lg">download</span>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === "comments" && (
            <div className="p-4 sm:p-6 h-full flex flex-col">
              <CommentThread taskId={task.id} currentUserId={userId} initialComments={[]} />
            </div>
          )}

          {/* Time Tab */}
          {activeTab === "time" && (
            <div className="p-4 sm:p-6">
              <TimeLogger taskId={task.id} userId={userId} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t-2 border-on-surface/10 bg-surface-container-lowest flex-shrink-0 flex flex-col gap-3">
          {canStartWork ? (
            <button
              onClick={handleStartWork}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30 px-6 py-4 font-headline text-sm uppercase shadow-[4px_4px_0px_#008000] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#008000] transition-all"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              INITIALIZE_WORK
            </button>
          ) : null}

          {canSubmit ? (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-[#180065] text-white px-6 py-4 font-headline text-sm uppercase shadow-[4px_4px_0px_#5847d2] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#5847d2] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">send</span>
              {isSubmitting ? "TRANSMITTING..." : "SUBMIT_FOR_REVIEW"}
            </button>
          ) : null}

          {canMarkStatusDone ? (
            <button
              onClick={handleMarkDone}
              disabled={isMarkingDone}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-success text-white px-6 py-4 font-headline text-sm uppercase shadow-[4px_4px_0px_#15803d] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#15803d] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">check_circle</span>
              {isMarkingDone ? "MARKING..." : "MARK_AS_FINAL"}
            </button>
          ) : null}
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <EditTaskModal
            task={{ ...task, assignedToId: task.assignedTo?.id || null }}
            teamMembers={teamMembers}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              onClose(); // Close drawer after edit to refresh data reliably
            }}
          />
        )}
      </div>
    </div>
  );
}
