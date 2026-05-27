"use client";

import { useEffect, useCallback, useState } from "react";

// ---------------------------------------------------------------------------
// Hook: Auto-registers push subscription on mount
// Shows browser permission prompt if not yet granted
// ---------------------------------------------------------------------------

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;

    try {
      // 1. Register service worker if not already
      const registration = await navigator.serviceWorker.ready;

      // 2. Get VAPID public key
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.warn("Push: VAPID public key not configured");
        return false;
      }

      // 3. Subscribe to push (browser will prompt user if needed)
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      // 4. Send subscription to our server
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setPermission("granted");
        return true;
      }

      return false;
    } catch (err: any) {
      console.error("Push subscription failed:", err);
      if (err.name === "NotAllowedError") {
        setPermission("denied");
      }
      return false;
    }
  }, [isSupported]);

  // Auto-subscribe on mount if permission already granted
  useEffect(() => {
    if (!isSupported) return;

    const checkExisting = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        if (existing) {
          setIsSubscribed(true);
          // Re-sync to server (handles device migration)
          fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: existing.toJSON(),
              userAgent: navigator.userAgent,
            }),
          }).catch(() => {});
        } else if (Notification.permission === "granted") {
          // Permission granted but no subscription — auto-subscribe
          subscribe();
        }
      } catch {
        // SW not ready yet, will try on next visit
      }
    };

    checkExisting();
  }, [isSupported, subscribe]);

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
  };
}

// ---------------------------------------------------------------------------
// Convert VAPID key from base64 to Uint8Array (required by PushManager)
// ---------------------------------------------------------------------------

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
