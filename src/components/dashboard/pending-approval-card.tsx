"use client";

import { useState } from "react";
import { updateTaskStatus, deleteTask } from "@/app/actions/tasks";
import { useRouter } from "next/navigation";

interface PendingTask {
  id: string;
  title: string;
  createdAt: Date;
  assignedTo: { id: string; name: string; image: string | null } | null;
  project: { title: string } | null;
}

export function PendingApprovalCard({ tasks }: { tasks: PendingTask[] }) {
  const router = useRouter();
  const [processing, setProcessing] = useState<Record<string, "approve" | "reject" | null>>({});

  const handleApprove = async (taskId: string) => {
    setProcessing((prev) => ({ ...prev, [taskId]: "approve" }));
    try {
      await updateTaskStatus({ taskId, status: "TODO" });
      router.refresh();
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to approve task");
    } finally {
      setProcessing((prev) => ({ ...prev, [taskId]: null }));
    }
  };

  const handleReject = async (taskId: string) => {
    setProcessing((prev) => ({ ...prev, [taskId]: "reject" }));
    try {
      await deleteTask(taskId);
      router.refresh();
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Failed to reject task");
    } finally {
      setProcessing((prev) => ({ ...prev, [taskId]: null }));
    }
  };

  return (
    <div className="brutalist-border bg-card overflow-hidden border-l-4 border-l-amber-500">
      <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-amber-500/5 flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-amber-400 animate-pulse">
          notification_important
        </span>
        <h3 className="font-headline text-[10px] uppercase tracking-widest text-amber-400">
          PENDING_APPROVAL — {tasks.length} {tasks.length === 1 ? "TASK" : "TASKS"} AWAITING YOUR ACKNOWLEDGEMENT
        </h3>
      </div>
      <div className="divide-y divide-outline-variant/20">
        {tasks.map((task) => {
          const isProcessing = processing[task.id];
          const timeAgo = getTimeAgo(new Date(task.createdAt));

          return (
            <div
              key={task.id}
              className="px-4 py-3 flex items-center gap-3 hover:bg-card/80 transition-colors"
            >
              {/* Employee avatar */}
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                {task.assignedTo?.image ? (
                  <img
                    src={task.assignedTo.image}
                    alt={task.assignedTo.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="font-headline text-[10px] text-primary uppercase">
                    {task.assignedTo?.name?.charAt(0) || "?"}
                  </span>
                )}
              </div>

              {/* Task info */}
              <div className="flex-1 min-w-0">
                <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                  {task.title}
                </p>
                <p className="font-mono text-[10px] text-on-surface/40">
                  <span className="text-amber-400">{task.assignedTo?.name || "Unknown"}</span>
                  {" says you assigned this"}
                  {task.project && <> · {task.project.title}</>}
                  {" · "}{timeAgo}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => handleApprove(task.id)}
                  disabled={!!isProcessing}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 transition-colors disabled:opacity-50 font-headline text-[10px] uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {isProcessing === "approve" ? "progress_activity" : "check_circle"}
                  </span>
                  APPROVE
                </button>
                <button
                  onClick={() => handleReject(task.id)}
                  disabled={!!isProcessing}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50 font-headline text-[10px] uppercase tracking-wider"
                >
                  <span className="material-symbols-outlined text-[12px]">
                    {isProcessing === "reject" ? "progress_activity" : "cancel"}
                  </span>
                  REJECT
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
