"use client";

import { useState, useRef, useCallback, useEffect, startTransition } from "react";
import { createTimeEntry, getTaskTimeEntries } from "@/app/actions/time-entries";

interface TimeLoggerProps {
  taskId: string;
  userId: string;
}

export function TimeLogger({ taskId, userId }: TimeLoggerProps) {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualMins, setManualMins] = useState("");
  const [manualNotes, setManualNotes] = useState("");
  const [entries, setEntries] = useState<
    Array<{ id: string; durationMins: number; notes: string | null; createdAt: Date; user: { name: string } }>
  >([]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  // Load entries on mount
  useEffect(() => {
    getTaskTimeEntries(taskId).then(setEntries).catch(console.error);
  }, [taskId]);

  const handleStart = useCallback(() => {
    setIsRunning(true);
    setSeconds(0);
    startTimeRef.current = new Date();
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  const handleStop = useCallback(() => {
    setIsRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    const durationMins = Math.max(1, Math.round(seconds / 60));
    setIsSaving(true);
    startTransition(async () => {
      try {
        await createTimeEntry({
          taskId,
          durationMins,
          startedAt: startTimeRef.current || undefined,
          stoppedAt: new Date(),
        });
        const updated = await getTaskTimeEntries(taskId);
        setEntries(updated);
        setSeconds(0);
      } catch (err) {
        console.error("Failed to save time entry:", err);
      } finally {
        setIsSaving(false);
      }
    });
  }, [taskId, seconds]);

  const handleManualSubmit = () => {
    const mins = parseInt(manualMins, 10);
    if (isNaN(mins) || mins <= 0) return;

    setIsSaving(true);
    startTransition(async () => {
      try {
        await createTimeEntry({
          taskId,
          durationMins: mins,
          notes: manualNotes || undefined,
        });
        const updated = await getTaskTimeEntries(taskId);
        setEntries(updated);
        setManualMins("");
        setManualNotes("");
        setShowManual(false);
      } catch (err) {
        console.error("Failed to save manual entry:", err);
      } finally {
        setIsSaving(false);
      }
    });
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const totalLogged = entries.reduce((sum, e) => sum + e.durationMins, 0);

  return (
    <div className="space-y-4">
      {/* Timer Display */}
      <div className="brutalist-border bg-[#0A0A0A] p-5 flex items-center justify-between">
        <div>
          <span className="font-mono text-3xl text-green-400 tracking-[0.15em] tabular-nums">
            {formatTime(seconds)}
          </span>
          <p className="font-mono text-[9px] text-neutral-500 uppercase tracking-widest mt-1">
            TOTAL_LOGGED: {totalLogged}m
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={isSaving}
              className="flex items-center gap-1.5 mono-clip bg-red-600 text-white px-4 py-2.5 font-headline text-xs uppercase shadow-[3px_3px_0px_#991b1b] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#991b1b] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              STOP
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isSaving}
              className="flex items-center gap-1.5 mono-clip bg-green-600 text-white px-4 py-2.5 font-headline text-xs uppercase shadow-[3px_3px_0px_#15803d] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#15803d] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              START
            </button>
          )}
          <button
            onClick={() => setShowManual(!showManual)}
            className="brutalist-border px-3 py-2.5 font-headline text-[10px] uppercase text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            +MANUAL
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showManual ? (
        <div className="brutalist-border bg-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-label text-[10px] uppercase text-primary tracking-widest">MINUTES</label>
              <input
                type="number"
                min="1"
                value={manualMins}
                onChange={(e) => setManualMins(e.target.value)}
                className="w-full h-10 brutalist-border px-3 font-mono text-sm focus:border-primary focus:outline-none"
                placeholder="30"
              />
            </div>
            <div className="space-y-1">
              <label className="font-label text-[10px] uppercase text-primary tracking-widest">NOTES</label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full h-10 brutalist-border px-3 font-body text-sm focus:border-primary focus:outline-none"
                placeholder="What was done..."
              />
            </div>
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={isSaving}
            className="w-full mono-clip bg-[#180065] text-white px-4 py-2.5 font-headline text-xs uppercase shadow-[3px_3px_0px_#5847d2] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#5847d2] transition-all disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : "LOG_ENTRY"}
          </button>
        </div>
      ) : null}

      {/* Time Entries Table */}
      {entries.length > 0 ? (
        <div className="brutalist-border overflow-hidden">
          <table className="w-full text-[10px] font-mono uppercase">
            <thead>
              <tr className="bg-card-muted brutalist-border border-t-0 border-x-0">
                <th className="px-3 py-2 text-left tracking-widest text-card-text">DATE</th>
                <th className="px-3 py-2 text-left tracking-widest text-card-text">USER</th>
                <th className="px-3 py-2 text-right tracking-widest text-card-text">MINS</th>
                <th className="px-3 py-2 text-left tracking-widest text-card-text">NOTES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-container-high transition-colors">
                  <td className="px-3 py-1.5 text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-1.5">{entry.user.name}</td>
                  <td className="px-3 py-1.5 text-right font-bold">{entry.durationMins}</td>
                  <td className="px-3 py-1.5 text-muted-foreground truncate max-w-[150px]">
                    {entry.notes || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
