"use client";

import { useState, useEffect } from "react";
import { getChannelMedia, getChannelLinks } from "@/app/actions/chat-media";

type Tab = "media" | "files" | "links";

interface MediaItem {
  id: string;
  fileUrl: string | null;
  content: string;
  createdAt: Date;
  user: { name: string };
}

interface LinkItem {
  url: string;
  sentBy: string;
  sentAt: Date;
}

interface ChatInfoPanelProps {
  channelId: string;
  channelName: string;
  memberCount: number;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatInfoPanel({ channelId, channelName, memberCount, isOpen, onClose }: ChatInfoPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("media");
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [files, setFiles] = useState<MediaItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.all([
      getChannelMedia(channelId),
      getChannelLinks(channelId),
    ]).then(([mediaData, linksData]) => {
      setMedia(mediaData.media);
      setFiles(mediaData.files);
      setLinks(linksData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [isOpen, channelId]);

  if (!isOpen) return null;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "media", label: "Media", count: media.length },
    { id: "files", label: "Files", count: files.length },
    { id: "links", label: "Links", count: links.length },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-md md:hidden animate-in fade-in duration-200" onClick={onClose} />
      <div className="fixed inset-0 z-50 md:relative md:inset-auto md:z-auto w-full md:w-72 lg:w-80 h-full md:border-l-2 border-on-surface/10 bg-surface-container-lowest flex flex-col flex-shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-on-surface/10 flex items-center justify-between">
        <div>
          <h3 className="font-headline text-xs uppercase tracking-widest text-foreground">
            Channel Info
          </h3>
          <p className="font-mono text-[11px] text-on-surface/40 uppercase tracking-widest mt-0.5">
            {channelName} — {memberCount} MEMBERS
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-on-surface/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 font-label text-[11px] uppercase tracking-widest text-center transition-colors ${
              activeTab === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-on-surface/40 hover:text-on-surface/70"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 text-[10px] opacity-60">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="material-symbols-outlined text-primary animate-spin">progress_activity</span>
          </div>
        ) : activeTab === "media" ? (
          media.length === 0 ? (
            <EmptyState icon="image" label="No media shared" />
          ) : (
            <div className="grid grid-cols-3 gap-1.5">
              {media.map((item) => (
                <a
                  key={item.id}
                  href={item.fileUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square brutalist-border overflow-hidden bg-surface-container-low hover:opacity-80 transition-opacity"
                >
                  {item.fileUrl!.match(/\.(mp4|webm|mov)$/i) ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl text-on-surface/30">play_arrow</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.fileUrl!} alt="" className="w-full h-full object-cover" loading="lazy" />
                  )}
                </a>
              ))}
            </div>
          )
        ) : activeTab === "files" ? (
          files.length === 0 ? (
            <EmptyState icon="description" label="No files shared" />
          ) : (
            <div className="space-y-2">
              {files.map((item) => {
                const name = item.fileUrl!.split("/").pop() || "file";
                return (
                  <a
                    key={item.id}
                    href={item.fileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 brutalist-border bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-primary flex-shrink-0">description</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-label text-[10px] uppercase tracking-wide text-foreground truncate">{name}</p>
                      <p className="font-mono text-[10px] text-on-surface/40">{item.user.name}</p>
                    </div>
                    <span className="material-symbols-outlined text-sm text-on-surface/30">download</span>
                  </a>
                );
              })}
            </div>
          )
        ) : (
          links.length === 0 ? (
            <EmptyState icon="link" label="No links shared" />
          ) : (
            <div className="space-y-2">
              {links.map((link, i) => {
                let domain = "";
                try { domain = new URL(link.url).hostname; } catch { domain = link.url; }
                return (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-2.5 brutalist-border bg-surface-container-low hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg text-blue-400 flex-shrink-0">link</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-label text-[10px] text-foreground truncate">{domain}</p>
                      <p className="font-mono text-[10px] text-on-surface/40">{link.sentBy}</p>
                    </div>
                  </a>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
    </>
  );
}

function EmptyState({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="material-symbols-outlined text-3xl text-on-surface/15 mb-2">{icon}</span>
      <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/30">{label}</p>
    </div>
  );
}
