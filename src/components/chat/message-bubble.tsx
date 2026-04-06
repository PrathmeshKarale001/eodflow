"use client";

interface MessageBubbleProps {
  content: string;
  userName: string;
  userImage?: string | null;
  timestamp: Date;
  isOwn: boolean;
  fileUrl?: string | null;
}

export function MessageBubble({
  content,
  userName,
  timestamp,
  isOwn,
  fileUrl,
}: MessageBubbleProps) {
  const time = new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
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
      <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-headline text-[9px] uppercase tracking-widest text-on-surface/60">
            {isOwn ? "YOU" : userName}
          </span>
          <span className="font-mono text-[8px] text-on-surface/30">
            {time}
          </span>
        </div>

        <div
          className={`inline-block px-3 py-2 text-xs font-mono leading-relaxed brutalist-border ${
            isOwn
              ? "bg-primary/15 text-on-surface border-primary/30"
              : "bg-card text-card-text"
          }`}
        >
          {content}
        </div>

        {/* File attachment */}
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 mt-1 text-primary font-mono text-[9px] uppercase tracking-widest hover:underline"
          >
            <span className="material-symbols-outlined text-xs">attach_file</span>
            ATTACHMENT
          </a>
        )}
      </div>
    </div>
  );
}
