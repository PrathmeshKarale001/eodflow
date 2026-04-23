import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe — Save push subscription for current user
// Uses Notification record to store subscription details
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { subscription } = await request.json();

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    // Store as a special notification record type
    // First remove any existing push subscription records for this user
    await db.notification.deleteMany({
      where: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "PUSH_SUBSCRIPTION",
      },
    });

    // Create new subscription record
    await db.notification.create({
      data: {
        userId: session.user.id,
        type: "SYSTEM",
        title: "PUSH_SUBSCRIPTION",
        body: JSON.stringify(subscription),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PUSH] Subscription save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// GET /api/push/subscribe — Get VAPID public key
export async function GET() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null;
  return NextResponse.json({ vapidPublicKey: vapidKey });
}
