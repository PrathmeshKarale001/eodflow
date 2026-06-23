"use client";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[100dvh] px-4">
      <div className="w-full max-w-md brutalist-border bg-surface-container-lowest p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-error">error</span>
        <h2 className="font-headline text-xl uppercase text-white">Something Went Wrong</h2>
        <p className="font-mono text-[10px] uppercase text-on-surface/50 tracking-widest">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="font-mono text-[10px] text-on-surface/30 uppercase">
            REF: {error.digest}
          </p>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="bg-primary-container text-white px-6 py-3 font-headline uppercase text-sm font-bold hover:bg-card hover:text-black transition-all mono-clip"
          >
            RETRY
          </button>
          <a
            href="/login"
            className="brutalist-border px-6 py-3 font-headline uppercase text-sm text-foreground hover:bg-card/5 transition-colors flex items-center gap-2"
          >
            LOGIN
          </a>
        </div>
      </div>
    </div>
  );
}
