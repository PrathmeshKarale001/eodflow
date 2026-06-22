"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/realtime";
import { usePathname, useRouter } from "next/navigation";
import { getRecentUnreadNotifications } from "@/app/actions/notifications";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface Toast {
  id: string;
  channelId: string;
  channelName: string;
  senderName: string;
  content: string;
  timestamp: number;
}

interface UnreadContextValue {
  unreadCounts: Record<string, number>;
  markRead: (channelId: string) => void;
  toasts: Toast[];
  dismissToast: (id: string) => void;
  channels: Array<{ id: string; name: string | null; type: string }>;
  currentUserId: string;
  onlineUsers: Record<string, any>;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCounts: {},
  markRead: () => {},
  toasts: [],
  dismissToast: () => {},
  channels: [],
  currentUserId: "",
  onlineUsers: {},
});

export function useUnread() {
  return useContext(UnreadContext);
}

interface ChatProviderProps {
  children: React.ReactNode;
  channels: Array<{ id: string; name: string | null; type: string }>;
  currentUserId: string;
}

// ─── Helper: show browser notification ────────────────────────────────────────
function showBrowserNotification(title: string, body: string, tag: string) {
  if (
    typeof window !== "undefined" &&
    document.hidden &&
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    try {
      new Notification(title, { body, icon: "/icon-192.png", tag });
    } catch {
      // Silently fail — some browsers block Notification constructor
    }
  }
}

// ─── Notification type icons ──────────────────────────────────────────────────
const NOTIF_ICONS: Record<string, string> = {
  TASK_ASSIGNED: "🔔",
  TASK_STATUS_CHANGED: "🔄",
  COMMENT_ADDED: "💬",
  MENTION: "📢",
  FILE_UPLOADED: "📎",
  DEADLINE_REMINDER: "⏰",
  APPROVAL_REQUESTED: "✅",
  REVISION_REQUESTED: "↩️",
  PROJECT_CREATED: "📁",
};

