"use client";

import { useState, useRef, useEffect } from "react";

// ---------------------------------------------------------------------------
// Lightweight native emoji picker — no external dependencies
// ---------------------------------------------------------------------------

const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    icon: "mood",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😂", "🤣", "🥹", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😗", "😙", "🥲", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🫡", "🤐", "🤨", "😐", "😑", "😶", "🫠", "😏", "😒", "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🥴", "😵", "🤯", "🥳", "🥸", "😎", "🤓", "🧐"],
  },
  {
    label: "Hands",
    icon: "waving_hand",
    emojis: ["👍", "👎", "👊", "✊", "🤛", "🤜", "🤞", "✌️", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "🫵", "👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "🫰", "👏", "🙌", "🫶", "🤝", "🙏", "💪", "🫂"],
  },
  {
    label: "Hearts",
    icon: "favorite",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "❤️‍🩹", "💗", "💓", "💕", "💞", "💘", "💝", "💖", "🫀"],
  },
  {
    label: "Objects",
    icon: "lightbulb",
    emojis: ["🔥", "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🏆", "🥇", "🎯", "💡", "📌", "📎", "🔗", "💻", "📱", "⏰", "📅", "📝", "✅", "❌", "⚠️", "💯", "🚀", "⚡", "🎨", "🎵", "📸", "🔔", "💬", "👀", "🤝", "💼", "📊"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState(0);
  const [search, setSearch] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap((c) => c.emojis)
    : EMOJI_CATEGORIES[activeCategory].emojis;

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-2 left-0 bg-card brutalist-border shadow-2xl w-72 z-50 animate-in slide-in-from-bottom-2 duration-150"
    >
      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-on-surface/10">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => { setActiveCategory(i); setSearch(""); }}
            className={`flex h-7 w-7 items-center justify-center transition-colors ${
              activeCategory === i && !search
                ? "bg-primary/10 text-primary"
                : "text-on-surface/40 hover:text-on-surface/70 hover:bg-surface-container-high"
            }`}
            title={cat.label}
          >
            <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full bg-surface-container-lowest brutalist-border px-2 py-1 text-[10px] text-on-surface font-mono placeholder:text-on-surface/30 focus:outline-none focus:ring-1 focus:ring-primary"
          autoFocus
        />
      </div>

      {/* Emoji grid */}
      <div className="px-2 pb-2 max-h-40 overflow-y-auto">
        {!search && (
          <p className="font-headline text-[8px] uppercase tracking-widest text-on-surface/30 mb-1 px-1">
            {EMOJI_CATEGORIES[activeCategory].label}
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="flex h-8 w-8 items-center justify-center hover:bg-primary/10 transition-colors text-lg rounded-sm"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
