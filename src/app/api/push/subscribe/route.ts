// =============================================================================
// EOD FLOW — Push Subscription API Route
// Manages browser push notification subscriptions using PushSubscription model
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// POST — Subscribe (save push subscription)
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { subscription, userAgent } = await request.json();

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json({ error: "Invalid subscription data" }, { status: 400 });
    }

    // Upsert — update if same endpoint exists, create if new
    await db.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: session.user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null,
      },
      create: {
        userId: session.user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || null,
      },
    });

    // Clean up old hack: remove any PUSH_SUBSCRIPTION notifications
    await db.notification.deleteMany({
      where: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "PUSH_SUBSCRIPTION",
      },
    }).catch(() => {}); // Non-critical cleanup

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PUSH] Subscription save error:", error);
    return NextResponse.json({ error: error.message || "Failed to save" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE — Unsubscribe
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    await db.pushSubscription.deleteMany({
      where: { endpoint, userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[PUSH] Unsubscribe error:", error);
    return NextResponse.json({ error: error.message || "Failed to unsubscribe" }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// GET — Get VAPID public key (client needs this to subscribe)
// ---------------------------------------------------------------------------

export async function GET() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ vapidPublicKey: vapidKey });
}
