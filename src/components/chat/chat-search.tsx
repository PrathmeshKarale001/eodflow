"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { searchChannelMessages } from "@/app/actions/chat-media";

interface SearchResult {
  id: string;
  content: string;
  createdAt: Date;
  user: { id: string; name: string; image: string | null };
}

interface ChatSearchProps {
  channelId: string;
  isOpen: boolean;
  onClose: () => void;
  onScrollToMessage?: (id: string) => void | Promise<void>;
}

export function ChatSearch({ channelId, isOpen, onClose, onScrollToMessage }: ChatSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchChannelMessages(channelId, value);
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [channelId]);

  if (!isOpen) return null;

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  const highlightMatch = (text: string, q: string) => {
    if (!q.trim()) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <span className="bg-primary/30 text-primary font-bold">{match}</span>
        {after}
      </>
    );
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-surface-container-lowest brutalist-border border-b-2">
      <div className="flex items-center gap-2 p-3">
        <span className="material-symbols-outlined text-lg text-on-surface/40">search</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search messages..."
          className="flex-1 bg-transparent font-body text-sm text-foreground placeholder:text-on-surface/30 focus:outline-none"
        />
        {searching && (
          <span className="material-symbols-outlined text-sm text-primary animate-spin">progress_activity</span>
        )}
        <button
          onClick={onClose}
          className="flex h-6 w-6 items-center justify-center text-outline hover:text-foreground transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>

      {query.trim().length >= 2 && (
        <div className="max-h-64 overflow-y-auto border-t border-on-surface/10">
          {results.length === 0 && !searching ? (
            <div className="p-4 text-center">
              <p className="font-label text-[9px] uppercase tracking-widest text-on-surface/30">
                NO_RESULTS_FOUND
              </p>
            </div>
          ) : (
            results.map((msg) => (
              <button
                key={msg.id}
                onClick={() => {
                  onScrollToMessage?.(msg.id);
                  onClose();
                }}
                className="w-full flex items-start gap-3 p-3 text-left hover:bg-surface-container-low transition-colors border-b border-on-surface/5"
              >
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-primary-container/30 text-[9px] font-headline font-bold text-primary uppercase mt-0.5">
                  {msg.user.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-label text-[10px] uppercase tracking-wide text-foreground">
                      {msg.user.name}
                    </span>
                    <span className="font-mono text-[8px] text-on-surface/30">
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                  <p className="font-body text-xs text-on-surface/60 truncate mt-0.5">
                    {highlightMatch(msg.content.slice(0, 100), query)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
