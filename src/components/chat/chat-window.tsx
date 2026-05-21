"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { MessageBubble } from "./message-bubble";
import { EmojiPicker } from "./emoji-picker";
import { MentionAutocomplete } from "./mention-autocomplete";
import {
  sendMessage,
  getMessagesAroundTarget,
  addReaction,
  removeReaction,
  editMessage,
  deleteMessage,
  getChannelMembers,
} from "@/app/actions/chat";
import { createClient, broadcastTyping } from "@/lib/realtime";
import { ChatInfoPanel } from "./chat-info-panel";
import { ChatSearch } from "./chat-search";
import { useSession } from "@/lib/auth-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Reaction {
  id: string;
  emoji: string;
  user: { id: string; name: string };
}

interface ReplyTo {
  id: string;
  content: string;
  isDeleted: boolean;
  user: { id: string; name: string };
}

interface Message {
  id: string;
  content: string;
  fileUrl?: string | null;
  createdAt: Date;
  user: { id: string; name: string; image: string | null };
  reactions?: Reaction[];
  replyTo?: ReplyTo | null;
  isDeleted?: boolean;
  editedAt?: Date | null;
}

interface MentionUser {
  id: string;
  name: string;
  image?: string | null;
}

interface ChatWindowProps {
  channelId: string;
  channelName: string;
  channelType: "PROJECT" | "DIRECT" | "GROUP";
  currentUserId: string;
  initialMessages: Message[];
  memberCount: number;
}

// ---------------------------------------------------------------------------
// Date separator helper
// ---------------------------------------------------------------------------

