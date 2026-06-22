"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/realtime";
import { usePathname, useRouter } from "next/navigation";
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

  // Dedup seen notification IDs
  const seenNotifIds = useRef<Set<string>>(new Set());

  // Helper to push a toast (with auto-dismiss)
  const pushToast = useCallback((toast: Toast) => {
    setToasts((prev) => [toast, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== toast.id));
    }, 5000);
  }, []);

  // ─── SINGLE consolidated realtime subscription ──────────────────────────────
  // All broadcast channels are subscribed once and never re-subscribed on nav.
  // This fixes the "hibernate" issue where changing pages killed subscriptions.
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

        // Check if user is on this channel right now
        const isActive = pathnameRef.current === `/chat/${data.channelId}`;
        if (isActive) return;

        // Check membership
        const isMember = channelsRef.current.some((c) => c.id === data.channelId);
        if (!isMember) return;

        // Dedup
        const dedupeKey = data.messageId || `${data.channelId}-${data.content}-${data.senderName}`;
        if (seenNotifIds.current.has(dedupeKey)) return;
        seenNotifIds.current.add(dedupeKey);
        setTimeout(() => seenNotifIds.current.delete(dedupeKey), 10000);

        // Increment unread
        setUnreadCounts((prev) => ({
          ...prev,
          [data.channelId]: (prev[data.channelId] ?? 0) + 1,
        }));

        // Toast
        const channelName = channelsRef.current.find((c) => c.id === data.channelId)?.name || "New Message";
        pushToast({
          id: `toast-${Date.now()}`,
          channelId: data.channelId,
          channelName,
          senderName: data.senderName,
          content: data.content,
          timestamp: Date.now(),
        });

        // Browser notification
        showBrowserNotification(
          `${data.senderName} • ${channelName}`,
          data.content,
          `chat-${data.channelId}`
        );
      })
      .subscribe();
    activeChannels.push(chatNotifChannel);

    // 2) Task notifications — SINGLE subscription (was previously duplicated
    //    between ChatProvider and useTaskRealtime, causing one to silently fail)
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

        // Always refresh server data (replaces useTaskRealtime)
        router.refresh();

        // Skip toast for own actions
        if (data.actorId === currentUserId) return;

        // Only toast if user is an assignee
        const isAssignee = data.assigneeIds?.includes(currentUserId);
        if (!isAssignee) return;

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
      .subscribe();
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

    // ─── Reconnection: re-subscribe if Supabase websocket reconnects ─────────
    // Supabase client emits system events we can listen to
    const reconnectInterval = setInterval(() => {
      activeChannels.forEach((ch) => {
        // If a channel's state is "closed" or "errored", force re-subscribe
        const state = (ch as any).state;
        if (state === "closed" || state === "errored") {
          console.warn(`[REALTIME] Channel ${(ch as any).topic} in ${state} state, re-subscribing...`);
          ch.subscribe();
        }
      });
    }, 15_000); // Check every 15s

    return () => {
      clearInterval(reconnectInterval);
      activeChannels.forEach((ch) => supabase.removeChannel(ch));
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
