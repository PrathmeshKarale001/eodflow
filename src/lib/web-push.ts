// =============================================================================
// EOD FLOW — Web Push Notification Server Utility
// Sends OS-level push notifications via FCM/APNs even when browser is closed
// =============================================================================

import webPush from "web-push";
import { db } from "@/lib/db";

// Configure VAPID credentials
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = "mailto:noreply@eod.media";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ---------------------------------------------------------------------------
// Send push notification to a specific user (all their devices)
// ---------------------------------------------------------------------------

export async function sendPushToUser(
  userId: string,
  payload: {
    title: string;
    body: string;
    url?: string;         // Deep link URL
    icon?: string;
    tag?: string;         // Grouping tag (prevents duplicates)
  }
): Promise<{ sent: number; failed: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("Web Push: VAPID keys not configured, skipping push");
    return { sent: 0, failed: 0 };
  }

  const subscriptions = await db.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
    icon: payload.icon || "/icon-192x192.png",
    tag: payload.tag,
    timestamp: Date.now(),
  });

  let sent = 0;
  let failed = 0;
  const expiredEndpoints: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          pushPayload,
          { TTL: 60 * 60 * 24 } // 24h time-to-live
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 410 Gone or 404 = subscription expired, clean up
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        } else {
          console.error(`Web Push failed for ${sub.endpoint}:`, err.message);
        }
      }
    })
  );

  // Clean up expired subscriptions
  if (expiredEndpoints.length > 0) {
    await db.pushSubscription.deleteMany({
      where: { endpoint: { in: expiredEndpoints } },
    });
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Send push notification to multiple users (batch)
// ---------------------------------------------------------------------------

export async function sendPushToUsers(
  userIds: string[],
  payload: {
    title: string;
    body: string;
    url?: string;
    icon?: string;
    tag?: string;
  }
): Promise<void> {
  await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  );
}
