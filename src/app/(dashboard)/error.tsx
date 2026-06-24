"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DASHBOARD_ERROR]", error.message, error.digest, error.stack);
  }, [error]);
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-lg brutalist-border bg-card p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-error">warning</span>
        <h2 className="font-headline text-xl uppercase text-card-text">System Error</h2>
        <p className="font-mono text-[10px] uppercase text-on-surface/50 tracking-widest leading-relaxed">
          {error.message || "An unexpected error occurred while loading this page."}
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-on-surface/30 uppercase">
            DIGEST: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-primary-container text-white px-6 py-3 font-headline uppercase text-sm font-bold hover:brightness-110 transition-all rounded-lg"
          >
            RETRY
          </button>
          <a
            href="/overview"
            className="brutalist-border px-6 py-3 font-headline uppercase text-sm text-foreground hover:bg-card/5 transition-colors"
          >
            HOME
          </a>
        </div>
      </div>
    </div>
  );
}
