"use client";

import { useEffect, useCallback, useState } from "react";
import { isNativePlatform } from "@/lib/capacitor";

// ---------------------------------------------------------------------------
// Hook: Auto-registers push subscription on mount
// Shows browser permission prompt if not yet granted.
//
// CAPACITOR BRIDGE: When running inside a Capacitor native shell, this hook
// uses @capacitor/push-notifications (APNs on iOS, FCM on Android) instead
// of the Web Push API. The server-side subscription endpoint remains the same.
// ---------------------------------------------------------------------------

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (isNativePlatform()) {
      // Native Capacitor — push is always "supported"
      setIsSupported(true);
      initNativePush();
    } else {
      // Web browser — check for Web Push API support
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      setIsSupported(supported);
      if (supported) {
        setPermission(Notification.permission);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Native Capacitor Push Setup ─────────────────────────────────────────
  const initNativePush = async () => {
    try {
      // Dynamic import — only loads inside Capacitor, tree-shaken from web bundle
      const { PushNotifications } = await import("@capacitor/push-notifications");

      // Request permission
      const permResult = await PushNotifications.requestPermissions();
      if (permResult.receive === "granted") {
        setPermission("granted");
        await PushNotifications.register();
      } else {
        setPermission("denied");
        return;
      }

      // Listen for registration success — sends device token to our server
      PushNotifications.addListener("registration", async (token) => {
        try {
          await fetch("/api/push/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subscription: {
                // For native push, we send the device token in a format
                // our server can distinguish from web push subscriptions
                endpoint: `capacitor://${token.value}`,
                keys: { p256dh: "", auth: "" },
              },
              userAgent: `Capacitor/${(window as any).Capacitor?.getPlatform?.() ?? "native"}`,
            }),
          });
          setIsSubscribed(true);
        } catch {
          // Server sync failed — will retry on next app launch
        }
      });

      // Handle registration errors
      PushNotifications.addListener("registrationError", (err) => {
        console.error("Native push registration failed:", err);
      });

      // Handle received notifications when app is in foreground
      PushNotifications.addListener("pushNotificationReceived", (notification) => {
        // Show an in-app toast instead of a system notification
        // (system notifications are only shown when app is backgrounded)
        console.log("Push received in foreground:", notification);
      });

      // Handle notification tap (app opened from notification)
      PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
        const url = action.notification.data?.url;
        if (url && typeof window !== "undefined") {
          window.location.href = url;
        }
      });
    } catch (err) {
      console.error("Native push init failed:", err);
    }
  };

  // ─── Web Push Subscribe ──────────────────────────────────────────────────
  const subscribe = useCallback(async () => {
    // If native, push is handled by initNativePush() above
    if (isNativePlatform()) return true;
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

  // Auto-subscribe on mount if permission already granted (web only)
  useEffect(() => {
    if (isNativePlatform()) return; // Native handled by initNativePush
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

