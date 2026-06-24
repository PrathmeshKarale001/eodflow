"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

// ---------------------------------------------------------------------------
// Component: Shows a one-time prompt to enable push notifications
// Disappears after user accepts or dismisses
// ---------------------------------------------------------------------------

export function PushNotificationPrompt() {
  const { isSupported, isSubscribed, permission, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Don't render on server
  if (!mounted) return null;

  // Don't show if:
  // - Not supported
  // - Already subscribed
  // - Already denied (user said no in browser prompt)
  // - User dismissed this prompt
  if (!isSupported || isSubscribed || permission === "denied" || dismissed) return null;

  // Check localStorage to avoid re-showing after dismiss
  if (typeof window !== "undefined" && localStorage.getItem("push-prompt-dismissed")) return null;

  const handleEnable = async () => {
    setIsSubscribing(true);
    await subscribe();
    setIsSubscribing(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="brutalist-border bg-card shadow-lg p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-primary text-xl flex-shrink-0 mt-0.5">
            notifications_active
          </span>
          <div className="min-w-0">
            <h4 className="font-headline text-xs uppercase tracking-widest text-on-surface mb-1">
              ENABLE_NOTIFICATIONS
            </h4>
            <p className="font-body text-xs text-on-surface/70 leading-relaxed">
              Get instant alerts for task assignments, revisions, and messages — even when this tab is closed.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleEnable}
            disabled={isSubscribing}
            className="flex-1 rounded-lg bg-primary-container text-white py-2 font-headline text-[10px] uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">check</span>
            {isSubscribing ? "ENABLING..." : "ENABLE"}
          </button>
          <button
            onClick={handleDismiss}
            className="brutalist-border px-3 py-2 font-headline text-[10px] uppercase tracking-widest text-outline hover:bg-card-muted transition-colors"
          >
            LATER
          </button>
        </div>
      </div>
    </div>
  );
}
