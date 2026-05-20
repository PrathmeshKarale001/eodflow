// ─── PERF: ChatSidebar + getUserChannels() moved to layout.tsx ───────────────
// This page now only renders the empty state content. The sidebar is shared
// via the layout and doesn't re-fetch channels on navigation.

export default function ChatPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-surface-container-lowest">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-on-surface/15 mb-3 block">
          forum
        </span>
        <p className="font-headline text-xs uppercase tracking-widest text-on-surface/30 mb-1">
          SELECT_A_CHANNEL
        </p>
        <p className="font-mono text-[9px] text-on-surface/20 max-w-xs">
          Pick a channel or start a direct message to begin chatting
        </p>
      </div>
    </div>
  );
}
