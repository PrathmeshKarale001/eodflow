"use client";

import { useUnread } from "./chat-provider";
import Link from "next/link";

export function ChatToastContainer() {
  const { toasts, dismissToast } = useUnread();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 bg-card brutalist-border shadow-xl w-72 overflow-hidden animate-slide-in-right"
          style={{
            animation: "slideInRight 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
        >
          {/* Accent bar */}
          <div className="w-1 bg-primary flex-shrink-0 self-stretch" />

          <div className="flex-1 py-3 pr-3 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="material-symbols-outlined text-[11px] text-primary flex-shrink-0">
                  chat_bubble
                </span>
                <span className="font-headline text-[8px] uppercase tracking-[0.2em] text-primary truncate">
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

            {/* Sender */}
            <p className="font-headline text-[9px] uppercase tracking-wider text-card-text">
              {toast.senderName}
            </p>

            {/* Message preview */}
            <p className="font-mono text-[10px] text-on-surface/70 mt-0.5 line-clamp-2 leading-relaxed">
              {toast.content}
            </p>

            {/* Action */}
            <Link
              href={toast.id.startsWith("task-toast") ? `/tasks` : `/chat/${toast.channelId}`}
              onClick={() => dismissToast(toast.id)}
              className="inline-flex items-center gap-1 mt-2 font-mono text-[8px] uppercase tracking-widest text-primary hover:text-primary/70 transition-colors"
            >
              <span>{toast.id.startsWith("task-toast") ? "View tasks" : "Open channel"}</span>
              <span className="material-symbols-outlined text-[9px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(120%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
