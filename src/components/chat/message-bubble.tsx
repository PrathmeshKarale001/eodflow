"use client";

import { useState, useRef, useEffect } from "react";

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

interface MessageBubbleProps {
  messageId: string;
  content: string;
  userName: string;
  userImage?: string | null;
  timestamp: Date;
  isOwn: boolean;
  fileUrl?: string | null;
  reactions?: Reaction[];
  replyTo?: ReplyTo | null;
  isDeleted?: boolean;
  editedAt?: Date | null;
  currentUserId: string;
  onReply?: (messageId: string, userName: string, content: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, emoji: string) => void;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isImageUrl(url: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"];
  const lower = url.toLowerCase().split("?")[0];
  return imageExts.some((ext) => lower.endsWith(ext));
}

function getFileIcon(url: string): string {
  const lower = url.toLowerCase().split("?")[0];
  if (lower.endsWith(".pdf")) return "picture_as_pdf";
  if (lower.match(/\.(doc|docx)$/)) return "description";
  if (lower.match(/\.(xls|xlsx|csv)$/)) return "table_chart";
  if (lower.match(/\.(ppt|pptx)$/)) return "slideshow";
  if (lower.match(/\.(zip|rar|7z|tar|gz)$/)) return "folder_zip";
  if (lower.match(/\.(mp4|mov|avi|mkv|webm)$/)) return "movie";
  if (lower.match(/\.(mp3|wav|ogg|flac)$/)) return "audio_file";
  return "attach_file";
}

function getFileName(url: string): string {
  try {
    const path = new URL(url).pathname;
    const full = decodeURIComponent(path.split("/").pop() || "file");
    return full.replace(/^\d+_/, "");
  } catch {
    return "attachment";
  }
}

// Detect URLs in text and render them as clickable links
function renderContentWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      // Reset lastIndex since we used test()
      urlRegex.lastIndex = 0;
      const displayUrl = part.length > 50 ? part.substring(0, 47) + "..." : part;
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/70 transition-colors break-all"
        >
          {displayUrl}
        </a>
      );
    }
    // Render @mentions with highlight
    const mentionRegex = /@(\w+(?:\s\w+)?)/g;
    const mentionParts = part.split(mentionRegex);
    return mentionParts.map((mp, j) => {
      if (j % 2 === 1) {
        return (
          <span key={`${i}-${j}`} className="text-primary font-bold">
            @{mp}
          </span>
        );
      }
      return mp;
    });
  });
}

