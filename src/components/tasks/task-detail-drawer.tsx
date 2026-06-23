"use client";

import { useState, useCallback, useEffect } from "react";
import { getTaskFiles, getTaskActivities } from "@/app/actions/tasks";
import { TaskStatus, Priority } from "@prisma/client";
import { createTaskFileRecord } from "@/app/actions/task-submissions";
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { deleteFile, uploadNewVersion } from "@/app/actions/files";
import { uploadFile } from "@/lib/storage-client";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { reassignTask } from "@/app/actions/tasks";
import { toggleSubtask } from "@/app/actions/subtasks";
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

// ─── Status transition config for action buttons ─────────────────────────────
// Employee flow:  TODO → IN_PROGRESS → IN_REVIEW (notifies manager)
// Manager flow:   IN_REVIEW → DONE (approved) or REVISION
// After REVISION: Employee reworks → IN_PROGRESS → IN_REVIEW again
// PENDING_APPROVAL: Employee created task claiming manager assigned → manager approves → TODO
const STATUS_ACTIONS: Record<TaskStatus, Array<{
  targetStatus: TaskStatus;
  label: string;
  icon: string;
  color: string; // tailwind classes
  roles: Role[]; // who can perform this action
}>> = {
  [TaskStatus.PENDING_APPROVAL]: [
    { targetStatus: TaskStatus.TODO, label: "APPROVE_TASK", icon: "check_circle", color: "bg-green-600 text-white shadow-[4px_4px_0px_#14532d]", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  ],
  [TaskStatus.BACKLOG]: [
    { targetStatus: TaskStatus.TODO, label: "MOVE_TO_TODO", icon: "playlist_add", color: "bg-blue-600 text-white shadow-[4px_4px_0px_#1e3a5f]", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  ],
  [TaskStatus.TODO]: [
    { targetStatus: TaskStatus.IN_PROGRESS, label: "START_WORK", icon: "play_arrow", color: "bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30 shadow-[4px_4px_0px_#008000]", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  ],
  [TaskStatus.IN_PROGRESS]: [
    { targetStatus: TaskStatus.IN_REVIEW, label: "SUBMIT_FOR_REVIEW", icon: "send", color: "bg-[#180065] text-white shadow-[4px_4px_0px_#5847d2]", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  ],
  [TaskStatus.IN_REVIEW]: [
    // Manager actions: approve directly (→ DONE) or send back for revision
    { targetStatus: TaskStatus.DONE, label: "APPROVE", icon: "check_circle", color: "bg-green-600 text-white shadow-[4px_4px_0px_#14532d]", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
    { targetStatus: TaskStatus.REVISION, label: "SEND_TO_REVISION", icon: "undo", color: "bg-red-600 text-white shadow-[4px_4px_0px_#7f1d1d]", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  ],
  [TaskStatus.REVISION]: [
    // Employee reworks and restarts
    { targetStatus: TaskStatus.IN_PROGRESS, label: "REWORK_STARTED", icon: "play_arrow", color: "bg-[#00FF41]/20 text-[#00FF41] border border-[#00FF41]/30 shadow-[4px_4px_0px_#008000]", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  ],
  [TaskStatus.CLIENT_APPROVAL]: [],
  [TaskStatus.CLIENT_REVISION]: [],
  [TaskStatus.APPROVED]: [
    // Legacy: finalize tasks that were already in APPROVED state before the merge
    { targetStatus: TaskStatus.DONE, label: "FINALIZE_TASK", icon: "task_alt", color: "bg-success text-white shadow-[4px_4px_0px_#15803d]", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  ],
  [TaskStatus.DONE]: [],
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
    projectId: string | null;
    assignedById?: string | null;
    assignedTo: { id: string; name: string } | null;
    assignedBy?: { id: string; name: string } | null;
    assignees?: Array<{ id: string; name: string; image?: string | null }> | null;
    files?: Array<{
      id: string;
      filename: string;
      fileUrl: string;
      mimeType: string;
      fileSize: number;
      createdAt: Date;
      uploadedById?: string;
      uploadedBy?: { name: string } | null;
      version?: number;
      parentFileId?: string | null;
    }>;
    subtasks: Array<{ id: string; title: string; isDone: boolean }>;
  };
  userId: string;
  userRole: Role;
  isOpen: boolean;
  onClose: () => void;
  teamMembers?: Array<{ id: string; name: string; department: string | null }>;
}

type TabId = "details" | "comments" | "activity";

export function TaskDetailDrawer({ task, userId, userRole, isOpen, onClose, teamMembers = [] }: TaskDetailDrawerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");
  const [files, setFiles] = useState<any[]>(task.files ?? []);
  const [isLoadingFiles, setIsLoadingFiles] = useState(!task.files);
  const [upgradingFileId, setUpgradingFileId] = useState<string | null>(null);
  const [isUpgradingVersion, setIsUpgradingVersion] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Record<string, boolean>>({});
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [isSelfAssigning, setIsSelfAssigning] = useState(false);
  const [localSubtasks, setLocalSubtasks] = useState(task.subtasks);

  const [activities, setActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);
  const [prevPriority, setPrevPriority] = useState(task.priority);
  const [flashPriority, setFlashPriority] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  // Monitor priority changes for highlight animation
  useEffect(() => {
    if (task.priority !== prevPriority) {
      setFlashPriority(true);
      setPrevPriority(task.priority);
      const timer = setTimeout(() => setFlashPriority(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [task.priority, prevPriority]);

  // Load activities on-demand when activeTab changes to activity
  useEffect(() => {
    if (isOpen && activeTab === "activity") {
      setIsLoadingActivities(true);
      getTaskActivities(task.id)
        .then((data) => setActivities(data))
        .catch(() => {})
        .finally(() => setIsLoadingActivities(false));
    }
  }, [isOpen, activeTab, task.id]);

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

  const handleDeleteFile = useCallback(async (fileId: string) => {
    if (!confirm("Are you sure you want to permanently delete this file?")) return;
    try {
      await deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      const { toast } = await import("react-hot-toast");
      toast.success("File deleted successfully.");
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to delete file.");
    }
  }, []);

  const handleUpgradeVersion = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const parentFileId = upgradingFileId;
    const fileInput = e.target.files?.[0];
    if (!parentFileId || !fileInput) return;

    setIsUpgradingVersion(true);
    try {
      const pathPrefix = `tasks/${task.id}/revisions/${userId}`;
      const { url } = await uploadFile(fileInput, pathPrefix, (percent) => setUploadProgress(percent));

      const newVersion = await uploadNewVersion({
        parentFileId,
        filename: fileInput.name,
        originalName: fileInput.name,
        fileUrl: url,
        mimeType: fileInput.type,
        fileSize: fileInput.size,
      });

      const newFileItem = {
        id: newVersion.id,
        filename: newVersion.filename,
        originalName: newVersion.originalName,
        fileUrl: newVersion.fileUrl,
        mimeType: newVersion.mimeType,
        fileSize: newVersion.fileSize,
        createdAt: new Date(newVersion.createdAt),
        uploadedById: newVersion.uploadedById,
        version: newVersion.version,
        parentFileId: newVersion.parentFileId,
        uploadedBy: { name: "You" }
      };

      setFiles((prev) => [newFileItem, ...prev]);
      const { toast } = await import("react-hot-toast");
      toast.success(`Successfully uploaded version v${newVersion.version}!`);
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to upload new version.");
    } finally {
      setIsUpgradingVersion(false);
      setUpgradingFileId(null);
      setUploadProgress(null);
      if (e.target) e.target.value = "";
    }
  }, [upgradingFileId, task.id]);

  const isAssignee = task.assignedTo?.id === userId;
  const isCreator = task.assignedById === userId;
  const isOwner = isAssignee || isCreator; // Can manage own task
  const isManager = userRole === Role.SUPER_ADMIN || userRole === Role.ADMIN;

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

  const handleUploadFiles = async (fileList: File[]) => {
    setIsUploading(true);
    try {
      for (const file of fileList) {
        const { url } = await uploadFile(file, `tasks/${task.id}/${userId}`, (percent) => setUploadProgress(percent));
        const record = await createTaskFileRecord({
          taskId: task.id,
          uploadedById: userId,
          filename: file.name,
          originalName: file.name,
          fileUrl: url,
          mimeType: file.type,
          fileSize: file.size,
        });

        // Immediately add to local state so the file shows without refresh
        setFiles((prev) => [
          {
            id: record.id,
            filename: record.filename,
            fileUrl: record.fileUrl,
            mimeType: record.mimeType,
            fileSize: record.fileSize,
            createdAt: new Date(record.createdAt),
            uploadedById: userId,
            uploadedBy: { name: "You" },
            version: record.version ?? 1,
            parentFileId: record.parentFileId ?? null,
          },
          ...prev,
        ]);
      }
      const { toast } = await import("react-hot-toast");
      toast.success(`${fileList.length} file${fileList.length > 1 ? "s" : ""} uploaded.`);
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Upload failed.", { duration: 5000 });
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    await handleUploadFiles(Array.from(e.target.files));
  };

  // ─── Universal status transition handler ──────────────────────────────────
  const handleStatusTransition = async (targetStatus: TaskStatus, label: string) => {
    const confirmMessages: Partial<Record<TaskStatus, string>> = {
      [TaskStatus.REVISION]: "Send this task back for revision?",
      [TaskStatus.DONE]: "Finalize this task? This cannot be undone.",
      [TaskStatus.CLIENT_APPROVAL]: "Send to client for approval?",
    };
    const msg = confirmMessages[targetStatus];
    if (msg && !confirm(msg)) return;

    setIsTransitioning(true);
    try {
      await updateTaskStatus({ taskId: task.id, status: targetStatus });
      const { toast } = await import("react-hot-toast");
      toast.success(`Task moved to ${targetStatus.replace(/_/g, " ")}`, { duration: 3000 });
      onClose();
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || `Failed: ${label}`, { duration: 5000 });
    } finally {
      setIsTransitioning(false);
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

  const canManage = hasPermission(userRole, "editAnyTask") || (isOwner && hasPermission(userRole, "editOwnTask"));
  const canDelete = isManager || isOwner; // Admins or own task owner

  const handleSendReminder = async () => {
    if (!task.assignedTo?.id) return;
    setIsSendingReminder(true);
    try {
      const res = await fetch("/api/push/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: task.assignedTo.id,
          taskId: task.id,
        }),
      });
      if (!res.ok) throw new Error("Failed to send reminder");
      const { toast } = await import("react-hot-toast");
      toast.success(`Reminder sent to ${task.assignedTo.name}`, { duration: 3000 });
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to send reminder.", { duration: 5000 });
    } finally {
      setIsSendingReminder(false);
    }
  };

  // Compute available status actions for the current user + task state
  const availableActions = (STATUS_ACTIONS[task.status] || []).filter((action) => {
    // Check role permission
    if (!action.roles.includes(userRole)) return false;
    // Employees can only transition their own tasks
    if (userRole === Role.EMPLOYEE && !isAssignee) return false;
    return true;
  });

  // Employee can self-assign if task is unassigned or assigned to someone else
  const canSelfAssign = userRole === Role.EMPLOYEE && !isAssignee;

  // Handler for self-assignment
  const handleSelfAssign = async () => {
    setIsSelfAssigning(true);
    try {
      await reassignTask(task.id, userId);
      const { toast } = await import("react-hot-toast");
      toast.success("Task assigned to you!", { duration: 3000 });
      onClose(); // Close and refresh to show updated assignment
    } catch (error: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(error?.message || "Failed to assign task.", { duration: 5000 });
    } finally {
      setIsSelfAssigning(false);
    }
  };

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "details", label: "DETAILS", icon: "description" },
    { id: "comments", label: "COMMENTS", icon: "forum" },

    { id: "activity", label: "ACTIVITY", icon: "history" },
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
                <span className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] font-headline uppercase ${PRIORITY_COLORS[task.priority]} ${flashPriority ? "animate-pulse ring-2 ring-primary" : ""} transition-all duration-150`}>
                  {task.priority}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-headline uppercase bg-card/10 text-foreground">
                  {task.status.replace(/_/g, " ")}
                </span>
                {task.revisionCount > 0 ? (
                  <span className="px-1.5 py-0.5 text-[10px] sm:text-[11px] font-headline uppercase bg-error text-white">REV:{task.revisionCount}</span>
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
              {((task.assignees && task.assignees.length > 0) || task.assignedTo) && (
                <p className="font-label text-[11px] text-outline uppercase tracking-widest mt-1.5">
                  ASSIGNED → <span className="text-primary font-bold">
                    {task.assignees && task.assignees.length > 0
                      ? task.assignees.map((a) => a.name).join(", ")
                      : task.assignedTo?.name}
                  </span>
                  {task.assignedBy && (
                    <span className="text-outline/60 ml-2">BY <span className="text-on-surface/60 font-bold">{task.assignedBy.name}</span></span>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* PENDING_APPROVAL Banner */}
        {task.status === TaskStatus.PENDING_APPROVAL && (
          <div className={`px-4 sm:px-6 py-3 flex-shrink-0 border-b border-on-surface/10 ${
            isManager
              ? "bg-amber-500/15 border-l-4 border-l-amber-500"
              : "bg-amber-500/10 border-l-4 border-l-amber-400"
          }`}>
            {isManager ? (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-lg flex-shrink-0">approval</span>
                <div className="flex-1 min-w-0">
                  <p className="font-headline text-[10px] uppercase tracking-widest text-amber-600">
                    APPROVAL REQUIRED
                  </p>
                  <p className="font-body text-[11px] text-on-surface/70 mt-0.5">
                    {task.assignedTo?.name || "An employee"} created this task and assigned you as the assigner. Approve to allow work, or reject to delete.
                  </p>
                </div>
                <button
                  onClick={handleDeleteTask}
                  disabled={isDeleting}
                  className="flex-shrink-0 flex items-center gap-1.5 mono-clip px-3 py-2 bg-red-600 text-white font-headline text-[11px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-xs">{isDeleting ? "progress_activity" : "close"}</span>
                  REJECT
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-400 text-lg animate-pulse">hourglass_top</span>
                <div>
                  <p className="font-headline text-[10px] uppercase tracking-widest text-amber-500">
                    AWAITING MANAGER APPROVAL
                  </p>
                  <p className="font-body text-[11px] text-on-surface/60 mt-0.5">
                    This task must be approved by your manager before you can start work.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-on-surface/10 flex-shrink-0 bg-card-muted/30">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-2 py-3 font-label text-[11px] sm:text-[10px] uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-b-primary bg-primary/5 font-bold"
                  : "text-outline hover:text-foreground hover:bg-card/5"
              }`}
            >
              <span className="material-symbols-outlined text-base sm:text-sm">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden text-[10px]">{tab.label.slice(0, 3)}</span>
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
                  <span className="font-label text-[10px] sm:text-[11px] text-outline uppercase tracking-widest block mb-1">DUE_DATE</span>
                  <span className="font-headline text-xs sm:text-sm text-foreground uppercase whitespace-nowrap">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "2-digit" }) : "NOT_SET"}
                  </span>
                </div>
                <div className="brutalist-border p-3 bg-surface-container-lowest">
                  <span className="font-label text-[10px] sm:text-[11px] text-outline uppercase tracking-widest block mb-1">PROGRESS</span>
                  <span className="font-headline text-xs sm:text-sm text-foreground">
                    {localSubtasks.filter(s => s.isDone).length}/{localSubtasks.length} DONE
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description ? (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <h3 className="font-label text-[11px] uppercase tracking-widest text-outline mb-2.5">DESCRIPTION</h3>
                  <p className="font-body text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap border-l-3 border-primary pl-4 py-1">{task.description}</p>
                </div>
              ) : null}

              {/* Subtasks */}
              {task.subtasks.length > 0 ? (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <h3 className="font-label text-[11px] uppercase tracking-widest text-outline mb-3">
                    SUBTASKS CHECKLIST
                  </h3>
                  <ul className="space-y-2">
                    {localSubtasks.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-3 font-label text-[10px] sm:text-[11px] uppercase tracking-wide group">
                        <button
                          onClick={async () => {
                            // Optimistic update
                            setLocalSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, isDone: !s.isDone } : s));
                            try {
                              await toggleSubtask(sub.id);
                            } catch {
                              // Revert on error
                              setLocalSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, isDone: !s.isDone } : s));
                            }
                          }}
                          className={`w-5 h-5 brutalist-border flex items-center justify-center text-[10px] transition-colors cursor-pointer ${sub.isDone ? "bg-primary text-white border-primary" : "bg-card hover:border-primary hover:bg-primary/10"}`}
                        >
                          {sub.isDone ? "✓" : ""}
                        </button>
                        <span className={sub.isDone ? "line-through text-outline/50" : "text-foreground group-hover:text-primary transition-colors"}>{sub.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Deliverables Upload */}
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <h3 className="font-label text-[11px] uppercase tracking-widest text-outline mb-3">FILE_DELIVERABLES</h3>
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

                {uploadProgress !== null && (
                  <div className="w-full brutalist-border h-5 mt-2 bg-surface-container-low overflow-hidden relative font-mono text-[11px] uppercase tracking-widest flex items-center justify-center">
                    <div 
                      className="absolute left-0 top-0 h-full bg-primary-container transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                    <span className="relative z-10 text-white font-bold">{uploadProgress}% UPLOADING...</span>
                  </div>
                )}

                {/* File List */}
                {isLoadingFiles ? (
                  <div className="mt-4 p-4 text-center">
                    <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
                    <p className="font-label text-[11px] text-outline uppercase tracking-widest mt-2">LOADING_FILES...</p>
                  </div>
                ) : files.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {(() => {
                      const rootMap: Record<string, any[]> = {};
                      
                      files.forEach(file => {
                        const rootId = file.parentFileId || file.id;
                        if (!rootMap[rootId]) {
                          rootMap[rootId] = [];
                        }
                        rootMap[rootId].push(file);
                      });

                      const organizedFilesList = Object.keys(rootMap).map(rootId => {
                        const group = rootMap[rootId];
                        group.sort((a, b) => {
                          const aVer = a.version ?? 1;
                          const bVer = b.version ?? 1;
                          if (aVer !== bVer) return bVer - aVer;
                          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                        });
                        const latest = group[0];
                        const history = group.slice(1);
                        return {
                          ...latest,
                          history
                        };
                      });

                      return organizedFilesList.map((file) => {
                        const isExpanded = !!expandedFiles[file.id];
                        const isUploader = file.uploadedById === userId;
                        const canDeleteLatest = isUploader || userRole === "SUPER_ADMIN" || userRole === "ADMIN";

                        return (
                          <div key={file.id} className="brutalist-border bg-surface-container-lowest overflow-hidden">
                            {/* File Header / Latest Version */}
                            <div className="flex items-center justify-between p-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <span className="material-symbols-outlined text-lg text-primary flex-shrink-0">
                                  {file.mimeType?.includes("image") ? "image" : "description"}
                                </span>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="truncate font-label text-[10px] uppercase tracking-wide text-foreground">
                                    {file.filename}
                                  </span>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {file.uploadedBy?.name && (
                                      <span className="font-label text-[10px] text-outline uppercase tracking-wider">
                                        BY: {file.uploadedBy.name}
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] text-primary/80 uppercase">
                                      V{file.version ?? 1}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center ml-2">
                                {/* Version History Toggle */}
                                {file.history.length > 0 && (
                                  <button
                                    onClick={() => setExpandedFiles(prev => ({ ...prev, [file.id]: !prev[file.id] }))}
                                    className="flex h-8 px-2 items-center gap-1 brutalist-border bg-surface-container-low text-primary font-mono text-[10px] hover:bg-neutral-200 transition-colors mr-2"
                                    title="View Revision History"
                                  >
                                    <span className="material-symbols-outlined text-xs">history</span>
                                    {file.history.length} {file.history.length === 1 ? "REV" : "REVS"}
                                  </button>
                                )}

                                {/* Upload New Version */}
                                <button
                                  onClick={() => {
                                    setUpgradingFileId(file.id);
                                    const trigger = document.getElementById(`version-upgrade-input-${file.id}`);
                                    trigger?.click();
                                  }}
                                  disabled={isUpgradingVersion}
                                  className="flex h-8 w-8 items-center justify-center text-outline hover:text-primary transition-colors"
                                  title="Upload revision / new version"
                                >
                                  <span className="material-symbols-outlined text-lg">upgrade</span>
                                </button>
                                <input
                                  id={`version-upgrade-input-${file.id}`}
                                  type="file"
                                  className="hidden"
                                  onChange={handleUpgradeVersion}
                                />

                                {/* Download Link */}
                                <a
                                  href={file.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex h-8 w-8 items-center justify-center text-outline hover:text-primary transition-colors"
                                  title="Download"
                                >
                                  <span className="material-symbols-outlined text-lg">download</span>
                                </a>

                                {/* Delete button */}
                                {canDeleteLatest && (
                                  <button
                                    onClick={() => handleDeleteFile(file.id)}
                                    className="flex h-8 w-8 items-center justify-center text-outline hover:text-error transition-colors ml-1"
                                    title="Delete File"
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Nested History/Revisions */}
                            {isExpanded && file.history.length > 0 && (
                              <div className="bg-surface-container-low/50 divide-y divide-on-surface/5 border-t border-on-surface/10">
                                {file.history.map((rev: any) => {
                                  const isRevUploader = rev.uploadedById === userId;
                                  const canDeleteRev = isRevUploader || userRole === "SUPER_ADMIN" || userRole === "ADMIN";
                                  return (
                                    <div key={rev.id} className="flex items-center justify-between p-2.5 pl-6 bg-surface-container-low/30">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <span className="material-symbols-outlined text-sm text-outline flex-shrink-0">
                                          history
                                        </span>
                                        <div className="flex flex-col min-w-0 flex-1">
                                          <span className="truncate font-mono text-[11px] text-foreground/80">
                                            {rev.filename}
                                          </span>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            {rev.uploadedBy?.name && (
                                              <span className="font-label text-[11px] text-outline uppercase tracking-wider">
                                                BY: {rev.uploadedBy.name}
                                              </span>
                                            )}
                                            <span className="font-mono text-[11px] text-outline uppercase">
                                              V{rev.version ?? 1}
                                            </span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center">
                                        {/* Download Link */}
                                        <a
                                          href={rev.fileUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex h-7 w-7 items-center justify-center text-outline hover:text-primary transition-colors"
                                          title="Download Revision"
                                        >
                                          <span className="material-symbols-outlined text-base">download</span>
                                        </a>

                                        {/* Delete button */}
                                        {canDeleteRev && (
                                          <button
                                            onClick={() => handleDeleteFile(rev.id)}
                                            className="flex h-7 w-7 items-center justify-center text-outline hover:text-error transition-colors ml-1"
                                            title="Delete Revision"
                                          >
                                            <span className="material-symbols-outlined text-base">delete</span>
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
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



          {/* Activity Tab */}
          {activeTab === "activity" && (
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
                ACTIVITY_LOG
              </h3>
              {isLoadingActivities ? (
                <div className="space-y-3 animate-pulse">
                  <div className="h-4 bg-surface-container-high w-1/3" />
                  <div className="h-10 bg-surface-container-high w-full" />
                  <div className="h-10 bg-surface-container-high w-full" />
                </div>
              ) : activities.length === 0 ? (
                <div className="brutalist-border bg-card p-6 text-center">
                  <span className="material-symbols-outlined text-2xl text-neutral-400 mb-1 block">history</span>
                  <p className="font-mono text-[10px] uppercase text-muted-foreground tracking-widest">
                    NO_ACTIVITIES_LOGGED_YET
                  </p>
                </div>
              ) : (
                <div className="relative border-l border-on-surface/10 pl-4 ml-2 space-y-6">
                  {activities.map((act) => {
                    let actionText = "";
                    let actionIcon = "circle";
                    let iconColor = "text-outline";

                    switch (act.action) {
                      case "CREATED":
                        actionText = "created the task";
                        actionIcon = "add_circle";
                        iconColor = "text-primary";
                        break;
                      case "UPDATED":
                        actionText = "updated the task";
                        actionIcon = "edit";
                        iconColor = "text-amber-500";
                        break;
                      case "STATUS_CHANGED": {
                        const meta = act.metadata as any;
                        // Handle all metadata key formats used across the codebase
                        const rawOld = meta?.oldStatus || meta?.oldValue || meta?.from || meta?.previousStatus || "";
                        const rawNew = meta?.newStatus || meta?.newValue || meta?.to || "";
                        const statusLabel = (s: string) => {
                          const labels: Record<string, string> = {
                            TODO: "TODO", IN_PROGRESS: "IN PROGRESS", IN_REVIEW: "IN REVIEW",
                            REVISION: "REVISION", CLIENT_REVISION: "CLIENT REVISION",
                            CLIENT_APPROVAL: "CLIENT APPROVAL", APPROVED: "APPROVED",
                            DONE: "DONE", PENDING_APPROVAL: "PENDING APPROVAL",
                          };
                          return labels[s] || s.replace(/_/g, " ") || "—";
                        };
                        actionText = rawOld && rawNew
                          ? `changed status from ${statusLabel(rawOld)} to ${statusLabel(rawNew)}`
                          : rawNew
                            ? `changed status to ${statusLabel(rawNew)}`
                            : "changed status";
                        actionIcon = "sync_alt";
                        iconColor = "text-blue-500";
                        break;
                      }
                      case "ASSIGNED": {
                        const meta = act.metadata as any;
                        actionText = `assigned task to ${meta?.newValue || "someone"}`;
                        actionIcon = "person_add";
                        iconColor = "text-green-500";
                        break;
                      }
                      case "COMMENTED":
                        actionText = "added a comment";
                        actionIcon = "comment";
                        iconColor = "text-purple-500";
                        break;
                      case "FILE_UPLOADED":
                        actionText = "uploaded a file";
                        actionIcon = "upload_file";
                        iconColor = "text-teal-500";
                        break;
                      case "TIME_LOGGED": {
                        const meta = act.metadata as any;
                        actionText = `logged ${meta?.durationMins || "?"} mins`;
                        actionIcon = "more_time";
                        iconColor = "text-orange-500";
                        break;
                      }
                      default:
                        actionText = act.action.toLowerCase().replace(/_/g, " ");
                        break;
                    }

                    return (
                      <div key={act.id} className="relative group">
                        <span className={`material-symbols-outlined absolute -left-[25px] bg-background px-0.5 text-base ${iconColor}`}>
                          {actionIcon}
                        </span>
                        <div className="space-y-0.5">
                          <p className="font-mono text-[10px] uppercase tracking-wider text-on-surface/80">
                            <span className="font-bold text-card-text">{act.user.name}</span> {actionText}
                          </p>
                          <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">
                            {new Date(act.createdAt).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions — Role-aware status transitions */}
        {(availableActions.length > 0 || canSelfAssign) && (
          <div className="p-4 sm:p-5 border-t-2 border-on-surface/10 bg-surface-container-lowest flex-shrink-0 flex flex-col gap-3">
            {task.status !== TaskStatus.DONE && (
              <p className="font-label text-[10px] uppercase tracking-widest text-outline text-center">
                {isManager ? "MANAGEMENT_ACTIONS" : "YOUR_ACTIONS"} — CURRENT: {task.status.replace(/_/g, " ")}
              </p>
            )}

            {/* Self-assign button for employees */}
            {canSelfAssign && (
              <button
                onClick={handleSelfAssign}
                disabled={isSelfAssigning}
                className="w-full flex items-center justify-center gap-2 mono-clip px-6 py-4 font-headline text-sm uppercase hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 bg-primary-container text-white shadow-[4px_4px_0px_#3b1f8e]"
              >
                <span className="material-symbols-outlined text-base">person_add</span>
                {isSelfAssigning ? "ASSIGNING..." : "ASSIGN_TO_ME"}
              </button>
            )}

            {availableActions.map((action) => (
              <button
                key={action.targetStatus}
                onClick={() => handleStatusTransition(action.targetStatus, action.label)}
                disabled={isTransitioning}
                className={`w-full flex items-center justify-center gap-2 mono-clip px-6 py-4 font-headline text-sm uppercase hover:translate-y-[1px] hover:shadow-none transition-all disabled:opacity-50 ${action.color}`}
              >
                <span className="material-symbols-outlined text-base">{action.icon}</span>
                {isTransitioning ? "PROCESSING..." : action.label}
              </button>
            ))}

            {/* Send Reminder — managers/admins only */}
            {isManager && task.assignedTo && task.status !== TaskStatus.DONE && (
              <button
                onClick={handleSendReminder}
                disabled={isSendingReminder}
                className="w-full flex items-center justify-center gap-2 brutalist-border px-6 py-3 font-headline text-xs uppercase tracking-widest text-on-surface hover:bg-card-muted transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">notifications_active</span>
                {isSendingReminder ? "SENDING..." : `SEND REMINDER → ${task.assignedTo.name}`}
              </button>
            )}
          </div>
        )}

        {/* Edit Modal */}
        {isEditModalOpen && (
          <EditTaskModal
            task={{ ...task, assignedToId: task.assignedTo?.id || null, assignedById: task.assignedBy?.id || null }}
            teamMembers={teamMembers}
            userRole={userRole}
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
