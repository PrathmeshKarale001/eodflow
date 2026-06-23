"use client";

import { useUnread } from "./chat-provider";
import { useRouter } from "next/navigation";

// Determine the right link and label for each toast type
function getToastAction(toast: { id: string; channelId: string }) {
  // Polling-based notification toasts — channelId is a URL path (e.g., "/tasks")
  if (toast.id.startsWith("poll-")) {
    return {
      href: toast.channelId.startsWith("/") ? toast.channelId : "/tasks",
      label: "View",
      icon: "open_in_new",
    };
  }
  // Task event toasts from WebSocket
  if (toast.id.startsWith("task-toast")) {
    return { href: "/tasks", label: "View tasks", icon: "arrow_forward" };
  }
  // Chat message toasts
  return {
    href: `/chat/${toast.channelId}`,
    label: "Open chat",
    icon: "arrow_forward",
  };
}

export function ChatToastContainer() {
  const { toasts, dismissToast } = useUnread();
  const router = useRouter();

  if (toasts.length === 0) return null;

  const handleToastClick = (toast: (typeof toasts)[0]) => {
    const action = getToastAction(toast);
    dismissToast(toast.id);
    // Use router.push + refresh instead of <Link> so the server component
    // refetches channel data even when we're already on /chat
    router.push(action.href);
    router.refresh();
  };

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const action = getToastAction(toast);
        const isTaskOrNotif = toast.id.startsWith("task-toast") || toast.id.startsWith("poll-");

        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-start gap-3 bg-card brutalist-border shadow-xl w-72 overflow-hidden animate-slide-in-right"
            style={{
              animation: "slideInRight 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
            }}
          >
            {/* Accent bar — purple for chat, green for task/notification */}
            <div
              className={`w-1 flex-shrink-0 self-stretch ${isTaskOrNotif ? "bg-green-500" : "bg-primary"}`}
            />

            <div className="flex-1 py-3 pr-3 min-w-0">
              {/* Header */}
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`material-symbols-outlined text-[11px] flex-shrink-0 ${isTaskOrNotif ? "text-green-500" : "text-primary"}`}
                  >
                    {isTaskOrNotif ? "notifications_active" : "chat_bubble"}
                  </span>
                  <span
                    className={`font-headline text-[10px] uppercase tracking-[0.2em] truncate ${isTaskOrNotif ? "text-green-500" : "text-primary"}`}
                  >
                    {toast.channelName}
                  </span>
                </div>
                <button
                  onClick={() => dismissToast(toast.id)}
                  className="text-on-surface/30 hover:text-on-surface transition-colors flex-shrink-0"
                >
                  <span className="material-symbols-outlined text-xs">close</span>
                </button>
              </div>

              {/* Sender (only show if present) */}
              {toast.senderName && (
                <p className="font-headline text-[11px] uppercase tracking-wider text-card-text">
                  {toast.senderName}
                </p>
              )}

              {/* Message preview */}
              {toast.content && (
                <p className="font-mono text-[10px] text-on-surface/70 mt-0.5 line-clamp-2 leading-relaxed">
                  {toast.content}
                </p>
              )}

              {/* Action — now a button with router.push instead of Link */}
              <button
                onClick={() => handleToastClick(toast)}
                className={`inline-flex items-center gap-1 mt-2 font-mono text-[10px] uppercase tracking-widest transition-colors ${
                  isTaskOrNotif
                    ? "text-green-500 hover:text-green-400"
                    : "text-primary hover:text-primary/70"
                }`}
              >
                <span>{action.label}</span>
                <span className="material-symbols-outlined text-[11px]">{action.icon}</span>
              </button>
            </div>
          </div>
        );
      })}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
