"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/realtime";
import { usePathname } from "next/navigation";
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
  subscribeToChannel: (channelId: string, channelName: string, currentUserId: string) => void;
  unsubscribeFromChannel: (channelId: string) => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCounts: {},
  markRead: () => {},
  toasts: [],
  dismissToast: () => {},
  subscribeToChannel: () => {},
  unsubscribeFromChannel: () => {},
});

export function useUnread() {
  return useContext(UnreadContext);
}

interface ChatProviderProps {
  children: React.ReactNode;
  channels: Array<{ id: string; name: string | null; type: string }>;
  currentUserId: string;
}

export function ChatProvider({ children, channels, currentUserId }: ChatProviderProps) {
  const pathname = usePathname();
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const subscriptionsRef = useRef<Record<string, RealtimeChannel>>({});

  // Mark a channel as read (when user opens it)
  const markRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const subscribeToChannel = useCallback(
    (channelId: string, channelName: string, userId: string) => {
      if (subscriptionsRef.current[channelId]) return; // already subscribed

      const supabase = createClient();
      const sub = supabase
        .channel(`chat-${channelId}`)
        .on("broadcast", { event: "new-message" }, (payload) => {
          const msg = payload.payload as {
            id: string;
            content: string;
            user: { id: string; name: string };
          };

          // Ignore own messages
          if (msg.user.id === userId) return;

          // Determine if the user is currently viewing this channel
          const isActive = window.location.pathname === `/chat/${channelId}`;

          if (!isActive) {
            // Increment unread count
            setUnreadCounts((prev) => ({
              ...prev,
              [channelId]: (prev[channelId] ?? 0) + 1,
            }));

            // Show toast
            const toastId = `toast-${Date.now()}-${Math.random()}`;
            const newToast: Toast = {
              id: toastId,
              channelId,
              channelName,
              senderName: msg.user.name,
              content: msg.content,
              timestamp: Date.now(),
            };
            setToasts((prev) => [newToast, ...prev].slice(0, 3)); // max 3

            // Auto-dismiss after 5s
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toastId));
            }, 5000);
          }
        })
        .subscribe();

      subscriptionsRef.current[channelId] = sub;
    },
    []
  );

  const unsubscribeFromChannel = useCallback((channelId: string) => {
    const sub = subscriptionsRef.current[channelId];
    if (sub) {
      const supabase = createClient();
      supabase.removeChannel(sub);
      delete subscriptionsRef.current[channelId];
    }
  }, []);

  // Subscribe to all channels on mount
  useEffect(() => {
    channels.forEach((ch) => {
      const name = ch.name || ch.type;
      subscribeToChannel(ch.id, name, currentUserId);
    });

    return () => {
      Object.keys(subscriptionsRef.current).forEach(unsubscribeFromChannel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels.length]);

  // Auto-mark current channel as read when pathname changes
  useEffect(() => {
    const match = pathname.match(/\/chat\/(.+)/);
    if (match) {
      markRead(match[1]);
    }
  }, [pathname, markRead]);

  return (
    <UnreadContext.Provider
      value={{
        unreadCounts,
        markRead,
        toasts,
        dismissToast,
        subscribeToChannel,
        unsubscribeFromChannel,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}
