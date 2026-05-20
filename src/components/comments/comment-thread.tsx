"use client";

import { useState, useEffect, useRef, startTransition, useCallback } from "react";
import { addComment, getTaskComments, deleteComment } from "@/app/actions/comments";
import { getTeamMembers } from "@/app/actions/users-list";
import { subscribeToTaskComments } from "@/lib/realtime";

interface CommentUser {
  id: string;
  name: string;
  image: string | null;
}

interface CommentData {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  parentId: string | null;
  user: CommentUser;
  replies?: CommentData[];
  fileUrl?: string | null;
  fileName?: string | null;
}

interface MentionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

interface CommentThreadProps {
  taskId: string;
  currentUserId: string;
  initialComments: CommentData[];
}

export function CommentThread({ taskId, currentUserId, initialComments }: CommentThreadProps) {
  const [comments, setComments] = useState<CommentData[]>(initialComments);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // @mention state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Subscribe to realtime comment updates
  useEffect(() => {
    // Initial fetch of comments
    getTaskComments(taskId).then(setComments).catch(console.error);

    const channel = subscribeToTaskComments(taskId, () => {
      getTaskComments(taskId).then(setComments).catch(console.error);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [taskId]);

  // Fetch mention candidates
  useEffect(() => {
    if (showMentions) {
      getTeamMembers(mentionSearch)
        .then((users) => setMentionUsers(users as MentionUser[]))
        .catch(console.error);
    }
  }, [showMentions, mentionSearch]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const pos = e.target.selectionStart || 0;
    setNewComment(value);
    setCursorPos(pos);

    // Check if we're in a mention context (typing after @)
    const textBeforeCursor = value.substring(0, pos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex >= 0) {
      const searchText = textBeforeCursor.substring(lastAtIndex + 1);
      // Only show dropdown if there's no space before @ (or it's start of string)
      // and the search text doesn't contain spaces (valid mention)
      if ((lastAtIndex === 0 || textBeforeCursor[lastAtIndex - 1] === " ") && !searchText.includes(" ")) {
        setShowMentions(true);
        setMentionSearch(searchText);
        setMentionIndex(0);
        return;
      }
    }

    setShowMentions(false);
  }, []);

  const insertMention = useCallback((user: MentionUser) => {
    const textBeforeCursor = newComment.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const before = newComment.substring(0, lastAtIndex);
    const after = newComment.substring(cursorPos);
    const mentionText = `@${user.name.replace(/\s+/g, "")} `;
    setNewComment(before + mentionText + after);
    setShowMentions(false);
    setMentionSearch("");
    inputRef.current?.focus();
  }, [newComment, cursorPos]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (showMentions && mentionUsers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % mentionUsers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + mentionUsers.length) % mentionUsers.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionUsers[mentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        setShowMentions(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && !showMentions) {
      e.preventDefault();
      handleSubmit();
    }
  }, [showMentions, mentionUsers, mentionIndex, insertMention]);

  const handleSubmit = () => {
    if (!newComment.trim() && !attachedFile) return;

    setIsSending(true);
    const content = newComment;
    const parentId = replyTo?.id;

    startTransition(async () => {
      try {
        let uploadedUrl = undefined;
        let uploadedName = undefined;

        if (attachedFile) {
          setIsUploadingFile(true);
          const { uploadFile } = await import("@/lib/storage-client");
          const res = await uploadFile(attachedFile, `tasks/${taskId}/comments`);
          uploadedUrl = res.url;
          uploadedName = attachedFile.name;
        }

        await addComment({
          taskId,
          content: content || `Attached file: ${attachedFile?.name}`,
          parentId,
          fileUrl: uploadedUrl,
          fileName: uploadedName,
        });

        const updated = await getTaskComments(taskId);
        setComments(updated);
        setNewComment("");
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setReplyTo(null);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to post comment.", { duration: 5000 });
      } finally {
        setIsSending(false);
        setIsUploadingFile(false);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      try {
        await deleteComment(commentId);
        const updated = await getTaskComments(taskId);
        setComments(updated);
      } catch (err: any) {
        const { toast } = await import("react-hot-toast");
        toast.error(err?.message || "Failed to delete comment.", { duration: 5000 });
      }
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="brutalist-border bg-card flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-card-text">forum</span>
        <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-card-text">
          COMMENTS ({comments.length})
        </h3>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-on-surface/10">
        {comments.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-2xl text-on-surface/20 mb-2 block">chat_bubble_outline</span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-on-surface/40">NO_COMMENTS_YET</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id}>
              {/* Parent Comment */}
              <CommentBubble
                comment={comment}
                currentUserId={currentUserId}
                onReply={() => setReplyTo({ id: comment.id, name: comment.user.name })}
                onDelete={handleDelete}
                formatTime={formatTime}
                isReply={false}
              />

              {/* Thread Replies */}
              {comment.replies && comment.replies.length > 0 ? (
                <div className="border-l-3 border-primary/20 ml-6">
                  {comment.replies.map((reply) => (
                    <CommentBubble
                      key={reply.id}
                      comment={reply}
                      currentUserId={currentUserId}
                      onReply={() => setReplyTo({ id: comment.id, name: reply.user.name })}
                      onDelete={handleDelete}
                      formatTime={formatTime}
                      isReply={true}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply indicator */}
      {replyTo ? (
        <div className="px-4 py-2 bg-primary/10 border-t border-primary/30 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-primary">
            REPLYING_TO: {replyTo.name}
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-primary/60 hover:text-primary"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ) : null}

      {/* Input with @mention dropdown */}
      <div className="relative">
        {/* @mention dropdown */}
        {showMentions && mentionUsers.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mx-3 mb-1 brutalist-border bg-card max-h-48 overflow-y-auto z-20 shadow-lg">
            {mentionUsers.map((user, idx) => (
              <button
                key={user.id}
                onClick={() => insertMention(user)}
                className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                  idx === mentionIndex ? "bg-primary/10 text-primary" : "hover:bg-card-muted text-on-surface"
                }`}
              >
                <div className="w-6 h-6 flex-shrink-0 bg-primary text-on-primary flex items-center justify-center font-headline text-[9px]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="font-headline text-[10px] uppercase tracking-widest block truncate">{user.name}</span>
                  <span className="font-mono text-[8px] text-on-surface/40">{user.email}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Attached file display */}
        {attachedFile && (
          <div className="px-4 py-2 bg-surface-container-highest border-t border-on-surface/20 flex items-center justify-between font-mono text-[9px] uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-sm">attachment</span>
              {attachedFile.name} ({(attachedFile.size / 1024).toFixed(1)} KB)
            </span>
            <button
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-on-surface/60 hover:text-red-500 transition-colors"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        )}

        <div className="p-3 border-t-2 border-on-surface/20 bg-card-muted flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newComment}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 h-10 brutalist-border px-3 font-body text-sm focus:border-primary focus:outline-none bg-card text-on-surface placeholder:text-on-surface/30"
            placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Comment or @mention..."}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isUploadingFile}
            className="flex h-10 w-10 items-center justify-center brutalist-border bg-card text-on-surface hover:bg-neutral-200 transition-colors disabled:opacity-50"
            title="Attach file"
          >
            <span className="material-symbols-outlined text-base">attach_file</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAttachedFile(file);
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={isSending || isUploadingFile || (!newComment.trim() && !attachedFile)}
            className="mono-clip bg-primary text-on-primary px-4 py-2 h-10 font-headline text-[10px] uppercase shadow-[3px_3px_0px_var(--clr-shadow)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_var(--clr-shadow)] transition-all disabled:opacity-50 flex items-center justify-center"
          >
            {isSending ? "..." : "SEND"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Render @mentions as highlighted spans
// ---------------------------------------------------------------------------

function renderContent(content: string) {
  const parts = content.split(/(@\w+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="font-headline text-primary text-xs cursor-pointer hover:underline">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

// ---------------------------------------------------------------------------
// Single Comment Bubble
// ---------------------------------------------------------------------------

function CommentBubble({
  comment,
  currentUserId,
  onReply,
  onDelete,
  formatTime,
  isReply,
}: {
  comment: CommentData;
  currentUserId: string;
  onReply: () => void;
  onDelete: (id: string) => void;
  formatTime: (d: Date) => string;
  isReply: boolean;
}) {
  const isOwn = comment.userId === currentUserId;

  return (
    <div className={`px-4 py-3 hover:bg-card-muted/50 transition-colors ${isReply ? "pl-5" : ""}`}>
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-on-primary font-headline text-[10px] ${isOwn ? "bg-primary" : "bg-on-surface/30"}`}>
          {comment.user.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-headline text-[10px] uppercase tracking-widest text-on-surface">{comment.user.name}</span>
            <span className="font-mono text-[8px] text-on-surface/40">{formatTime(comment.createdAt)}</span>
          </div>
          <p className="font-body text-sm text-on-surface/80 leading-relaxed">{renderContent(comment.content)}</p>
          
          {comment.fileUrl && (
            <div className="mt-2 flex">
              <a
                href={comment.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 brutalist-border bg-surface-container-lowest hover:bg-surface-container-low transition-colors max-w-xs"
              >
                <span className="material-symbols-outlined text-base text-primary">
                  {comment.fileName?.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|svg)$/) ? "image" : "attachment"}
                </span>
                <div className="min-w-0">
                  <span className="font-label text-[9px] uppercase tracking-wide text-foreground truncate block max-w-[200px]" title={comment.fileName || "attachment"}>
                    {comment.fileName || "attachment"}
                  </span>
                  <span className="font-mono text-[7px] text-outline uppercase">click to view</span>
                </div>
              </a>
            </div>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={onReply}
              className="font-mono text-[8px] uppercase tracking-widest text-on-surface/40 hover:text-on-surface transition-colors"
            >
              REPLY
            </button>
            {isOwn ? (
              <button
                onClick={() => onDelete(comment.id)}
                className="font-mono text-[8px] uppercase tracking-widest text-on-surface/40 hover:text-red-500 transition-colors"
              >
                DELETE
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
