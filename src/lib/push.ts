// =============================================================================
// EOD FLOW — Web Push Notification Service
// Handles: VAPID key generation, subscription management, push sending
// =============================================================================

import webpush from "web-push";

// Configure VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@eodflow.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

/**
 * Send a push notification to a subscription.
 * Fire-and-forget: never blocks the main operation.
 */
export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: PushPayload
) {
  if (!process.env.VAPID_PUBLIC_KEY) {
    console.warn("[PUSH] VAPID keys not configured, skipping");
    return null;
  }

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/overview",
        icon: payload.icon || "/icon-192.png",
        badge: "/icon-192.png",
      })
    );
    return result;
  } catch (error: unknown) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 410 || statusCode === 404) {
      // Subscription expired — caller should delete it
      return { expired: true };
    }
    console.error("[PUSH] Failed to send:", error);
    return null;
  }
}

/**
 * Get the VAPID public key (for client-side subscription).
 */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}
