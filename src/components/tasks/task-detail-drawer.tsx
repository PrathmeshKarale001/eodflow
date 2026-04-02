"use client";

import { useState, useCallback, startTransition } from "react";
import { TaskStatus, Priority } from "@prisma/client";
import { submitForReview, createTaskFileRecord } from "@/app/actions/task-submissions";
import { updateTaskStatus } from "@/app/actions/tasks";
import { uploadFile } from "@/lib/storage";
import { CommentThread } from "@/components/comments/comment-thread";
import { TimeLogger } from "@/components/time/time-logger";

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
    files: Array<{ id: string; filename: string; fileUrl: string; mimeType: string; fileSize: number; createdAt: Date }>;
    subtasks: Array<{ id: string; title: string; isDone: boolean }>;
  };
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = "details" | "comments" | "time";

export function TaskDetailDrawer({ task, userId, isOpen, onClose }: TaskDetailDrawerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("details");

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
    } catch (error) {
      console.error("Upload failed:", error);
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
      } catch (error) {
        console.error("Submit failed:", error);
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
      } catch (error) {
        console.error("Failed:", error);
      }
    });
  };

  if (!isOpen) return null;

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "details", label: "DETAILS", icon: "description" },
    { id: "comments", label: "COMMENTS", icon: "forum" },
    { id: "time", label: "TIME", icon: "timer" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-background brutalist-border border-l-2 border-l-primary animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-surface-container-lowest border-b border-on-surface/10 relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-[9px] font-headline uppercase ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-headline uppercase bg-card/10 text-foreground">
                  {task.status.replace(/_/g, " ")}
                </span>
                {task.revisionCount > 0 ? (
                  <span className="px-2 py-0.5 text-[9px] font-headline uppercase bg-error text-white">REV:{task.revisionCount}</span>
                ) : null}
              </div>
              <h2 className="font-headline text-xl uppercase tracking-tight text-foreground">{task.title}</h2>
              {task.assignedTo && (
                <p className="font-label text-[9px] text-outline uppercase tracking-widest mt-1">
                  ASSIGNED → {task.assignedTo.name}
                </p>
              )}
            </div>
            <button onClick={onClose} className="hover:text-error transition-colors p-1 text-outline">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-on-surface/10 flex-shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 font-label text-[10px] uppercase tracking-widest transition-colors ${
                activeTab === tab.id
                  ? "text-primary border-b-2 border-b-primary bg-primary/5"
                  : "text-outline hover:text-foreground hover:bg-card/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Details Tab */}
          {activeTab === "details" && (
            <div className="p-6 space-y-6">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div className="brutalist-border p-3">
                  <span className="font-label text-[9px] text-outline uppercase tracking-widest block mb-1">DUE_DATE</span>
                  <span className="font-headline text-sm text-foreground uppercase">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "NOT_SET"}
                  </span>
                </div>
                <div className="brutalist-border p-3">
                  <span className="font-label text-[9px] text-outline uppercase tracking-widest block mb-1">SUBTASKS</span>
                  <span className="font-headline text-sm text-foreground">
                    {task.subtasks.filter(s => s.isDone).length}/{task.subtasks.length}
                  </span>
                </div>
              </div>

              {/* Description */}
              {task.description ? (
                <div>
                  <h3 className="font-label text-[10px] uppercase tracking-widest text-outline mb-2">DESCRIPTION</h3>
                  <p className="font-body text-sm text-foreground/80 leading-relaxed border-l-2 border-primary pl-3">{task.description}</p>
                </div>
              ) : null}

              {/* Subtasks */}
              {task.subtasks.length > 0 ? (
                <div>
                  <h3 className="font-label text-[10px] uppercase tracking-widest text-outline mb-2">
                    SUBTASKS ({task.subtasks.filter(s => s.isDone).length}/{task.subtasks.length})
                  </h3>
                  <ul className="space-y-1.5">
                    {task.subtasks.map((sub) => (
                      <li key={sub.id} className="flex items-center gap-2 font-label text-[11px] uppercase tracking-wide">
                        <span className={`w-4 h-4 brutalist-border flex items-center justify-center text-[9px] ${sub.isDone ? "bg-primary/20 text-primary" : ""}`}>
                          {sub.isDone ? "✓" : ""}
                        </span>
                        <span className={sub.isDone ? "line-through text-outline/50" : "text-foreground"}>{sub.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Deliverables Upload */}
              <div>
                <h3 className="font-label text-[10px] uppercase tracking-widest text-outline mb-3">DELIVERABLES</h3>
                <div
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`brutalist-border border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
                    ${isDragging ? "bg-primary/10 border-primary" : "bg-surface-container-lowest hover:bg-surface-container-low"}
                  `}
                >
                  <input type="file" multiple onChange={handleManualUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  <span className="material-symbols-outlined text-2xl mb-2 text-primary">
                    {isUploading ? "cloud_upload" : "upload_file"}
                  </span>
                  <span className="font-label text-[10px] uppercase tracking-widest text-outline">
                    {isUploading ? "UPLOADING..." : "DROP_DELIVERABLES_HERE"}
                  </span>
                </div>

                {/* File List */}
                {task.files.length > 0 ? (
                  <div className="mt-3 space-y-1">
                    {task.files.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-2 brutalist-border bg-surface-container-lowest text-[10px] font-label uppercase tracking-wide">
                        <div className="flex items-center gap-2 truncate text-foreground">
                          <span className="material-symbols-outlined text-sm text-primary">
                            {file.mimeType.includes("image") ? "image" : "description"}
                          </span>
                          <span className="truncate max-w-[200px]">{file.filename}</span>
                        </div>
                        <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-outline hover:text-primary">
                          <span className="material-symbols-outlined text-sm">download</span>
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
            <div className="p-6">
              <CommentThread taskId={task.id} currentUserId={userId} initialComments={[]} />
            </div>
          )}

          {/* Time Tab */}
          {activeTab === "time" && (
            <div className="p-6">
              <TimeLogger taskId={task.id} userId={userId} />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-on-surface/10 bg-surface-container-lowest flex-shrink-0 space-y-2">
          {canStartWork ? (
            <button
              onClick={handleStartWork}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-tertiary text-black px-6 py-3 font-headline text-sm uppercase hover:brightness-110 transition-all"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              START_WORK
            </button>
          ) : null}

          {canSubmit ? (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-primary-container text-white px-6 py-3 font-headline text-sm uppercase hover:brightness-110 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-base">send</span>
              {isSubmitting ? "SUBMITTING..." : "SUBMIT_FOR_REVIEW"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
