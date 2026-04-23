"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ─── PERF: Render skeleton placeholder during SSR instead of null ──────────
  // Returning null causes CLS when the button pops in after hydration.
  // This placeholder matches the exact dimensions of the final button.
  if (!mounted) {
    return (
      <div
        className="brutalist-border bg-card p-2 w-[40px] h-[40px]"
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="brutalist-border bg-card p-2 hover:bg-surface-container-high transition-colors relative group"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="material-symbols-outlined text-lg text-on-surface">
        {isDark ? "light_mode" : "dark_mode"}
      </span>
    </button>
  );
}

