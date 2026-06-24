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

  // Load entries and recover timer state from localStorage on mount/taskId change
  useEffect(() => {
    getTaskTimeEntries(taskId).then(setEntries).catch(console.error);

    const savedRunning = localStorage.getItem(`eodflow_timer_running_${taskId}`) === "true";
    const savedStart = localStorage.getItem(`eodflow_timer_start_${taskId}`);

    if (savedRunning && savedStart) {
      const startTime = new Date(savedStart).getTime();
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      
      setSeconds(elapsed);
      setIsRunning(true);
      startTimeRef.current = new Date(startTime);

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
      }, 1000);
    } else {
      setIsRunning(false);
      setSeconds(0);
      startTimeRef.current = null;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [taskId]);

  const handleStart = useCallback(() => {
    const now = new Date();
    localStorage.setItem(`eodflow_timer_start_${taskId}`, now.toISOString());
    localStorage.setItem(`eodflow_timer_running_${taskId}`, "true");

    setIsRunning(true);
    setSeconds(0);
    startTimeRef.current = now;

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - now.getTime()) / 1000)));
    }, 1000);
  }, [taskId]);

  const handleStop = useCallback(() => {
    localStorage.removeItem(`eodflow_timer_start_${taskId}`);
    localStorage.removeItem(`eodflow_timer_running_${taskId}`);

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
      <div className="brutalist-border bg-[#0A0A0A] p-5 flex flex-col sm:flex-row items-center sm:items-center justify-between gap-4 sm:gap-2">
        <div className="text-center sm:text-left">
          <span className="font-mono text-3xl md:text-3xl text-green-400 tracking-[0.15em] tabular-nums leading-none">
            {formatTime(seconds)}
          </span>
          <p className="font-mono text-[11px] text-neutral-500 uppercase tracking-widest mt-1.5">
            TOTAL_LOGGED: {totalLogged}m
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {isRunning ? (
            <button
              onClick={handleStop}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-red-600 text-white px-4 py-3 sm:py-2.5 font-headline text-[10px] sm:text-xs uppercase shadow-[3px_3px_0px_#991b1b] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#991b1b] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">stop</span>
              STOP
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-lg bg-green-600 text-white px-4 py-3 sm:py-2.5 font-headline text-[10px] sm:text-xs uppercase shadow-[3px_3px_0px_#15803d] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#15803d] transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              START
            </button>
          )}
          <button
            onClick={() => setShowManual(!showManual)}
            className="brutalist-border px-3 py-3 sm:py-2.5 font-headline text-[10px] uppercase text-neutral-500 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            +MANUAL
          </button>
        </div>
      </div>

      {/* Manual Entry Form */}
      {showManual ? (
        <div className="brutalist-border bg-card p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest block">MINUTES</label>
              <input
                type="number"
                min="1"
                value={manualMins}
                onChange={(e) => setManualMins(e.target.value)}
                className="w-full h-11 brutalist-border px-3 font-mono text-sm focus:border-primary focus:outline-none bg-surface-container-lowest"
                placeholder="30"
              />
            </div>
            <div className="space-y-1.5">
              <label className="font-label text-[11px] uppercase text-primary tracking-widest block">NOTES</label>
              <input
                type="text"
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                className="w-full h-11 brutalist-border px-3 font-body text-sm focus:border-primary focus:outline-none bg-surface-container-lowest"
                placeholder="What was done..."
              />
            </div>
          </div>
          <button
            onClick={handleManualSubmit}
            disabled={isSaving}
            className="w-full rounded-lg bg-[#180065] text-white px-4 py-3 font-headline text-xs uppercase shadow-lg hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#5847d2] transition-all disabled:opacity-50"
          >
            {isSaving ? "SAVING..." : "LOG_ENTRY"}
          </button>
        </div>
      ) : null}

      {/* Time Entries - Desktop Table / Mobile List */}
      {entries.length > 0 ? (
        <div className="brutalist-border overflow-hidden">
          {/* Desktop view */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-[10px] font-mono uppercase">
              <thead>
                <tr className="bg-card-muted brutalist-border border-t-0 border-x-0 border-b">
                  <th className="px-4 py-2.5 text-left tracking-widest text-card-text">DATE</th>
                  <th className="px-4 py-2.5 text-left tracking-widest text-card-text">USER</th>
                  <th className="px-4 py-2.5 text-right tracking-widest text-card-text">MINS</th>
                  <th className="px-4 py-2.5 text-left tracking-widest text-card-text">NOTES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-surface-container-high transition-colors">
                    <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="px-4 py-2 font-headline">{entry.user.name}</td>
                    <td className="px-4 py-2 text-right font-bold text-primary">{entry.durationMins}M</td>
                    <td className="px-4 py-2 text-muted-foreground truncate max-w-[200px]">
                      {entry.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="block sm:hidden divide-y divide-neutral-200">
            {entries.map((entry) => (
              <div key={entry.id} className="p-3 bg-surface-container-lowest">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex flex-col">
                    <span className="font-headline text-[11px] uppercase text-on-surface">
                      {entry.user.name}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-primary">
                    {entry.durationMins}M
                  </span>
                </div>
                {entry.notes && (
                  <p className="font-body text-[10px] text-outline line-clamp-2 mt-1 lowercase">
                    {entry.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
