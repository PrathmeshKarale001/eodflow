"use client";

import { useEffect, useState, useCallback, useRef } from "react";

/**
 * PushNotificationManager — Full Web Push subscription flow.
 *
 * 1. Registers the service worker (sw.js) for push events
 * 2. After a 10s delay, prompts the user to enable notifications
 * 3. On "ENABLE", requests Notification permission + subscribes via PushManager
 * 4. Sends the PushSubscription to /api/push/subscribe for server-side storage
 *
 * Best practices applied:
 * - Never prompts immediately (10s delay)
 * - Respects "LATER" dismiss (localStorage)
 * - Uses VAPID applicationServerKey from env
 * - Graceful error handling (never crashes the app)
 */
export function PushNotificationManager() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [showPrompt, setShowPrompt] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const subscriptionAttempted = useRef(false);

  /**
   * Convert a base64 URL-safe VAPID key to a Uint8Array for PushManager.subscribe()
   */
  const urlBase64ToUint8Array = useCallback((base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }, []);

  /**
   * Ensure a push subscription exists and is saved server-side.
   * Called both after fresh permission grant and on page load (if already granted).
   */
  const ensurePushSubscription = useCallback(async () => {
    if (subscriptionAttempted.current) return;
    subscriptionAttempted.current = true;

    try {
      // 1. Get VAPID public key from server
      const keyRes = await fetch("/api/push/subscribe");
      if (!keyRes.ok) {
        console.warn("[PUSH] Failed to fetch VAPID key:", keyRes.status);
        return;
      }
      const { vapidPublicKey } = await keyRes.json();

      if (!vapidPublicKey) {
        console.warn("[PUSH] No VAPID public key configured on server");
        return;
      }

      // 2. Wait for service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // 3. Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // 4. Create new subscription
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
        console.log("[PUSH] New subscription created");
      }

      // 5. Send subscription to server for storage
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: subscription.toJSON() }),
      });

      if (saveRes.ok) {
        console.log("[PUSH] Subscription saved successfully");
      } else {
        console.error("[PUSH] Failed to save subscription:", saveRes.status);
      }
    } catch (err) {
      console.error("[PUSH] Subscription failed:", err);
      subscriptionAttempted.current = false; // Allow retry on next load
    }
  }, [urlBase64ToUint8Array]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!("serviceWorker" in navigator)) return;

    setPermission(Notification.permission);

    // If already granted, silently ensure subscription exists
    if (Notification.permission === "granted") {
      ensurePushSubscription();
      return;
    }

    // Show prompt if not yet decided and not dismissed before
    if (
      Notification.permission === "default" &&
      !localStorage.getItem("push-prompt-dismissed")
    ) {
      // Wait a bit before showing to not overwhelm on first load
      const timer = setTimeout(() => setShowPrompt(true), 10000);
      return () => clearTimeout(timer);
    }
  }, [ensurePushSubscription]);

  const requestPermission = async () => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    setSubscribing(true);

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);

      if (result === "granted") {
        subscriptionAttempted.current = false; // Reset so ensurePush runs
        await ensurePushSubscription();
      }
    } catch (err) {
      console.error("[PUSH] Permission request failed:", err);
    } finally {
      setSubscribing(false);
    }
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
            Get instant alerts for new messages, task assignments, and status changes
          </p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={requestPermission}
          disabled={subscribing}
          className="flex-1 py-1.5 bg-primary text-on-primary font-headline text-[9px] uppercase tracking-widest hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {subscribing ? "ENABLING..." : "ENABLE"}
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
