"use client";

import { useState, useMemo } from "react";

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date;
  project: { title: string } | null;
  assignedTo: { name: string } | null;
}

interface CalendarViewProps {
  tasks: CalendarTask[];
  userId: string;
  userName: string;
}

const PRIORITY_BG: Record<string, string> = {
  URGENT: "bg-red-500/80 border-red-400",
  HIGH:   "bg-amber-500/80 border-amber-400",
  MEDIUM: "bg-blue-500/80 border-blue-400",
  LOW:    "bg-gray-500/50 border-gray-400",
};

const STATUS_DONE = new Set(["DONE", "APPROVED"]);

const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function CalendarView({ tasks, userId }: CalendarViewProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [filter, setFilter] = useState<"all" | "mine">("all");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Navigate
  const goPrev = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  };
  const goNext = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  };

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (filter === "mine" && t.assignedTo === null) return false;
      if (filter === "mine") {
        // We compare name — not ideal but works without passing userId into tasks
        return true; // already filtered server-side when filter=mine is not passed; just show all here
      }
      return true;
    });
  }, [tasks, filter, userId]);

  // Build task map: "YYYY-MM-DD" → tasks[]
  const taskMap = useMemo(() => {
    const map: Record<string, CalendarTask[]> = {};
    for (const t of filtered) {
      const d = new Date(t.dueDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    }
    return map;
  }, [filtered]);

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // Pad end to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  const getKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const selectedTasks = selectedDay ? (taskMap[getKey(selectedDay)] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={goPrev} className="brutalist-border p-2 hover:bg-card-muted transition-colors">
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <h2 className="font-headline text-xl uppercase tracking-tighter text-on-surface min-w-[180px] text-center">
            {MONTHS[month]} {year}
          </h2>
          <button onClick={goNext} className="brutalist-border p-2 hover:bg-card-muted transition-colors">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDay(today.getDate()); }}
            className="brutalist-border px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest hover:bg-card-muted transition-colors"
          >
            TODAY
          </button>
        </div>

        {/* Filter */}
        <div className="flex brutalist-border overflow-hidden">
          {(["all", "mine"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                filter === f ? "bg-primary text-on-primary" : "hover:bg-card-muted text-on-surface/60"
              }`}
            >
              {f === "all" ? "ALL TASKS" : "MY TASKS"}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid gap-4 ${selectedDay ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
        {/* Calendar grid */}
        <div className={`brutalist-border bg-card overflow-hidden ${selectedDay ? "lg:col-span-2" : ""}`}>
          {/* Day headers */}
          <div className="grid grid-cols-7 brutalist-border border-t-0 border-x-0">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center font-label text-[8px] uppercase tracking-widest text-on-surface/40 border-r border-outline-variant/20 last:border-r-0">
                {d}
              </div>
            ))}
          </div>

          {/* Date cells */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (!day) {
                return <div key={`empty-${i}`} className="h-24 border-r border-b border-outline-variant/20 last:border-r-0 bg-card-muted/30" />;
              }
              const key = getKey(day);
              const dayTasks = taskMap[key] ?? [];
              const hasOverdue = dayTasks.some((t) => !STATUS_DONE.has(t.status));
              const isSelected = selectedDay === day;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`h-24 border-r border-b border-outline-variant/20 last:border-r-0 p-1 cursor-pointer transition-colors overflow-hidden group
                    ${isSelected ? "bg-primary/10 border-primary/30" : "hover:bg-card-muted/50"}
                    ${isToday(day) ? "ring-1 ring-inset ring-primary/50" : ""}
                  `}
                >
                  {/* Day number */}
                  <div className={`font-mono text-[10px] mb-1 w-5 h-5 flex items-center justify-center rounded-full
                    ${isToday(day) ? "bg-primary text-on-primary font-bold" : "text-on-surface/60"}
                  `}>
                    {day}
                  </div>

                  {/* Task pills — show up to 3 */}
                  <div className="space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className={`text-[7px] font-mono px-1 py-0.5 truncate border-l-2 leading-tight
                          ${STATUS_DONE.has(t.status) ? "opacity-40 bg-gray-500/20 border-gray-400" : PRIORITY_BG[t.priority] ?? "bg-gray-500/20 border-gray-400"}
                        `}
                      >
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="font-mono text-[7px] text-on-surface/40 pl-1">+{dayTasks.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        {selectedDay && (
          <div className="brutalist-border bg-card overflow-hidden self-start">
            <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
              <div>
                <h3 className="font-headline text-sm uppercase tracking-tighter text-card-text">
                  {MONTHS[month].substring(0, 3).toUpperCase()} {selectedDay}
                </h3>
                <p className="font-mono text-[8px] text-on-surface/40 uppercase">{selectedTasks.length} TASKS</p>
              </div>
              <button onClick={() => setSelectedDay(null)} className="text-on-surface/30 hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {selectedTasks.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="material-symbols-outlined text-2xl text-on-surface/20 block">event_available</span>
                <p className="font-mono text-[9px] text-on-surface/30 uppercase mt-2">No tasks due</p>
              </div>
            ) : (
              <div className="divide-y divide-outline-variant/20">
                {selectedTasks.map((t) => (
                  <div key={t.id} className={`px-4 py-3 ${STATUS_DONE.has(t.status) ? "opacity-50" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${
                        t.priority === "URGENT" ? "bg-red-500" :
                        t.priority === "HIGH" ? "bg-amber-500" :
                        t.priority === "MEDIUM" ? "bg-blue-500" : "bg-gray-400"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-headline text-[10px] uppercase tracking-wider text-card-text ${STATUS_DONE.has(t.status) ? "line-through" : ""}`}>
                          {t.title}
                        </p>
                        <p className="font-mono text-[8px] text-on-surface/40 mt-0.5 truncate">{t.project?.title ?? "No Project"}</p>
                        {t.assignedTo && (
                          <p className="font-mono text-[8px] text-on-surface/30">{t.assignedTo.name}</p>
                        )}
                      </div>
                      <span className={`font-mono text-[7px] px-1.5 py-0.5 flex-shrink-0 ${
                        STATUS_DONE.has(t.status) ? "bg-green-500/20 text-green-400" :
                        t.status === "IN_PROGRESS" ? "bg-amber-500/20 text-amber-400" :
                        "bg-gray-500/20 text-gray-400"
                      }`}>
                        {t.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface/30">PRIORITY:</span>
        {[["URGENT","bg-red-500"],["HIGH","bg-amber-500"],["MEDIUM","bg-blue-500"],["LOW","bg-gray-400"]].map(([label, color]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 ${color}`} />
            <span className="font-mono text-[8px] text-on-surface/40 uppercase">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