function getDateLabel(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = today.getTime() - msgDate.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-IN", { weekday: "long" });
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function isSameDay(a: Date, b: Date): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatWindow({
  channelId,
  channelName,
  channelType,
  currentUserId,
  initialMessages,
  memberCount,
}: ChatWindowProps) {
  const { data: session } = useSession();
  const currentUserName = session?.user?.name || "Someone";

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // New feature states
  const [replyingTo, setReplyingTo] = useState<{ id: string; userName: string; content: string } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [channelMembersCache, setChannelMembersCache] = useState<MentionUser[]>([]);

  // Typing indicator
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string; timestamp: number }>>([]);
  const lastTypingBroadcast = useRef<number>(0);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, typingUsers]);

  const channelRef = useRef<any>(null);

  // Load channel members for @mentions
  useEffect(() => {
    getChannelMembers(channelId).then((members) => {
      setChannelMembersCache(members.map((m) => ({ id: m.id, name: m.name, image: m.image })));
    }).catch(() => {});
  }, [channelId]);

  // Subscribe to broadcast
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`chat-${channelId}`);

    channel
      .on("broadcast", { event: "new-message" }, (payload) => {
        const msg = payload.payload as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          const withoutOptimistic = prev.filter(
            (m) => !(m.id.startsWith("temp-") && m.user.id === msg.user.id && m.content === msg.content)
          );
          return [...withoutOptimistic, msg];
        });
      })
      .on("broadcast", { event: "message-updated" }, (payload) => {
        const updated = payload.payload as Message;
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)));
      })
      .on("broadcast", { event: "reaction-update" }, (payload) => {
        const { messageId, reactions } = payload.payload as { messageId: string; reactions: Reaction[] };
        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, reactions } : m)));
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [channelId]);

  // Typing events
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel(`typing-${channelId}`);
    channel
      .on("broadcast", { event: "typing" }, (payload) => {
        const data = payload.payload as { userId: string; userName: string; timestamp: number };
        if (data.userId === currentUserId) return;
        setTypingUsers((prev) => {
          const filtered = prev.filter((u) => u.userId !== data.userId);
          return [...filtered, { userId: data.userId, userName: data.userName, timestamp: Date.now() }];
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [channelId, currentUserId]);

  // Clean up typing indicators
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => prev.filter((u) => Date.now() - u.timestamp < 3000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // ─── Input change with @mention detection ────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);

    // Typing broadcast
    const now = Date.now();
    if (now - lastTypingBroadcast.current > 1500) {
      lastTypingBroadcast.current = now;
      broadcastTyping(channelId, currentUserId, currentUserName);
    }

    // @mention detection
    const cursorPos = textareaRef.current?.selectionStart ?? val.length;
    const textBeforeCursor = val.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    if (mentionMatch) {
      setMentionQuery(mentionMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleMentionSelect = (user: MentionUser) => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const textBeforeCursor = input.substring(0, cursorPos);
    const textAfterCursor = input.substring(cursorPos);
    const newBefore = textBeforeCursor.replace(/@\w*$/, `@${user.name} `);
    setInput(newBefore + textAfterCursor);
    setMentionQuery(null);
    textareaRef.current?.focus();
  };

  // ─── Send message ─────────────────────────────────────────────────────────
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
      reactions: [],
      replyTo: replyingTo ? { id: replyingTo.id, content: replyingTo.content, isDeleted: false, user: { id: "", name: replyingTo.userName } } : null,
      isDeleted: false,
      editedAt: null,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    if (!fileUrl) setInput("");
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    try {
      const msg = await sendMessage({
        channelId,
        content,
        fileUrl: fileUrl || undefined,
        replyToId: replyId,
      });
      setMessages((prev) => prev.map((m) => (m.id === tempId ? (msg as unknown as Message) : m)));

      if (channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "new-message", payload: msg });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  }, [input, sending, currentUserId, channelId, replyingTo]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (mentionQuery !== null) return; // Let mention autocomplete handle Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, 150);
  }, []);

  // ─── Reaction handlers ────────────────────────────────────────────────────
  const handleReact = async (messageId: string, emoji: string) => {
    // Optimistic update
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      const existing = m.reactions || [];
      return { ...m, reactions: [...existing, { id: `temp-${Date.now()}`, emoji, user: { id: currentUserId, name: currentUserName } }] };
    }));
    try {
      await addReaction(messageId, emoji);
    } catch { /* revert would happen on next load */ }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m;
      return { ...m, reactions: (m.reactions || []).filter((r) => !(r.emoji === emoji && r.user.id === currentUserId)) };
    }));
    try {
      await removeReaction(messageId, emoji);
    } catch { /* revert on next load */ }
  };

  // ─── Edit / Delete handlers ───────────────────────────────────────────────
  const handleEdit = async (messageId: string, newContent: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, content: newContent, editedAt: new Date() } : m)));
    try {
      const updated = await editMessage(messageId, newContent);
      if (channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "message-updated", payload: updated });
      }
    } catch { /* revert on next load */ }
  };

  const handleDelete = async (messageId: string) => {
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: "" } : m)));
    try {
      const updated = await deleteMessage(messageId);
      if (channelRef.current) {
        channelRef.current.send({ type: "broadcast", event: "message-updated", payload: updated });
      }
    } catch { /* revert on next load */ }
  };

  // ─── Reply handler ────────────────────────────────────────────────────────
  const handleReply = (messageId: string, userName: string, content: string) => {
    setReplyingTo({ id: messageId, userName, content });
    textareaRef.current?.focus();
  };

  // ─── File upload ──────────────────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Upload failed"); }
      const { url } = await res.json();
      await handleSend(url, file.name);
    } catch (err: any) {
      const { toast } = await import("react-hot-toast");
      toast.error(err?.message || "Upload failed.", { duration: 5000 });
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ─── Emoji insert at cursor ───────────────────────────────────────────────
  const handleEmojiInsert = (emoji: string) => {
    const cursorPos = textareaRef.current?.selectionStart ?? input.length;
    const newVal = input.substring(0, cursorPos) + emoji + input.substring(cursorPos);
    setInput(newVal);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
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
            <button onClick={() => setShowSearch((v) => !v)} className={`flex h-7 w-7 items-center justify-center brutalist-border transition-colors ${showSearch ? "bg-primary/10 text-primary" : "text-outline hover:text-foreground"}`}>
              <span className="material-symbols-outlined text-sm">search</span>
            </button>
            <button onClick={() => setShowInfoPanel((v) => !v)} className={`flex h-7 w-7 items-center justify-center brutalist-border transition-colors ${showInfoPanel ? "bg-primary/10 text-primary" : "text-outline hover:text-foreground"}`}>
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
            onScrollToMessage={async (id: string) => {
              let el = document.getElementById(`msg-${id}`);
              if (el) {
                el.scrollIntoView({ behavior: "smooth", block: "center" });
                el.classList.add("bg-primary/10");
                setTimeout(() => el!.classList.remove("bg-primary/10"), 2000);
                return;
              }
              try {
                const allMessages = await getMessagesAroundTarget(channelId, id);
                if (allMessages.length > 0) {
                  setMessages(allMessages as Message[]);
                  setTimeout(() => {
                    const targetEl = document.getElementById(`msg-${id}`);
                    if (targetEl) {
                      targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
                      targetEl.classList.add("bg-primary/10");
                      setTimeout(() => targetEl.classList.remove("bg-primary/10"), 2500);
                    }
                  }, 100);
                }
              } catch {}
            }}
          />
        </div>

        {/* Messages area with date separators */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-surface-container-lowest">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface/20 mb-2">chat_bubble_outline</span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/30">NO_MESSAGES_YET</p>
              <p className="font-mono text-[9px] text-on-surface/20 mt-1">Start the conversation</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const showDateSep = idx === 0 || !isSameDay(messages[idx - 1].createdAt, msg.createdAt);
              return (
                <div key={msg.id}>
                  {/* Date separator */}
                  {showDateSep && (
                    <div className="flex items-center gap-3 my-4">
                      <div className="flex-1 h-px bg-on-surface/10" />
                      <span className="font-mono text-[8px] uppercase tracking-widest text-on-surface/30 px-2">
                        {getDateLabel(msg.createdAt)}
                      </span>
                      <div className="flex-1 h-px bg-on-surface/10" />
                    </div>
                  )}
                  <div id={`msg-${msg.id}`} className="transition-colors duration-500">
                    <MessageBubble
                      messageId={msg.id}
                      content={msg.content}
                      userName={msg.user.name}
                      userImage={msg.user.image}
                      timestamp={msg.createdAt}
                      isOwn={msg.user.id === currentUserId}
                      fileUrl={msg.fileUrl}
                      reactions={msg.reactions}
                      replyTo={msg.replyTo}
                      isDeleted={msg.isDeleted}
                      editedAt={msg.editedAt}
                      currentUserId={currentUserId}
                      onReply={handleReply}
                      onReact={handleReact}
                      onRemoveReaction={handleRemoveReaction}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Upload progress */}
        {uploadProgress && (
          <div className="px-4 py-2 bg-primary/10 brutalist-border border-x-0 border-b-0 flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-xs text-primary animate-spin">progress_activity</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-primary">{uploadProgress}</span>
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1.5 bg-surface-container-low/40 border-t border-outline-variant/10 flex-shrink-0">
            <p className="font-mono text-[9px] text-primary/80 lowercase tracking-wider animate-pulse flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[11px] animate-bounce">keyboard</span>
              {typingUsers.map((u) => u.userName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
            </p>
          </div>
        )}

        {/* Reply preview bar */}
        {replyingTo && (
          <div className="px-4 py-2 bg-primary/5 border-t border-primary/20 flex items-center gap-2 flex-shrink-0">
            <span className="material-symbols-outlined text-xs text-primary">reply</span>
            <div className="flex-1 min-w-0">
              <span className="font-headline text-[8px] uppercase tracking-widest text-primary block">
                Replying to {replyingTo.userName}
              </span>
              <span className="font-mono text-[9px] text-on-surface/50 line-clamp-1 block">
                {replyingTo.content}
              </span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-on-surface/30 hover:text-on-surface flex-shrink-0">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pt-3 pb-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] brutalist-border border-b-0 border-x-0 bg-card flex items-end gap-2 flex-shrink-0 relative">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,.txt,.csv" />

          {/* Attachment */}
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading || sending} className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center text-on-surface/60 hover:text-primary hover:bg-primary/10 brutalist-border transition-colors disabled:opacity-50 flex-shrink-0" title="Attach file">
            <span className="material-symbols-outlined text-sm">attach_file</span>
          </button>

          {/* Emoji picker button */}
          <div className="relative">
            <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center text-on-surface/60 hover:text-primary hover:bg-primary/10 brutalist-border transition-colors flex-shrink-0" title="Emoji">
              <span className="material-symbols-outlined text-sm">mood</span>
            </button>
            {showEmojiPicker && <EmojiPicker onSelect={handleEmojiInsert} onClose={() => setShowEmojiPicker(false)} />}
          </div>

          {/* @Mention autocomplete */}
          <div className="flex-1 relative">
            {mentionQuery !== null && (
              <MentionAutocomplete
                members={channelMembersCache}
                query={mentionQuery}
                position={{ top: 8, left: 0 }}
                onSelect={handleMentionSelect}
                onClose={() => setMentionQuery(null)}
              />
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder="Type a message... (@ to mention)"
              rows={1}
              className="w-full bg-surface-container-lowest brutalist-border px-3 py-2 text-base md:text-xs text-on-surface font-mono placeholder:text-on-surface/30 resize-none max-h-24 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Send */}
          <button onClick={() => handleSend()} disabled={(!input.trim() && !uploading) || sending} className="flex h-10 w-10 md:h-9 md:w-9 items-center justify-center bg-primary text-on-primary brutalist-border hover:bg-primary/80 disabled:opacity-50 transition-colors flex-shrink-0">
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
      </div>

      {/* Info Panel */}
      <ChatInfoPanel channelId={channelId} channelName={channelName} memberCount={memberCount} isOpen={showInfoPanel} onClose={() => setShowInfoPanel(false)} />
    </div>
  );
}