// Quick reaction emojis
const QUICK_REACTIONS = ["👍", "❤️", "😂", "🔥", "👀", "🎉"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MessageBubble({
  messageId,
  content,
  userName,
  timestamp,
  isOwn,
  fileUrl,
  reactions = [],
  replyTo,
  isDeleted = false,
  editedAt,
  currentUserId,
  onReply,
  onReact,
  onRemoveReaction,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const time = new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasImage = fileUrl && isImageUrl(fileUrl);
  const hasFile = fileUrl && !hasImage;

  // Close popups on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setShowContextMenu(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setShowReactionPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Group reactions by emoji
  const reactionGroups = reactions.reduce<Record<string, { count: number; users: string[]; hasOwn: boolean }>>((acc, r) => {
    if (!acc[r.emoji]) {
      acc[r.emoji] = { count: 0, users: [], hasOwn: false };
    }
    acc[r.emoji].count++;
    acc[r.emoji].users.push(r.user.name);
    if (r.user.id === currentUserId) acc[r.emoji].hasOwn = true;
    return acc;
  }, {});

  const handleReactionClick = (emoji: string) => {
    const group = reactionGroups[emoji];
    if (group?.hasOwn) {
      onRemoveReaction?.(messageId, emoji);
    } else {
      onReact?.(messageId, emoji);
    }
  };

  const handleEditSave = () => {
    if (editContent.trim() && editContent.trim() !== content) {
      onEdit?.(messageId, editContent.trim());
    }
    setIsEditing(false);
  };

  // Deleted message
  if (isDeleted) {
    return (
      <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center text-[10px] font-headline font-bold uppercase bg-surface-container-high/50 text-on-surface/30">
          {userName.charAt(0)}
        </div>
        <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-headline text-[9px] uppercase tracking-widest text-on-surface/30">
              {isOwn ? "YOU" : userName}
            </span>
            <span className="font-mono text-[8px] text-on-surface/20">{time}</span>
          </div>
          <div className="inline-block px-3 py-2 text-xs font-mono leading-relaxed brutalist-border border-on-surface/10 bg-surface-container-high/20">
            <p className="italic text-on-surface/30 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[11px]">delete</span>
              This message was deleted
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center text-[10px] font-headline font-bold uppercase ${
          isOwn
            ? "bg-primary text-on-primary"
            : "bg-surface-container-high text-on-surface"
        }`}
      >
        {userName.charAt(0)}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] relative ${isOwn ? "text-right" : ""}`}>
        {/* User + time header */}
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-headline text-[9px] uppercase tracking-widest text-on-surface/60">
            {isOwn ? "YOU" : userName}
          </span>
          <span className="font-mono text-[8px] text-on-surface/30">{time}</span>
          {editedAt && (
            <span className="font-mono text-[7px] text-on-surface/25 italic">(edited)</span>
          )}
        </div>

        {/* Reply context */}
        {replyTo && (
          <div className={`flex items-start gap-1.5 mb-1.5 px-2 py-1.5 border-l-2 border-primary/40 bg-primary/5 ${isOwn ? "ml-auto" : ""}`} style={{ maxWidth: "90%" }}>
            <span className="material-symbols-outlined text-[10px] text-primary/50 flex-shrink-0 mt-0.5">reply</span>
            <div className="min-w-0">
              <span className="font-headline text-[8px] uppercase tracking-widest text-primary/70 block">
                {replyTo.user.name}
              </span>
              <span className="font-mono text-[9px] text-on-surface/50 line-clamp-1 block">
                {replyTo.isDeleted ? "Message deleted" : replyTo.content}
              </span>
            </div>
          </div>
        )}

        {/* Message content bubble */}
        <div
          className={`inline-block px-3 py-2 text-xs font-mono leading-relaxed brutalist-border ${
            isOwn
              ? "bg-primary/15 text-on-surface border-primary/30"
              : "bg-card text-card-text"
          }`}
        >
          {/* Edit mode */}
          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-surface-container-lowest brutalist-border px-2 py-1.5 text-xs text-on-surface font-mono resize-none focus:outline-none focus:ring-1 focus:ring-primary min-w-[200px]"
                rows={2}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEditSave(); }
                  if (e.key === "Escape") setIsEditing(false);
                }}
              />
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setIsEditing(false)} className="font-mono text-[8px] uppercase text-on-surface/50 hover:text-on-surface px-2 py-1 brutalist-border">ESC</button>
                <button onClick={handleEditSave} className="font-mono text-[8px] uppercase text-primary bg-primary/10 hover:bg-primary/20 px-2 py-1 brutalist-border">SAVE</button>
              </div>
            </div>
          ) : (
            <>
              {/* Text content */}
              {content && !fileUrl && <p className="whitespace-pre-wrap break-words">{renderContentWithLinks(content)}</p>}
              {content && fileUrl && content !== getFileName(fileUrl) && (
                <p className="mb-2 whitespace-pre-wrap break-words">{renderContentWithLinks(content)}</p>
              )}

              {/* Image attachment */}
              {hasImage && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1 group/img">
                  <div className="relative overflow-hidden brutalist-border border-on-surface/10 max-w-[280px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl} alt="Attached image" className="w-full h-auto max-h-[200px] object-cover transition-transform group-hover/img:scale-105" loading="lazy" />
                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="material-symbols-outlined text-white opacity-0 group-hover/img:opacity-100 transition-opacity text-lg drop-shadow-lg">open_in_new</span>
                    </div>
                  </div>
                </a>
              )}

              {/* Document attachment */}
              {hasFile && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1 px-3 py-2 brutalist-border bg-surface-container-high/50 hover:bg-surface-container-high transition-colors group/file max-w-[280px]">
                  <span className="material-symbols-outlined text-base text-primary flex-shrink-0">{getFileIcon(fileUrl)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[9px] uppercase tracking-wider text-on-surface truncate">{getFileName(fileUrl)}</p>
                    <p className="font-mono text-[8px] text-on-surface/40 uppercase">TAP TO DOWNLOAD</p>
                  </div>
                  <span className="material-symbols-outlined text-xs text-on-surface/30 group-hover/file:text-primary transition-colors flex-shrink-0">download</span>
                </a>
              )}
            </>
          )}
        </div>

        {/* ─── REACTION PILLS ──────────────────────────────────────────────── */}
        {Object.keys(reactionGroups).length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isOwn ? "justify-end" : ""}`}>
            {Object.entries(reactionGroups).map(([emoji, group]) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                title={group.users.join(", ")}
                className={`inline-flex items-center gap-1 px-1.5 py-0.5 brutalist-border text-[10px] transition-colors ${
                  group.hasOwn
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-card hover:bg-surface-container-high text-on-surface/70"
                }`}
              >
                <span>{emoji}</span>
                <span className="font-mono text-[8px]">{group.count}</span>
              </button>
            ))}
            {/* Quick add reaction button */}
            <button
              onClick={() => setShowReactionPicker(true)}
              className="inline-flex items-center justify-center w-6 h-6 brutalist-border bg-card hover:bg-surface-container-high text-on-surface/30 hover:text-on-surface/60 transition-colors"
            >
              <span className="material-symbols-outlined text-[10px]">add_reaction</span>
            </button>
          </div>
        )}

        {/* ─── HOVER ACTION BAR ────────────────────────────────────────────── */}
        {showActions && !isEditing && (
          <div
            ref={actionsRef}
            className={`absolute -top-8 ${isOwn ? "right-0" : "left-0"} flex items-center gap-0.5 bg-card brutalist-border shadow-lg z-20 p-0.5`}
          >
            {/* React */}
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className="flex h-6 w-6 items-center justify-center text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors"
              title="React"
            >
              <span className="material-symbols-outlined text-[13px]">add_reaction</span>
            </button>

            {/* Reply */}
            <button
              onClick={() => onReply?.(messageId, userName, content)}
              className="flex h-6 w-6 items-center justify-center text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors"
              title="Reply"
            >
              <span className="material-symbols-outlined text-[13px]">reply</span>
            </button>

            {/* More (edit/delete — own messages only) */}
            {isOwn && (
              <button
                onClick={() => setShowContextMenu(!showContextMenu)}
                className="flex h-6 w-6 items-center justify-center text-on-surface/50 hover:text-primary hover:bg-primary/10 transition-colors"
                title="More"
              >
                <span className="material-symbols-outlined text-[13px]">more_vert</span>
              </button>
            )}
          </div>
        )}

        {/* ─── REACTION PICKER POPUP ───────────────────────────────────────── */}
        {showReactionPicker && (
          <div className={`absolute -top-14 ${isOwn ? "right-0" : "left-0"} bg-card brutalist-border shadow-lg z-30 p-1 flex gap-0.5`}>
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => { onReact?.(messageId, emoji); setShowReactionPicker(false); }}
                className="flex h-7 w-7 items-center justify-center hover:bg-primary/10 transition-colors text-base rounded-sm"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* ─── CONTEXT MENU (Edit / Delete) ─────────────────────────────────── */}
        {showContextMenu && (
          <div
            ref={contextMenuRef}
            className={`absolute top-0 ${isOwn ? "right-0" : "left-full ml-1"} bg-card brutalist-border shadow-lg z-30 min-w-[120px]`}
          >
            <button
              onClick={() => { setIsEditing(true); setShowContextMenu(false); setShowActions(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-[11px] text-on-surface/50">edit</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-on-surface/70">Edit</span>
            </button>
            <button
              onClick={() => {
                if (confirm("Delete this message?")) onDelete?.(messageId);
                setShowContextMenu(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-red-500/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[11px] text-red-400">delete</span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-red-400">Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
