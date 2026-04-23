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
}

/**
 * Custom styled select dropdown — matches the app's brutalist dark design.
 * Replaces native <select> which renders with ugly OS chrome.
 */
export function AppSelect({
  options,
  value,
  onChange,
  placeholder = "— SELECT —",
  className,
  disabled = false,
}: AppSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  return (
    <div ref={ref} className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
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
            "shadow-[4px_4px_0px_var(--clr-primary-container)]",
            "overflow-hidden"
          )}
        >
          {/* Empty / placeholder row */}
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); }}
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
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
