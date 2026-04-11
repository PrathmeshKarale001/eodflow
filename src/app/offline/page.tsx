"use client";

export const dynamic = "force-dynamic";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <div className="text-center p-8 max-w-md">
        <div className="flex h-16 w-16 items-center justify-center mx-auto mb-4 bg-surface-container text-on-surface/30">
          <span className="material-symbols-outlined text-3xl">cloud_off</span>
        </div>
        <h1 className="font-headline text-lg uppercase tracking-widest text-foreground mb-2">
          OFFLINE
        </h1>
        <p className="font-mono text-xs text-on-surface/50 leading-relaxed mb-6">
          You appear to be offline. Check your internet connection and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-primary text-on-primary font-headline text-[10px] uppercase tracking-widest brutalist-border hover:bg-primary/80 transition-colors"
        >
          RETRY_CONNECTION
        </button>
      </div>
    </div>
  );
}
