"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageBubble } from "./message-bubble";
import { sendMessage } from "@/app/actions/chat";
import { createClient } from "@/lib/realtime";
import { ChatInfoPanel } from "./chat-info-panel";
import { ChatSearch } from "./chat-search";

interface Message {
  id: string;
  content: string;
  fileUrl?: string | null;
  createdAt: Date;
  user: { id: string; name: string; image: string | null };
}

interface ChatWindowProps {
  channelId: string;
  channelName: string;
  channelType: "PROJECT" | "DIRECT" | "GROUP";
  currentUserId: string;
  initialMessages: Message[];
  memberCount: number;
}

export function ChatWindow({
  channelId,
  channelName,
  channelType,
  currentUserId,
  initialMessages,
  memberCount,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // -----------------------------------------------------------------------
  // Subscribe to broadcast for real-time messages (server broadcasts these)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat-${channelId}`);

    channel
      .on("broadcast", { event: "new-message" }, (payload) => {
        const msg = payload.payload as Message;
        setMessages((prev) => {
          // Skip if we already have this message (optimistic or duplicate)
          if (prev.some((m) => m.id === msg.id)) return prev;
          // Replace any temp optimistic message from the same user that matches content
          const withoutOptimistic = prev.filter(
            (m) => !(m.id.startsWith("temp-") && m.user.id === msg.user.id && m.content === msg.content)
          );
          return [...withoutOptimistic, msg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  // -----------------------------------------------------------------------
  // Send text message
  // -----------------------------------------------------------------------
  const handleSend = useCallback(async (fileUrl?: string, fileName?: string) => {
    const content = fileUrl ? (fileName || "📎 Attachment") : input.trim();
    if (!content || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      content,
      fileUrl: fileUrl || undefined,
      createdAt: new Date(),
      user: { id: currentUserId, name: "You", image: null },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    if (!fileUrl) setInput("");

    try {
      const msg = await sendMessage({
        channelId,
        content,
        fileUrl: fileUrl || undefined,
      });

      // Replace optimistic message with the real one from DB
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (msg as Message) : m))
      );
      // NOTE: Server-side broadcast will also send this message to all
      // subscribers (including us), but the duplicate check above handles it.
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [input, sending, currentUserId, channelId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 150);
  }, []);

  // -----------------------------------------------------------------------
  // File attachment upload
  // -----------------------------------------------------------------------
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (50MB max — Supabase free tier)
    if (file.size > 50 * 1024 * 1024) {
      import("react-hot-toast").then(({ toast }) => toast.error("File too large. Maximum size is 50MB."));
      return;
    }

    setUploading(true);
    setUploadProgress(`Uploading ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("pathPrefix", `chats/${channelId}/${currentUserId}`);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const { url } = await res.json();

      // Send a message with the file attached
      await handleSend(url, file.name);
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Upload failed.", { duration: 5000 });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      // Reset file input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full">
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Channel header */}
      <div className="px-5 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/chat" className="md:hidden flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:bg-card/5 hover:text-foreground transition-colors mr-1 flex-shrink-0">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
          </Link>
          <span className="material-symbols-outlined text-sm text-primary flex-shrink-0">
            {channelType === "DIRECT" ? "person" : "tag"}
          </span>
          <h2 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text truncate">
            {channelName}
          </h2>
          <span className="font-mono text-[8px] bg-surface-container-high text-on-surface/60 px-2 py-0.5 uppercase flex-shrink-0">
            {channelType === "DIRECT" ? "DM" : channelType === "GROUP" ? "CHANNEL" : "PROJECT"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowSearch((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center brutalist-border transition-colors ${
              showSearch ? "bg-primary/10 text-primary" : "text-outline hover:text-foreground"
            }`}
          >
            <span className="material-symbols-outlined text-sm">search</span>
          </button>
          <button
            onClick={() => setShowInfoPanel((v) => !v)}
            className={`flex h-7 w-7 items-center justify-center brutalist-border transition-colors ${
              showInfoPanel ? "bg-primary/10 text-primary" : "text-outline hover:text-foreground"
            }`}
          >
            <span className="material-symbols-outlined text-sm">info</span>
          </button>
          <span className="font-mono text-[9px] text-on-surface/40 uppercase hidden sm:inline">
            {memberCount} member{memberCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Search overlay */}
      <div className="relative">
        <ChatSearch
          channelId={channelId}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
          onScrollToMessage={(id: string) => {
            const el = document.getElementById(`msg-${id}`);
            if (el) {
              el.scrollIntoView({ behavior: "smooth", block: "center" });
              el.classList.add("bg-primary/10");
              setTimeout(() => el.classList.remove("bg-primary/10"), 2000);
            }
          }}
        />
      </div>

      {/* Messages area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface-container-lowest"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <span className="material-symbols-outlined text-4xl text-on-surface/20 mb-2">
              chat_bubble_outline
            </span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">
              NO_MESSAGES_YET
            </p>
            <p className="font-mono text-[9px] text-on-surface/20 mt-1">
              Start the conversation
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} id={`msg-${msg.id}`} className="transition-colors duration-500">
            <MessageBubble
              content={msg.content}
              userName={msg.user.name}
              userImage={msg.user.image}
              timestamp={msg.createdAt}
              isOwn={msg.user.id === currentUserId}
              fileUrl={msg.fileUrl}
            />
            </div>
          ))
        )}
      </div>

      {/* Upload progress bar */}
      {uploadProgress && (
        <div className="px-4 py-2 bg-primary/10 brutalist-border border-x-0 border-b-0 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xs text-primary animate-spin">progress_activity</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
              {uploadProgress}
            </span>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-4 pt-3 pb-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] brutalist-border border-b-0 border-x-0 bg-card flex items-end gap-2 flex-shrink-0">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv"
        />

        {/* Attachment button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || sending}
          className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center text-on-surface/60 hover:text-primary hover:bg-primary/10 brutalist-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          title="Attach file"
        >
          <span className="material-symbols-outlined text-sm">attach_file</span>
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-surface-container-lowest brutalist-border px-3 py-2 text-base md:text-xs text-on-surface font-mono placeholder:text-on-surface/30 resize-none max-h-24 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => handleSend()}
          disabled={(!input.trim() && !uploading) || sending}
          className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center bg-primary text-on-primary brutalist-border hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>
    </div>

    {/* Info Panel (slide-out) */}
    <ChatInfoPanel
      channelId={channelId}
      channelName={channelName}
      memberCount={memberCount}
      isOpen={showInfoPanel}
      onClose={() => setShowInfoPanel(false)}
    />
    </div>
  );
}
