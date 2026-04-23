"use client";

// ---------------------------------------------------------------------------
// Helpers for file type detection
// ---------------------------------------------------------------------------

function isImageUrl(url: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp", ".ico"];
  const lower = url.toLowerCase().split("?")[0]; // Strip query params
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
    // Extract filename from URL path, strip the timestamp prefix (e.g. "1744...._")
    const path = new URL(url).pathname;
    const full = decodeURIComponent(path.split("/").pop() || "file");
    // Remove the timestamp prefix pattern: "1234567890_"
    return full.replace(/^\d+_/, "");
  } catch {
    return "attachment";
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  const hasImage = fileUrl && isImageUrl(fileUrl);
  const hasFile = fileUrl && !hasImage;

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
          {/* Text content (skip if it's just the filename placeholder) */}
          {content && !fileUrl && <p>{content}</p>}
          {content && fileUrl && content !== getFileName(fileUrl) && (
            <p className="mb-2">{content}</p>
          )}

          {/* Image attachment — inline preview */}
          {hasImage && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block mt-1 group"
            >
              <div className="relative overflow-hidden brutalist-border border-on-surface/10 max-w-[280px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fileUrl}
                  alt="Attached image"
                  className="w-full h-auto max-h-[200px] object-cover transition-transform group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity text-lg drop-shadow-lg">
                    open_in_new
                  </span>
                </div>
              </div>
            </a>
          )}

          {/* Document attachment — file card */}
          {hasFile && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-1 px-3 py-2 brutalist-border bg-surface-container-high/50 hover:bg-surface-container-high transition-colors group max-w-[280px]"
            >
              <span className="material-symbols-outlined text-base text-primary flex-shrink-0">
                {getFileIcon(fileUrl)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[9px] uppercase tracking-wider text-on-surface truncate">
                  {getFileName(fileUrl)}
                </p>
                <p className="font-mono text-[8px] text-on-surface/40 uppercase">
                  TAP TO DOWNLOAD
                </p>
              </div>
              <span className="material-symbols-outlined text-xs text-on-surface/30 group-hover:text-primary transition-colors flex-shrink-0">
                download
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
