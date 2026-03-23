"use client";

import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import { useRouter } from "next/navigation";
import { globalSearch, type SearchResult } from "@/app/actions/search";

const TYPE_ICONS: Record<string, string> = {
  task: "task_alt",
  project: "folder_open",
  client: "domain",
  file: "attach_file",
};

const TYPE_LABELS: Record<string, string> = {
  task: "TASK",
  project: "PROJECT",
  client: "CLIENT",
  file: "FILE",
};

export function SearchDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setIsSearching(true);
      startTransition(async () => {
        try {
          const data = await globalSearch(query);
          setResults(data);
          setSelectedIndex(0);
        } catch {
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      });
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    setIsOpen(false);
    if (result.type === "file") {
      window.open(result.href, "_blank");
    } else {
      router.push(result.href);
    }
  }, [router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={() => setIsOpen(false)} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg mx-4 brutalist-border bg-background animate-in fade-in slide-in-from-top-4 duration-200">
        {/* Input */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10">
          <span className="material-symbols-outlined text-primary text-lg">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-foreground font-body text-sm focus:outline-none placeholder:text-outline"
            placeholder="Search tasks, projects, clients, files..."
          />
          <kbd className="px-2 py-0.5 brutalist-border text-[9px] font-label text-outline uppercase">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {isSearching && (
            <div className="p-6 text-center">
              <span className="font-label text-[10px] text-outline uppercase tracking-widest">SEARCHING...</span>
            </div>
          )}

          {!isSearching && query.length >= 2 && results.length === 0 && (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-2xl text-outline mb-2 block">search_off</span>
              <p className="font-label text-[10px] text-outline uppercase tracking-widest">NO_RESULTS_FOUND</p>
            </div>
          )}

          {results.map((result, i) => (
            <button
              key={result.id}
              onClick={() => handleSelect(result)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                i === selectedIndex ? "bg-primary/10" : "hover:bg-white/5"
              }`}
            >
              <span className="material-symbols-outlined text-sm text-primary">
                {TYPE_ICONS[result.type]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-headline text-xs uppercase tracking-tight text-foreground truncate">
                  {result.title}
                </p>
                <p className="font-label text-[9px] text-outline uppercase tracking-widest truncate">
                  {result.subtitle}
                </p>
              </div>
              <span className="px-2 py-0.5 text-[8px] font-label text-outline uppercase tracking-widest brutalist-border">
                {TYPE_LABELS[result.type]}
              </span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
          <div className="flex items-center gap-4">
            <span className="font-label text-[8px] text-outline uppercase tracking-widest">
              ↑↓ NAVIGATE
            </span>
            <span className="font-label text-[8px] text-outline uppercase tracking-widest">
              ↵ OPEN
            </span>
          </div>
          <span className="font-label text-[8px] text-outline uppercase tracking-widest">
            GLOBAL_SEARCH
          </span>
        </div>
      </div>
    </div>
  );
}
