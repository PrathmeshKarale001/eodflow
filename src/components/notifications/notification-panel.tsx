"use client";

import { useState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { getNotifications, markAsRead, markAllAsRead } from "@/app/actions/notifications";
import { NotificationType } from "@prisma/client";

const TYPE_ICONS: Record<string, string> = {
  TASK_ASSIGNED: "assignment_ind",
  TASK_STATUS_CHANGED: "swap_horiz",
  COMMENT_ADDED: "chat",
  MENTION: "alternate_email",
  FILE_UPLOADED: "upload_file",
  DEADLINE_REMINDER: "alarm",
  APPROVAL_REQUESTED: "verified",
  REVISION_REQUESTED: "undo",
  PROJECT_CREATED: "create_new_folder",
};

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}

interface NotificationPanelProps {
  userId: string;
  onClose: () => void;
  onMarkAllRead: () => void;
  onCountRefresh: () => void;
}

export function NotificationPanel({ userId, onClose, onMarkAllRead, onCountRefresh }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    getNotifications(userId)
      .then(setNotifications)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [userId]);

  const handleMarkRead = (notifId: string) => {
    startTransition(async () => {
      try {
        await markAsRead(notifId);
        setNotifications((prev) => prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)));
        onCountRefresh();
      } catch (err) {
        console.error("Mark read failed:", err);
      }
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      try {
        await markAllAsRead(userId);
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        onMarkAllRead();
      } catch (err) {
        console.error("Mark all read failed:", err);
      }
    });
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-card brutalist-border border-l-2 border-black shadow-[-8px_0_0_rgba(0,0,0,0.1)] animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-5 py-4 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
          <h2 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text flex items-center gap-2">
            <span className="material-symbols-outlined text-base">notifications</span>
            NOTIFICATIONS
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              className="font-mono text-[9px] uppercase tracking-widest text-card-text hover:underline"
            >
              MARK_ALL_READ
            </button>
            <button onClick={onClose} className="hover:bg-neutral-200 p-1 transition-colors">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto h-[calc(100%-100px)]" style={{ contentVisibility: "auto" }}>
          {isLoading ? (
            <div className="p-8 text-center">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground animate-pulse">
                LOADING...
              </p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-3xl text-green-400 mb-3 block">
                notifications_active
              </span>
              <p className="font-mono text-xs uppercase tracking-widest text-green-600">ALL_CAUGHT_UP</p>
              <p className="font-mono text-[9px] text-muted-foreground mt-1">No new notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-outline-variant/30">
              {notifications.map((notif) => {
                const icon = TYPE_ICONS[notif.type] || "circle_notifications";

                return (
                  <button
                    key={notif.id}
                    onClick={() => {
                      handleMarkRead(notif.id);
                      if (notif.linkUrl) {
                        onClose();
                        router.push(notif.linkUrl);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-surface-container-high transition-colors flex items-start gap-3 ${
                      !notif.isRead ? "border-l-3 border-l-[#5847d2] bg-purple-50/50" : ""
                    }`}
                  >
                    <span className={`material-symbols-outlined text-lg flex-shrink-0 mt-0.5 ${!notif.isRead ? "text-card-text" : "text-neutral-400"}`}>
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={`font-headline text-[10px] uppercase tracking-wide leading-tight ${!notif.isRead ? "text-card-text" : "text-neutral-600"}`}>
                        {notif.title}
                      </p>
                      {notif.body ? (
                        <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notif.body}
                        </p>
                      ) : null}
                      <span className="font-mono text-[8px] text-muted-foreground mt-1 block">
                        {formatTime(notif.createdAt)}
                        {notif.linkUrl && " • TAP TO OPEN"}
                      </span>
                    </div>
                    {!notif.isRead ? (
                      <span className="w-2 h-2 bg-[#5847d2] rounded-full flex-shrink-0 mt-1" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — notification count */}
        <div className="absolute bottom-0 left-0 right-0 px-5 py-3 brutalist-border border-b-0 border-x-0 bg-card-muted">
          <p className="font-mono text-[9px] text-center uppercase tracking-widest text-on-surface/40">
            {notifications.filter((n) => !n.isRead).length} UNREAD · {notifications.length} TOTAL
          </p>
        </div>
      </div>
    </>
  );
}
