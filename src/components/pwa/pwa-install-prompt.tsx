"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}

export function PWAInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          console.log("[PWA] Service worker registered");
          // Force check for updates immediately
          reg.update().catch(() => {});
        })
        .catch((err) => console.warn("[PWA] SW registration failed:", err));
    }

    // Listen for install prompt
    const handler = (e: Event) => {
      // Only capture the prompt if user hasn't dismissed before
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (dismissed) return; // Let browser handle silently — no warning

      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === "accepted") {
      setShowBanner(false);
    }
    setInstallPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-[200] bg-card brutalist-border p-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center bg-primary text-on-primary flex-shrink-0">
          <span className="material-symbols-outlined text-sm">install_mobile</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-headline text-[10px] uppercase tracking-widest text-card-text mb-1">
            INSTALL_APP
          </p>
          <p className="font-mono text-[9px] text-on-surface/50 leading-relaxed">
            Install EOD Flow for quick access and offline support
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleInstall}
          className="flex-1 py-1.5 bg-primary text-on-primary font-headline text-[9px] uppercase tracking-widest hover:bg-primary/80 transition-colors"
        >
          INSTALL
        </button>
        <button
          onClick={handleDismiss}
          className="px-4 py-1.5 brutalist-border text-card-text font-headline text-[9px] uppercase tracking-widest hover:bg-card-muted transition-colors"
        >
          LATER
        </button>
      </div>
    </div>
  );
}
