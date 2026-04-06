"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "./message-bubble";
import { sendMessage } from "@/app/actions/chat";
import { createClient } from "@/lib/realtime";

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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Subscribe to broadcast for real-time messages
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat-${channelId}`);

    channel
      .on("broadcast", { event: "new-message" }, (payload) => {
        const msg = payload.payload as Message;
        // Avoid duplicates
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      content: input.trim(),
      createdAt: new Date(),
      user: { id: currentUserId, name: "You", image: null },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInput("");

    try {
      const msg = await sendMessage({ channelId, content: input.trim() });

      // Replace optimistic message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? (msg as Message) : m))
      );

      // Broadcast to other clients
      const supabase = createClient();
      const channel = supabase.channel(`chat-${channelId}`);
      await channel.send({
        type: "broadcast",
        event: "new-message",
        payload: msg,
      });
    } catch {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="px-5 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-primary">
            {channelType === "PROJECT" ? "tag" : "person"}
          </span>
          <h2 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
            {channelName}
          </h2>
          <span className="font-mono text-[8px] bg-surface-container-high text-on-surface/60 px-2 py-0.5 uppercase">
            {channelType === "PROJECT" ? "PROJECT" : "DM"}
          </span>
        </div>
        <span className="font-mono text-[9px] text-on-surface/40 uppercase">
          {memberCount} member{memberCount !== 1 ? "s" : ""}
        </span>
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
            <MessageBubble
              key={msg.id}
              content={msg.content}
              userName={msg.user.name}
              userImage={msg.user.image}
              timestamp={msg.createdAt}
              isOwn={msg.user.id === currentUserId}
              fileUrl={msg.fileUrl}
            />
          ))
        )}
      </div>

      {/* Input bar */}
      <div className="px-4 py-3 brutalist-border border-b-0 border-x-0 bg-card flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="flex-1 bg-surface-container-lowest brutalist-border px-3 py-2 text-xs text-on-surface font-mono placeholder:text-on-surface/30 resize-none max-h-24 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="flex h-9 w-9 items-center justify-center bg-primary text-on-primary brutalist-border hover:bg-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
        >
          <span className="material-symbols-outlined text-sm">send</span>
        </button>
      </div>
    </div>
  );
}
