"use client";

import { useState, startTransition } from "react";
import { TaskStatus, Priority, Role } from "@prisma/client";
import { approveTask, requestRevision, clientApproveTask, clientRequestRevision } from "@/app/actions/review";
import { hasPermission } from "@/lib/permissions";

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-600 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-amber-400 text-black",
  LOW: "bg-neutral-300 text-neutral-700",
};

interface ReviewPanelProps {
  task: {
    id: string;
    title: string;
    status: TaskStatus;
    priority: Priority;
    revisionCount: number;
    projectId: string;
    files: Array<{ id: string; filename: string; fileUrl: string; mimeType: string }>;
  };
  userRole: Role;
  onAction?: () => void;
}

export function ReviewPanel({ task, userRole, onAction }: ReviewPanelProps) {
  const [revisionNotes, setRevisionNotes] = useState("");
  const [showNotesField, setShowNotesField] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeGate, setActiveGate] = useState<"manager" | "client" | null>(null);

  const canManagerReview = hasPermission(userRole, "reviewTask") && task.status === TaskStatus.IN_REVIEW;
  const canClientReview = hasPermission(userRole, "approveForClient") && task.status === TaskStatus.CLIENT_APPROVAL;
  const isWaitingOnEmployee = task.status === TaskStatus.REVISION || task.status === TaskStatus.CLIENT_REVISION;

  const handleApprove = () => {
    setIsProcessing(true);
    startTransition(async () => {
      try {
        if (task.status === TaskStatus.IN_REVIEW) {
          await approveTask(task.id);
        } else if (task.status === TaskStatus.CLIENT_APPROVAL) {
          await clientApproveTask(task.id);
        }
        onAction?.();
      } catch (error) {
        console.error("Approve failed:", error);
        alert("Approval failed.");
      } finally {
        setIsProcessing(false);
      }
    });
  };

  const handleRequestRevision = () => {
    if (!showNotesField) {
      setShowNotesField(true);
      setActiveGate(task.status === TaskStatus.IN_REVIEW ? "manager" : "client");
      return;
    }

    if (!revisionNotes.trim()) {
      alert("Revision notes are required.");
      return;
    }

    setIsProcessing(true);
    startTransition(async () => {
      try {
        if (activeGate === "manager") {
          await requestRevision(task.id, revisionNotes);
        } else {
          await clientRequestRevision(task.id, revisionNotes);
        }
        setRevisionNotes("");
        setShowNotesField(false);
        onAction?.();
      } catch (error) {
        console.error("Revision request failed:", error);
        alert("Failed to request revision.");
      } finally {
        setIsProcessing(false);
      }
    });
  };

  // No review actions available
  if (!canManagerReview && !canClientReview && !isWaitingOnEmployee) return null;

  return (
    <div className="brutalist-border bg-card">
      {/* Header */}
      <div className="p-4 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
        <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text flex items-center gap-2">
          <span className="material-symbols-outlined text-base">gavel</span>
          REVIEW_PANEL
        </h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-[9px] font-headline uppercase ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          {task.revisionCount > 0 ? (
            <span className="px-2 py-0.5 text-[9px] font-mono uppercase bg-red-100 text-red-700 brutalist-border border-red-200">
              REVISION_COUNT: {task.revisionCount}
            </span>
          ) : null}
        </div>
      </div>

      {/* Deliverables Preview */}
      <div className="p-4 border-b border-neutral-200">
        <h4 className="font-headline text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
          SUBMITTED_DELIVERABLES
        </h4>
        {task.files.length === 0 ? (
          <p className="font-mono text-[10px] text-muted-foreground uppercase">NO_FILES_ATTACHED</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {task.files.map((file) => (
              <a
                key={file.id}
                href={file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="brutalist-border p-2 bg-neutral-50 hover:bg-neutral-100 flex items-center gap-2 text-[9px] font-mono uppercase truncate transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-primary flex-shrink-0">
                  {file.mimeType.includes("image") ? "image" : file.mimeType.includes("pdf") ? "picture_as_pdf" : "description"}
                </span>
                <span className="truncate">{file.filename}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Status-Dependent Actions */}
      <div className="p-4 space-y-3">
        {/* Waiting on Employee */}
        {isWaitingOnEmployee ? (
          <div className="flex items-center gap-3 p-3 bg-amber-500/10 brutalist-border border-amber-300">
            <span className="material-symbols-outlined text-amber-600">pending</span>
            <span className="font-mono text-xs uppercase tracking-widest text-amber-800">
              {task.status === TaskStatus.REVISION ? "AWAITING_EMPLOYEE_REVISION" : "AWAITING_CLIENT_REVISION_FIX"}
            </span>
          </div>
        ) : null}

        {/* Manager Gate Actions */}
        {canManagerReview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-headline uppercase tracking-widest text-card-text mb-2">
              <span className="w-2 h-2 bg-purple-500"></span>
              GATE_1: MANAGER_REVIEW
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 mono-clip bg-green-700 text-white px-4 py-3 font-headline text-xs uppercase shadow-[4px_4px_0px_#15803d] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#15803d] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">check_circle</span>
                APPROVE
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 brutalist-border border-red-600 text-red-600 px-4 py-3 font-headline text-xs uppercase hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">undo</span>
                REQUEST_REVISION
              </button>
            </div>
          </div>
        ) : null}

        {/* Client Gate Actions */}
        {canClientReview ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-headline uppercase tracking-widest text-card-text mb-2">
              <span className="w-2 h-2 bg-indigo-500"></span>
              GATE_2: CLIENT_APPROVAL
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 mono-clip bg-green-700 text-white px-4 py-3 font-headline text-xs uppercase shadow-[4px_4px_0px_#15803d] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_#15803d] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">verified</span>
                CLIENT_APPROVE
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 brutalist-border border-orange-600 text-orange-600 px-4 py-3 font-headline text-xs uppercase hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base">replay</span>
                CLIENT_REVISION
              </button>
            </div>
          </div>
        ) : null}

        {/* Revision Notes Textarea */}
        {showNotesField ? (
          <div className="space-y-2 animate-in slide-in-from-bottom-2 duration-200">
            <label className="font-label text-[10px] uppercase text-red-600 tracking-widest">REVISION_NOTES</label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              rows={3}
              autoFocus
              className="w-full brutalist-border border-red-300 px-4 py-3 font-mono text-sm focus:border-red-600 focus:outline-none resize-none bg-red-500/10"
              placeholder="Describe what needs to change..."
            />
            <div className="flex gap-2">
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="flex-1 mono-clip bg-red-600 text-white px-4 py-2 font-headline text-xs uppercase shadow-[3px_3px_0px_#991b1b] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#991b1b] transition-all disabled:opacity-50"
              >
                {isProcessing ? "SENDING..." : "CONFIRM_REVISION"}
              </button>
              <button
                onClick={() => { setShowNotesField(false); setRevisionNotes(""); }}
                className="brutalist-border px-4 py-2 font-headline text-xs uppercase hover:bg-neutral-100 transition-colors"
              >
                CANCEL
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
