"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || "");
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");

  // Sync state if URL changes elsewhere (e.g., reset button)
  useEffect(() => {
    setStartDate(searchParams.get("startDate") || "");
    setEndDate(searchParams.get("endDate") || "");
  }, [searchParams]);

  const handleApply = (start = startDate, end = endDate) => {
    const params = new URLSearchParams(searchParams.toString());
    if (start) {
      params.set("startDate", start);
    } else {
      params.delete("startDate");
    }
    if (end) {
      params.set("endDate", end);
    } else {
      params.delete("endDate");
    }
    router.push(`/overview?${params.toString()}`);
  };

  const handlePreset = (type: "this-week" | "last-30-days" | "this-month" | "reset") => {
    let start = "";
    let end = "";

    const today = new Date();
    if (type === "this-week") {
      const first = today.getDate() - today.getDay();
      const firstDay = new Date(today.setDate(first));
      firstDay.setHours(0, 0, 0, 0);
      start = firstDay.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    } else if (type === "last-30-days") {
      const prior = new Date();
      prior.setDate(prior.getDate() - 30);
      start = prior.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    } else if (type === "this-month") {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      start = firstDay.toISOString().split("T")[0];
      end = new Date().toISOString().split("T")[0];
    }

    setStartDate(start);
    setEndDate(end);
    handleApply(start, end);
  };

  return (
    <div className="brutalist-border bg-card p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t-4 border-t-primary shadow-[4px_4px_0px_#000000]">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xl text-on-surface/50">calendar_today</span>
          <span className="font-mono text-xs uppercase tracking-widest text-on-surface/70">Date Filter:</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="brutalist-border bg-surface text-on-surface px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <span className="font-mono text-xs text-on-surface/50">to</span>
          <div className="flex flex-col">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="brutalist-border bg-surface text-on-surface px-2 py-1 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>
        <button
          onClick={() => handleApply()}
          className="brutalist-border bg-primary text-white hover:bg-primary/90 px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-all active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_#000000]"
        >
          Apply
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => handlePreset("this-week")}
          className="brutalist-border bg-surface hover:bg-surface-container-high px-3 py-1 text-[10px] font-mono uppercase tracking-wider shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
        >
          This Week
        </button>
        <button
          onClick={() => handlePreset("last-30-days")}
          className="brutalist-border bg-surface hover:bg-surface-container-high px-3 py-1 text-[10px] font-mono uppercase tracking-wider shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
        >
          Last 30 Days
        </button>
        <button
          onClick={() => handlePreset("this-month")}
          className="brutalist-border bg-surface hover:bg-surface-container-high px-3 py-1 text-[10px] font-mono uppercase tracking-wider shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
        >
          This Month
        </button>
        {(startDate || endDate) && (
          <button
            onClick={() => handlePreset("reset")}
            className="brutalist-border bg-error text-white hover:bg-error/90 px-3 py-1 text-[10px] font-mono uppercase tracking-wider shadow-[2px_2px_0px_#000000] active:translate-x-0.5 active:translate-y-0.5"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
