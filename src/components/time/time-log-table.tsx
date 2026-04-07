"use client";

import { useState, useTransition } from "react";
import { deleteTimeEntry } from "@/app/actions/time";

interface TimeEntry {
  id: string;
  durationMins: number;
  notes: string | null;
  entryDate: Date;
  startedAt: Date | null;
  task: {
    id: string;
    title: string;
    project: { title: string; client: { companyName: string } | null } | null;
  } | null;
}

interface TimeLogTableProps {
  entries: TimeEntry[];
  showUser?: boolean;
  userName?: string;
}

function groupByDate(entries: TimeEntry[]): Record<string, TimeEntry[]> {
  const groups: Record<string, TimeEntry[]> = {};
  for (const e of entries) {
    const key = new Date(e.entryDate).toISOString().split("T")[0];
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return groups;
}

function formatMins(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "TODAY";
  if (dateStr === yesterday) return "YESTERDAY";
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

export function TimeLogTable({ entries, showUser }: TimeLogTableProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const grouped = groupByDate(entries);
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalMins = entries.reduce((sum, e) => sum + e.durationMins, 0);

  const handleDelete = (id: string) => {
    setDeleting(id);
    startTransition(async () => {
      await deleteTimeEntry(id);
      setDeleting(null);
    });
  };

  if (entries.length === 0) {
    return (
      <div className="brutalist-border p-8 text-center bg-card">
        <span className="material-symbols-outlined text-3xl text-on-surface/20 block mb-2">timer_off</span>
        <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">NO_TIME_LOGGED</p>
        <p className="font-mono text-[9px] text-on-surface/20 mt-1">Start a timer or log time manually above</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Weekly total banner */}
      <div className="brutalist-border bg-primary/5 border-primary/30 px-4 py-3 flex items-center justify-between">
        <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface/60">TOTAL_LOGGED</span>
        <span className="font-mono text-xl text-primary font-bold">{formatMins(totalMins)}</span>
      </div>

      {sortedDates.map((dateStr) => {
        const dayEntries = grouped[dateStr];
        const dayTotal = dayEntries.reduce((sum, e) => sum + e.durationMins, 0);

        return (
          <div key={dateStr} className="brutalist-border bg-card overflow-hidden">
            {/* Day header */}
            <div className="px-4 py-2 bg-card-muted flex items-center justify-between brutalist-border border-t-0 border-x-0">
              <span className="font-headline text-[9px] uppercase tracking-widest text-card-text">
                {formatDate(dateStr)}
              </span>
              <span className="font-mono text-[9px] text-primary">{formatMins(dayTotal)}</span>
            </div>

            {/* Entries */}
            <div className="divide-y divide-outline-variant/20">
              {dayEntries.map((entry) => (
                <div key={entry.id} className="px-4 py-3 flex items-start gap-3 group hover:bg-card-muted/50 transition-colors">
                  {/* Duration pill */}
                  <span className="flex-shrink-0 font-mono text-[10px] bg-primary/10 text-primary px-2 py-0.5 min-w-[48px] text-center">
                    {formatMins(entry.durationMins)}
                  </span>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                      {entry.task?.title ?? "Unknown task"}
                    </p>
                    {entry.task?.project && (
                      <p className="font-mono text-[8px] text-on-surface/40 truncate">
                        {entry.task.project.client?.companyName && `${entry.task.project.client.companyName} · `}
                        {entry.task.project.title}
                      </p>
                    )}
                    {entry.notes && (
                      <p className="font-mono text-[8px] text-on-surface/50 mt-0.5 italic">{entry.notes}</p>
                    )}
                    {entry.startedAt && (
                      <p className="font-mono text-[7px] text-on-surface/30 mt-0.5 uppercase">
                        <span className="text-primary/50">●</span> TIMER
                      </p>
                    )}
                  </div>

                  {/* Delete */}
                  {!showUser && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={deleting === entry.id}
                      className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-on-surface/30 hover:text-red-400 transition-all disabled:opacity-50"
                      title="Delete entry"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {deleting === entry.id ? "hourglass_empty" : "delete"}
                      </span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
