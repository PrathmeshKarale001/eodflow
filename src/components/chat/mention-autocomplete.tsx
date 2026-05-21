"use client";

import { useState, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// @Mention Autocomplete — triggered by typing "@" in the chat input
// Shows channel members in a dropdown, inserts @Name on selection
// ---------------------------------------------------------------------------

interface MentionUser {
  id: string;
  name: string;
  image?: string | null;
}

interface MentionAutocompleteProps {
  members: MentionUser[];
  query: string; // Text after "@"
  position: { top: number; left: number };
  onSelect: (user: MentionUser) => void;
  onClose: () => void;
}

export function MentionAutocomplete({ members, query, position, onSelect, onClose }: MentionAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 6);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex]);
        }
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered, selectedIndex, onSelect, onClose]);

  if (filtered.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-card brutalist-border shadow-xl min-w-[180px] max-h-[200px] overflow-y-auto animate-in slide-in-from-bottom-2 duration-100"
      style={{ bottom: position.top, left: position.left }}
      ref={listRef}
    >
      <div className="px-2 py-1 border-b border-on-surface/10">
        <p className="font-headline text-[8px] uppercase tracking-widest text-on-surface/40">MEMBERS</p>
      </div>
      {filtered.map((user, index) => (
        <button
          key={user.id}
          onClick={() => onSelect(user)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
            index === selectedIndex
              ? "bg-primary/10 text-primary"
              : "hover:bg-surface-container-high text-on-surface/70"
          }`}
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center bg-surface-container-high text-[8px] font-headline font-bold text-on-surface/60 uppercase">
            {user.name.charAt(0)}
          </div>
          <span className="font-headline text-[10px] uppercase tracking-wider truncate">
            {user.name}
          </span>
        </button>
      ))}
    </div>
  );
}
