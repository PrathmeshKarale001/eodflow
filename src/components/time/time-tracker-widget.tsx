"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { startTimer, stopTimer } from "@/app/actions/time";

interface RunningTimer {
  id: string;
  startedAt: Date | null;
  task: { id: string; title: string; project: { title: string } | null } | null;
}

interface AssignedTask {
  id: string;
  title: string;
  project: { title: string } | null;
}

interface TimeTrackerWidgetProps {
  initialRunningTimer: RunningTimer | null;
  taskId?: string;      // If embedded in task drawer — auto-fills task
  taskTitle?: string;
  tasks?: AssignedTask[]; // Available tasks for the selector (standalone page)
  onTimeLogged?: () => void;
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
  const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function TimeTrackerWidget({
  initialRunningTimer,
  taskId,
  taskTitle,
  tasks = [],
  onTimeLogged,
}: TimeTrackerWidgetProps) {
  const [running, setRunning] = useState<RunningTimer | null>(initialRunningTimer);
  const [elapsed, setElapsed] = useState(0);
  const [isPending, startTransition] = useTransition();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Local state for the task selector (only used when no taskId prop)
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");

  // The effective task ID is either the prop or the selected one
  const effectiveTaskId = taskId || selectedTaskId;
  const effectiveTaskTitle = taskId
    ? taskTitle
    : tasks.find((t) => t.id === selectedTaskId)?.title;

  // Compute elapsed from startedAt
  useEffect(() => {
    if (running?.startedAt) {
      const start = new Date(running.startedAt).getTime();
      const calc = () => setElapsed(Math.floor((Date.now() - start) / 1000));
      calc();
      intervalRef.current = setInterval(calc, 1000);
    } else {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const handleStart = () => {
    const tid = effectiveTaskId;
    if (!tid) return;
    startTransition(async () => {
      try {
        const entry = await startTimer(tid);
        setRunning({
          id: entry.id,
          startedAt: entry.startedAt,
          task: { id: tid, title: effectiveTaskTitle ?? "Task", project: null },
        });
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to start timer.");
      }
    });
  };

  const handleStop = () => {
    if (!running) return;
    startTransition(async () => {
      try {
        await stopTimer(running.id);
        setRunning(null);
        onTimeLogged?.();
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to stop timer.");
      }
    });
  };

  const isMyTask = !running || running.task?.id === effectiveTaskId;
  const isRunning = !!running && (!effectiveTaskId || isMyTask);

  return (
    <div className={`brutalist-border p-4 ${isRunning ? "bg-primary/5 border-primary/40" : "bg-card"}`}>
      {/* Timer display + controls row */}
      <div className="flex items-center gap-4">
        {/* Timer display */}
        <div className="flex-1">
          <p className="font-mono text-[28px] tabular-nums text-on-surface tracking-[-0.05em] leading-none">
            {formatElapsed(isRunning ? elapsed : 0)}
          </p>
          {running && (
            <p className="font-mono text-[9px] uppercase text-on-surface/50 mt-1 truncate max-w-[180px]">
              <span className="text-primary">●</span> {running.task?.title ?? "Task"}
              {running.task?.project && ` · ${running.task.project.title}`}
            </p>
          )}
          {!running && effectiveTaskTitle && (
            <p className="font-mono text-[9px] uppercase text-on-surface/40 mt-1 truncate max-w-[180px]">
              {effectiveTaskTitle}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={isPending || !effectiveTaskId}
              title={!effectiveTaskId ? "Select a task first" : "Start timer"}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary font-headline text-[10px] uppercase tracking-widest brutalist-border hover:bg-primary/80 disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              START
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white font-headline text-[10px] uppercase tracking-widest brutalist-border hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              STOP
            </button>
          )}
        </div>

        {/* Running indicator pulse */}
        {isRunning && (
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
        )}
      </div>

      {/* Task Selector — only shown on standalone page (no taskId prop) and when not running */}
      {!taskId && !running && tasks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-on-surface/10">
          <label className="font-label text-[8px] uppercase tracking-widest text-on-surface/40 block mb-1.5">
            SELECT_TASK_TO_TRACK
          </label>
          <select
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-surface-container-low brutalist-border px-3 py-2 font-mono text-[11px] uppercase text-on-surface appearance-none cursor-pointer hover:border-primary/50 transition-colors"
          >
            <option value="">— PICK A TASK —</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}{t.project ? ` · ${t.project.title}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
