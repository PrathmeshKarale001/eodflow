"use client";

import { useState, useTransition } from "react";
import { logManualEntry } from "@/app/actions/time";
import { AppSelect } from "@/components/ui/app-select";

interface Task {
  id: string;
  title: string;
  project: { title: string } | null;
}

interface ManualTimeFormProps {
  tasks: Task[];
  defaultTaskId?: string;
  onLogged?: () => void;
}

export function ManualTimeForm({ tasks, defaultTaskId, onLogged }: ManualTimeFormProps) {
  const [taskId, setTaskId] = useState(defaultTaskId ?? "");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [notes, setNotes] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (!taskId) { setError("Select a task"); return; }
    if (h === 0 && m === 0) { setError("Duration must be > 0"); return; }

    startTransition(async () => {
      try {
        await logManualEntry({ taskId, hours: h, minutes: m, notes: notes || undefined, entryDate });
        setSuccess(true);
        setNotes("");
        setTimeout(() => setSuccess(false), 2000);
        onLogged?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to log");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="brutalist-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-sm text-primary">edit_calendar</span>
        <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">
          LOG_TIME_MANUALLY
        </h3>
      </div>

      <div>
        <label className="block font-label text-[8px] uppercase tracking-widest text-on-surface/50 mb-1">
          TASK
        </label>
        <AppSelect
          options={tasks.map((t) => ({
            value: t.id,
            label: `${t.project ? `[${t.project.title}] ` : ""}${t.title}`,
          }))}
          value={taskId}
          onChange={setTaskId}
          placeholder="— Select task —"
          className="h-9"
        />
      </div>

      {/* Duration */}
      <div>
        <label className="block font-label text-[8px] uppercase tracking-widest text-on-surface/50 mb-1">
          DURATION
        </label>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              min="0"
              max="23"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full h-9 brutalist-border px-2 font-mono text-sm text-center bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="font-mono text-[10px] text-on-surface/50 flex-shrink-0">hr</span>
          </div>
          <div className="flex items-center gap-1 flex-1">
            <input
              type="number"
              min="0"
              max="59"
              step="5"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="w-full h-9 brutalist-border px-2 font-mono text-sm text-center bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="font-mono text-[10px] text-on-surface/50 flex-shrink-0">min</span>
          </div>
        </div>
      </div>

      {/* Date */}
      <div>
        <label className="block font-label text-[8px] uppercase tracking-widest text-on-surface/50 mb-1">
          DATE
        </label>
        <input
          type="date"
          value={entryDate}
          onChange={(e) => setEntryDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
          className="w-full h-9 brutalist-border px-2 font-mono text-[10px] bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block font-label text-[8px] uppercase tracking-widest text-on-surface/50 mb-1">
          NOTES (OPTIONAL)
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="What did you work on?"
          className="w-full h-9 brutalist-border px-2 font-mono text-[10px] bg-surface-container-lowest text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && <p className="font-mono text-[9px] text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="w-full py-2.5 bg-primary text-on-primary font-headline text-[10px] uppercase tracking-widest brutalist-border hover:bg-primary/80 disabled:opacity-50 transition-colors"
      >
        {isPending ? "LOGGING..." : success ? "✓ LOGGED" : "LOG TIME"}
      </button>
    </form>
  );
}
