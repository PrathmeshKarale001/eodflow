"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { addComment, getTaskComments, deleteComment } from "@/app/actions/comments";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Subscribe to realtime comment updates
  useEffect(() => {
    const channel = subscribeToTaskComments(taskId, () => {
      // Refetch comments on any change
      getTaskComments(taskId).then(setComments).catch(console.error);
    });

    return () => {
      channel.unsubscribe();
    };
  }, [taskId]);

  const handleSubmit = () => {
    if (!newComment.trim()) return;

    setIsSending(true);
    const content = newComment;
    const parentId = replyTo?.id;

    startTransition(async () => {
      try {
        await addComment({ taskId, content, parentId });
        const updated = await getTaskComments(taskId);
        setComments(updated);
        setNewComment("");
        setReplyTo(null);
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } catch (err) {
        console.error("Comment failed:", err);
      } finally {
        setIsSending(false);
      }
    });
  };

  const handleDelete = (commentId: string) => {
    startTransition(async () => {
      try {
        await deleteComment(commentId);
        const updated = await getTaskComments(taskId);
        setComments(updated);
      } catch (err) {
        console.error("Delete failed:", err);
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
    <div className="brutalist-border bg-white flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b-2 border-black bg-[#F4F4F5] flex items-center gap-2">
        <span className="material-symbols-outlined text-sm text-[#180065]">forum</span>
        <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-[#180065]">
          COMMENTS ({comments.length})
        </h3>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] divide-y divide-neutral-100">
        {comments.length === 0 ? (
          <div className="p-8 text-center">
            <span className="material-symbols-outlined text-2xl text-neutral-300 mb-2 block">chat_bubble_outline</span>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">NO_COMMENTS_YET</p>
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
                <div className="border-l-3 border-[#180065]/20 ml-6">
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
        <div className="px-4 py-2 bg-purple-50 border-t border-purple-200 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-widest text-purple-700">
            REPLYING_TO: {replyTo.name}
          </span>
          <button
            onClick={() => setReplyTo(null)}
            className="text-purple-500 hover:text-purple-700"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      ) : null}

      {/* Input */}
      <div className="p-3 border-t-2 border-black bg-neutral-50 flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
          className="flex-1 h-10 brutalist-border px-3 font-body text-sm focus:border-[#180065] focus:outline-none bg-white"
          placeholder={replyTo ? `Reply to ${replyTo.name}...` : "Add a comment..."}
        />
        <button
          onClick={handleSubmit}
          disabled={isSending || !newComment.trim()}
          className="mono-clip bg-[#180065] text-white px-4 py-2 font-headline text-[10px] uppercase shadow-[3px_3px_0px_#5847d2] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#5847d2] transition-all disabled:opacity-50"
        >
          {isSending ? "..." : "SEND"}
        </button>
      </div>
    </div>
  );
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
    <div className={`px-4 py-3 hover:bg-neutral-50 transition-colors ${isReply ? "pl-5" : ""}`}>
      <div className="flex items-start gap-2">
        {/* Avatar */}
        <div className={`w-7 h-7 flex-shrink-0 flex items-center justify-center text-white font-headline text-[10px] ${isOwn ? "bg-[#180065]" : "bg-neutral-400"}`}>
          {comment.user.name.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-headline text-[10px] uppercase tracking-widest">{comment.user.name}</span>
            <span className="font-mono text-[8px] text-muted-foreground">{formatTime(comment.createdAt)}</span>
          </div>
          <p className="font-body text-sm text-neutral-800 leading-relaxed">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <button
              onClick={onReply}
              className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground hover:text-[#180065] transition-colors"
            >
              REPLY
            </button>
            {isOwn ? (
              <button
                onClick={() => onDelete(comment.id)}
                className="font-mono text-[8px] uppercase tracking-widest text-muted-foreground hover:text-red-600 transition-colors"
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
