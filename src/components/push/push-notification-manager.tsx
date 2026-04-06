"use client";

import { useEffect, useState } from "react";

export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (!("Notification" in window)) return;
    setPermission(Notification.permission);

    // Show prompt if not yet decided and not dismissed before
    if (
      Notification.permission === "default" &&
      !localStorage.getItem("push-prompt-dismissed")
    ) {
      // Wait a bit before showing to not overwhelm on first load
      const timer = setTimeout(() => setShowPrompt(true), 10000);
      return () => clearTimeout(timer);
    }
  }, []);

  const requestPermission = async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === "granted") {
      // Subscribe to push
      try {
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID key
        const res = await fetch("/api/push/subscribe");
        const { vapidPublicKey } = await res.json();

        if (!vapidPublicKey) {
          console.warn("[PUSH] No VAPID key available");
          setShowPrompt(false);
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        // Send subscription to server
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subscription: subscription.toJSON() }),
        });
      } catch (error) {
        console.error("[PUSH] Subscription failed:", error);
      }
    }

    setShowPrompt(false);
  };

  const dismiss = () => {
    setShowPrompt(false);
    localStorage.setItem("push-prompt-dismissed", "true");
  };

  if (!showPrompt || permission !== "default") return null;

  return (
    <div className="fixed top-4 right-4 z-[200] bg-card brutalist-border p-4 shadow-lg w-72 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-start gap-2">
        <span className="material-symbols-outlined text-primary text-sm flex-shrink-0 mt-0.5">
          notifications_active
        </span>
        <div>
          <p className="font-headline text-[10px] uppercase tracking-widest text-card-text mb-1">
            ENABLE_NOTIFICATIONS
          </p>
          <p className="font-mono text-[9px] text-on-surface/50 leading-relaxed">
            Get instant alerts for task assignments, mentions, and deadlines
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={requestPermission}
          className="flex-1 py-1.5 bg-primary text-on-primary font-headline text-[9px] uppercase tracking-widest hover:bg-primary/80 transition-colors"
        >
          ENABLE
        </button>
        <button
          onClick={dismiss}
          className="px-4 py-1.5 brutalist-border text-card-text font-headline text-[9px] uppercase tracking-widest hover:bg-card-muted transition-colors"
        >
          LATER
        </button>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