export function ChatProvider({ children, channels, currentUserId }: ChatProviderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Use refs for values needed in subscription callbacks to avoid re-subscribing
  const pathnameRef = useRef(pathname);
  const channelsRef = useRef(channels);
  useEffect(() => { pathnameRef.current = pathname; }, [pathname]);
  useEffect(() => { channelsRef.current = channels; }, [channels]);

  const markRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Global dedup: tracks notification IDs (from both WebSocket AND polling)
  // Prevents showing the same notification twice regardless of delivery method
  const seenNotifIds = useRef<Set<string>>(new Set());

  // Helper to push a toast (with auto-dismiss)
  const pushToast = useCallback((toast: Toast) => {
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 6000);
  }, []);

  // ─── LAYER 1: WebSocket subscriptions (instant, but unreliable) ─────────────
  // These fire immediately when a broadcast arrives over Supabase Realtime.
  // On Vercel serverless, the server-side HTTP broadcast may fail silently,
  // so Layer 2 (polling) acts as the reliable fallback.
  useEffect(() => {
    if (!currentUserId) return;

    const supabase = createClient();
    const activeChannels: RealtimeChannel[] = [];

    // 1) Chat notifications — global channel for all chat messages
    const chatNotifChannel = supabase
      .channel("chat-notifications")
      .on("broadcast", { event: "new-notification" }, (payload) => {
        const data = payload.payload as {
          channelId: string;
          messageId?: string;
          senderId: string;
          senderName: string;
          content: string;
        };

        if (data.senderId === currentUserId) return;

        const isActive = pathnameRef.current === `/chat/${data.channelId}`;
        if (isActive) return;

        const isMember = channelsRef.current.some((c) => c.id === data.channelId);
        if (!isMember) return;

        const dedupeKey = data.messageId || `${data.channelId}-${data.content}-${data.senderName}`;
        if (seenNotifIds.current.has(dedupeKey)) return;
        seenNotifIds.current.add(dedupeKey);
        setTimeout(() => seenNotifIds.current.delete(dedupeKey), 30000);

        setUnreadCounts((prev) => ({
          ...prev,
          [data.channelId]: (prev[data.channelId] ?? 0) + 1,
        }));

        const channelName = channelsRef.current.find((c) => c.id === data.channelId)?.name || "New Message";
        pushToast({
          id: `toast-${Date.now()}`,
          channelId: data.channelId,
          channelName,
          senderName: data.senderName,
          content: data.content,
          timestamp: Date.now(),
        });

        showBrowserNotification(
          `${data.senderName} • ${channelName}`,
          data.content,
          `chat-${data.channelId}`
        );
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[REALTIME] chat-notifications: SUBSCRIBED ✓");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[REALTIME] chat-notifications: failed →", status);
        }
      });
    activeChannels.push(chatNotifChannel);

    // 2) Task notifications — THE ONLY subscription for this channel
    const taskNotifChannel = supabase
      .channel("task-notifications")
      .on("broadcast", { event: "task-event" }, (payload) => {
        const data = payload.payload as {
          type: string;
          taskId: string;
          taskTitle: string;
          actorName: string;
          actorId: string;
          assigneeIds?: string[];
          oldStatus?: string;
          newStatus?: string;
        };

        router.refresh();

        if (data.actorId === currentUserId) return;

        const isAssignee = data.assigneeIds?.includes(currentUserId);
        if (!isAssignee) return;

        // Dedup with a key based on task ID + type (so polling doesn't re-toast)
        const dedupeKey = `task-${data.taskId}-${data.type}`;
        if (seenNotifIds.current.has(dedupeKey)) return;
        seenNotifIds.current.add(dedupeKey);
        setTimeout(() => seenNotifIds.current.delete(dedupeKey), 30000);

        let title = "Task Update";
        let body = "";
        if (data.type === "TASK_CREATED") {
          title = "New Task Assigned";
          body = `${data.actorName} assigned you: "${data.taskTitle}"`;
        } else if (data.type === "TASK_STATUS_CHANGED") {
          title = "Task Status Changed";
          body = `${data.actorName} moved task to ${data.newStatus?.replace(/_/g, " ")}`;
        }

        pushToast({
          id: `task-toast-${Date.now()}`,
          channelId: data.taskId,
          channelName: title,
          senderName: data.actorName,
          content: body,
          timestamp: Date.now(),
        });

        showBrowserNotification(title, body, `task-${data.taskId}`);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("[REALTIME] task-notifications: SUBSCRIBED ✓");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[REALTIME] task-notifications: failed →", status);
        }
      });
    activeChannels.push(taskNotifChannel);

    // 3) Online presence
    const presenceChannel = supabase.channel("online-users", {
      config: { presence: { key: currentUserId } },
    });
    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const onlineIds: Record<string, any> = {};
        Object.keys(state).forEach((key) => {
          onlineIds[key] = state[key][0];
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            userId: currentUserId,
            onlineAt: new Date().toISOString(),
          });
        }
      });
    activeChannels.push(presenceChannel);

    // ─── Health check: re-subscribe if WebSocket drops ────────────────────────
    const channelHealthCheck = () => {
      activeChannels.forEach((ch) => {
        const state = (ch as any).state;
        const topic = (ch as any).topic || "unknown";
        if (state === "closed" || state === "errored") {
          console.warn(`[REALTIME] ${topic}: ${state} → re-subscribing...`);
          ch.subscribe();
        }
      });
    };

    const reconnectInterval = setInterval(channelHealthCheck, 10_000);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        channelHealthCheck();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(reconnectInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      activeChannels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [currentUserId, router, pushToast]);

  // ─── LAYER 2: Database polling fallback (reliable, ~15s delay) ──────────────
  // This is the production-grade approach used by ClickUp, Slack, etc.
  // WebSocket is "best effort" — polling is the safety net.
  //
  // Every 15 seconds, we query the database for unread notifications created
  // in the last 30 seconds. Any notification not already shown via WebSocket
  // (tracked by seenNotifIds dedup set) gets shown as a toast.
  //
  // This guarantees notifications are ALWAYS delivered, even if:
  // - The server-side HTTP broadcast to Supabase fails
  // - The WebSocket connection drops
  // - The Vercel serverless function freezes before broadcast completes
  useEffect(() => {
    if (!currentUserId) return;

    const poll = async () => {
      try {
        const recent = await getRecentUnreadNotifications(30);

        for (const notif of recent) {
          // Skip if we already showed this via WebSocket (dedup)
          if (seenNotifIds.current.has(notif.id)) continue;

          // Mark as seen so we don't show it again
          seenNotifIds.current.add(notif.id);
          setTimeout(() => seenNotifIds.current.delete(notif.id), 60000);

          // Show toast
          const icon = NOTIF_ICONS[notif.type] || "🔔";
          pushToast({
            id: `poll-${notif.id}`,
            channelId: notif.linkUrl || "/tasks",
            channelName: `${icon} ${notif.title}`,
            senderName: "",
            content: notif.body || "",
            timestamp: Date.now(),
          });

          // Browser notification
          showBrowserNotification(
            notif.title,
            notif.body || "",
            `notif-${notif.id}`
          );

          // Refresh server components
          router.refresh();
        }
      } catch {
        // Polling is best-effort — never crash the app
      }
    };

    // First poll after 5s (give WebSocket a chance first)
    const initialTimeout = setTimeout(poll, 5000);

    // Then poll every 15s
    const pollInterval = setInterval(poll, 15_000);

    // Also poll immediately when tab becomes visible (mobile comeback)
    const handleVisibilityPoll = () => {
      if (document.visibilityState === "visible") {
        poll();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityPoll);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityPoll);
    };
  }, [currentUserId, router, pushToast]);

  // ─── Active chat channel subscription (mark-as-read) ────────────────────────
  // Only this one depends on pathname — and it's lightweight (no toasts)
  useEffect(() => {
    const match = pathname.match(/\/chat\/(.+)/);
    if (!match) return;

    const channelId = match[1];
    markRead(channelId);

    const supabase = createClient();
    const channel = supabase
      .channel(`chat-active-${channelId}`)
      .on("broadcast", { event: "new-message" }, (payload) => {
        const msg = payload.payload as { user: { id: string } };
        if (msg.user.id !== currentUserId) {
          markRead(channelId);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pathname, currentUserId, markRead]);

  const [onlineUsers, setOnlineUsers] = useState<Record<string, any>>({});

  return (
    <UnreadContext.Provider
      value={{
        unreadCounts,
        markRead,
        toasts,
        dismissToast,
        channels,
        currentUserId,
        onlineUsers,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}
