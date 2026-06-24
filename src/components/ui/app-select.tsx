"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
}

interface AppSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchable?: boolean;
}

/**
 * Custom styled select dropdown — matches the app's design system.
 * Includes built-in search for long option lists (>5 options or searchable=true).
 */
export function AppSelect({
  options,
  value,
  onChange,
  placeholder = "— Select —",
  className,
  disabled = false,
  searchable,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 5;

  const filteredOptions = showSearch && search.trim()
    ? options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setSearch(""); }
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (open && showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open, showSearch]);

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) { setOpen((o) => !o); setSearch(""); } }}
        className={cn(
          "w-full h-12 flex items-center justify-between gap-2 px-4",
          "brutalist-border bg-[var(--clr-surface-low)] text-[var(--fg)]",
          "font-mono text-xs uppercase tracking-widest",
          "transition-all duration-150",
          open && "border-[var(--clr-primary)] bg-[var(--clr-surface-container)]",
          !open && "hover:border-[var(--clr-outline)] hover:bg-[var(--clr-surface-container)]",
          disabled && "opacity-40 cursor-not-allowed"
        )}
      >
        <span className={cn("truncate", !selected && "text-[var(--clr-outline)]")}>
          {selected ? selected.label : placeholder}
        </span>
        <span
          className={cn(
            "material-symbols-outlined text-[18px] text-[var(--clr-outline)] flex-shrink-0 transition-transform duration-150",
            open && "rotate-180 text-[var(--clr-primary)]"
          )}
        >
          expand_more
        </span>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute z-50 w-full top-full mt-0.5",
            "brutalist-border bg-[var(--clr-surface-low)]",
            "shadow-lg",
            "overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150"
          )}
        >
          {/* Search input — shown when there are many options */}
          {showSearch && (
            <div className="p-2 border-b border-[var(--clr-card-border)]">
              <div className="flex items-center gap-2 px-2 py-1.5 bg-[var(--clr-surface-container)] brutalist-border">
                <span className="material-symbols-outlined text-sm text-[var(--clr-outline)]">search</span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="flex-1 bg-transparent font-mono text-xs text-[var(--fg)] placeholder:text-[var(--clr-outline)] focus:outline-none"
                />
                {search && (
                  <button type="button" onClick={() => setSearch("")} className="text-[var(--clr-outline)] hover:text-[var(--fg)]">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Empty / placeholder row */}
          {placeholder && !search && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setSearch(""); }}
              className={cn(
                "w-full text-left px-4 py-2.5 font-mono text-[10px] uppercase tracking-widest",
                "text-[var(--clr-outline)] border-b border-[var(--clr-card-border)]",
                "hover:bg-[var(--clr-surface-container)] hover:text-[var(--fg)] transition-colors"
              )}
            >
              {placeholder}
            </button>
          )}

          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-center">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--clr-outline)]">
                  No matches found
                </span>
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full text-left px-4 py-2.5 font-mono text-xs uppercase tracking-widest",
                    "transition-colors duration-100",
                    opt.value === value
                      ? "bg-[var(--clr-primary-container)] text-white"
                      : "text-[var(--fg)] hover:bg-[var(--clr-surface-container)] hover:text-[var(--clr-primary)]"
                  )}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
