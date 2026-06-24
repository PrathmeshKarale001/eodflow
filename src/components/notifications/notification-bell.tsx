"use client";

import { useState, useEffect, startTransition } from "react";
import dynamic from "next/dynamic";
import { getUnreadCount } from "@/app/actions/notifications";
import { subscribeToNotifications } from "@/lib/realtime";

// ─── PERF: Lazy-load panel (only shown on click) ────────────────────────────
const NotificationPanel = dynamic(
  () => import("./notification-panel").then((m) => m.NotificationPanel),
  { ssr: false }
);

interface NotificationBellProps {
  userId: string;
  initialCount: number;
}

export function NotificationBell({ userId, initialCount }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [showPanel, setShowPanel] = useState(false);

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = subscribeToNotifications(userId, () => {
      // On new notification, increment count and refetch
      setUnreadCount((prev) => prev + 1);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  const handleToggle = () => {
    setShowPanel(!showPanel);
  };

  const handleMarkAllRead = () => {
    setUnreadCount(0);
  };

  const handleCountRefresh = () => {
    startTransition(async () => {
      const count = await getUnreadCount(userId);
      setUnreadCount(count);
    });
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className="relative p-2 hover:bg-neutral-100 transition-colors brutalist-border"
        aria-label={`Notifications (${unreadCount} unread)`}
      >
        <span className="material-symbols-outlined text-xl text-card-text">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center bg-red-600 text-white font-mono text-[11px] font-bold px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {showPanel ? (
        <NotificationPanel
          userId={userId}
          onClose={() => setShowPanel(false)}
          onMarkAllRead={handleMarkAllRead}
          onCountRefresh={handleCountRefresh}
        />
      ) : null}
    </>
  );
}
