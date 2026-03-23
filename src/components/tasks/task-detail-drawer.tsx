"use client";

import { useState, useCallback, startTransition } from "react";
import { TaskStatus, Priority } from "@prisma/client";
import { submitForReview, createTaskFileRecord } from "@/app/actions/task-submissions";
import { updateTaskStatus } from "@/app/actions/tasks";
import { uploadFile } from "@/lib/storage";

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
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

export function TaskDetailDrawer({ task, userId, isOpen, onClose }: TaskDetailDrawerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
      alert("Upload failed.");
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
        alert("Failed to submit for review.");
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

      {/* Drawer */}
      <div className="relative w-full max-w-xl bg-white brutalist-border border-l-4 border-l-primary shadow-[-8px_0px_0px_#180065] animate-in slide-in-from-right duration-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 bg-[#180065] text-white relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 scanline opacity-20 pointer-events-none"></div>
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 text-[9px] font-headline uppercase ${PRIORITY_COLORS[task.priority]}`}>
                  {task.priority}
                </span>
                <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-white/20">
                  {task.status.replace(/_/g, " ")}
                </span>
                {task.revisionCount > 0 ? (
                  <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-red-500">REV:{task.revisionCount}</span>
                ) : null}
              </div>
              <h2 className="font-headline text-xl uppercase tracking-tight">{task.title}</h2>
            </div>
            <button onClick={onClose} className="hover:text-red-400 transition-colors p-1">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          {task.description ? (
            <div>
              <h3 className="font-headline text-xs uppercase tracking-widest text-[#180065] mb-2">DESCRIPTION</h3>
              <p className="font-body text-sm text-neutral-700 leading-relaxed">{task.description}</p>
            </div>
          ) : null}

          {/* Subtasks */}
          {task.subtasks.length > 0 ? (
            <div>
              <h3 className="font-headline text-xs uppercase tracking-widest text-[#180065] mb-2">
                SUBTASKS ({task.subtasks.filter(s => s.isDone).length}/{task.subtasks.length})
              </h3>
              <ul className="space-y-2">
                {task.subtasks.map((sub) => (
                  <li key={sub.id} className="flex items-center gap-2 font-mono text-xs uppercase">
                    <span className={`w-4 h-4 brutalist-border flex items-center justify-center text-[9px] ${sub.isDone ? "bg-green-100 text-green-700" : ""}`}>
                      {sub.isDone ? "✓" : ""}
                    </span>
                    <span className={sub.isDone ? "line-through text-muted-foreground" : ""}>{sub.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {/* Deliverables Upload */}
          <div>
            <h3 className="font-headline text-xs uppercase tracking-widest text-[#180065] mb-3">DELIVERABLES</h3>
            <div
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              className={`brutalist-border border-dashed p-8 flex flex-col items-center justify-center text-center transition-colors relative cursor-pointer
                ${isDragging ? "bg-primary/10 border-primary" : "bg-[#F4F4F5] hover:bg-neutral-200"}
              `}
            >
              <input type="file" multiple onChange={handleManualUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <span className="material-symbols-outlined text-2xl mb-2 text-[#180065]">
                {isUploading ? "cloud_upload" : "upload_file"}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#180065]">
                {isUploading ? "UPLOADING..." : "DROP_DELIVERABLES_HERE"}
              </span>
            </div>

            {/* File List */}
            {task.files.length > 0 ? (
              <div className="mt-3 space-y-2">
                {task.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-2 brutalist-border bg-white text-[10px] font-mono uppercase">
                    <div className="flex items-center gap-2 truncate">
                      <span className="material-symbols-outlined text-sm text-primary">
                        {file.mimeType.includes("image") ? "image" : "description"}
                      </span>
                      <span className="truncate max-w-[200px]">{file.filename}</span>
                    </div>
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                      <span className="material-symbols-outlined text-sm">download</span>
                    </a>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t-2 border-black bg-[#F4F4F5] flex-shrink-0 space-y-2">
          {canStartWork ? (
            <button
              onClick={handleStartWork}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-amber-500 text-black px-6 py-3 font-headline text-sm uppercase shadow-[4px_4px_0px_#d97706] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#d97706] transition-all"
            >
              <span className="material-symbols-outlined text-base">play_arrow</span>
              START_WORK
            </button>
          ) : null}

          {canSubmit ? (
            <button
              onClick={handleSubmitForReview}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 mono-clip bg-purple-700 text-white px-6 py-3 font-headline text-sm uppercase shadow-[4px_4px_0px_#7c3aed] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#7c3aed] transition-all disabled:opacity-50"
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
