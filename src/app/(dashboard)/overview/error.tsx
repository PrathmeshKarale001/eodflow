"use client";

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="brutalist-border bg-surface-container p-8 max-w-lg w-full text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-error">error</span>
        <h2 className="text-xl font-headline uppercase tracking-tight">DASHBOARD_LOAD_ERROR</h2>
        <p className="font-mono text-xs text-on-surface/60">
          {error.digest ? `DIGEST: ${error.digest}` : "An unexpected error occurred loading the dashboard."}
        </p>
        <pre className="text-xs text-left bg-surface p-3 rounded overflow-auto max-h-32 font-mono text-error/80">
          {error.message || "Unknown error"}
        </pre>
        <button
          onClick={reset}
          className="brutalist-border px-6 py-2 font-mono text-sm uppercase tracking-widest hover:bg-primary hover:text-on-primary transition-colors"
        >
          RETRY_CONNECTION →
        </button>
      </div>
    </div>
  );
}
