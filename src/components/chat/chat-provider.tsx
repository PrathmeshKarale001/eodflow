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
  channels: Array<{ id: string; name: string | null; type: string }>;
  currentUserId: string;
}

const UnreadContext = createContext<UnreadContextValue>({
  unreadCounts: {},
  markRead: () => {},
  toasts: [],
  dismissToast: () => {},
  channels: [],
  currentUserId: "",
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

  // Mark a channel as read (when user opens it)
  const markRead = useCallback((channelId: string) => {
    setUnreadCounts((prev) => ({ ...prev, [channelId]: 0 }));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to global notification channel
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat-notifications")
      .on("broadcast", { event: "new-notification" }, (payload) => {
        const data = payload.payload as {
          channelId: string;
          senderId: string;
          senderName: string;
          content: string;
        };

        // Ignore own messages
        if (data.senderId === currentUserId) return;

        // Ignore if we are already in this channel (the active channel subscription handles it)
        const isActive = pathname === `/chat/${data.channelId}`;
        if (isActive) return;

        // Check if user is even a member of this channel
        const isMember = channels.some((c) => c.id === data.channelId);
        if (!isMember) return;

        // Increment unread count
        setUnreadCounts((prev) => ({
          ...prev,
          [data.channelId]: (prev[data.channelId] ?? 0) + 1,
        }));

        // Show toast
        const toastId = `toast-${Date.now()}`;
        const channelName = channels.find((c) => c.id === data.channelId)?.name || "New Message";
        
        setToasts((prev) => [
          {
            id: toastId,
            channelId: data.channelId,
            channelName,
            senderName: data.senderName,
            content: data.content,
            timestamp: Date.now(),
          },
          ...prev,
        ].slice(0, 3));

        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, 5000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, pathname, channels]);

  // Subscribe to the ACTIVE channel specifically
  useEffect(() => {
    const match = pathname.match(/\/chat\/(.+)/);
    if (!match) return;

    const channelId = match[1];
    const channelName = channels.find((c) => c.id === channelId)?.name || "Channel";

    // Mark as read immediately
    markRead(channelId);

    // Subscribe to this specific channel for high-fidelity updates
    // (though the ChatWindow also subscribes, this ensures unread sync)
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${channelId}`)
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
  }, [pathname, channels, currentUserId, markRead]);

  return (
    <UnreadContext.Provider
      value={{
        unreadCounts,
        markRead,
        toasts,
        dismissToast,
        channels,
        currentUserId,
      }}
    >
      {children}
    </UnreadContext.Provider>
  );
}
