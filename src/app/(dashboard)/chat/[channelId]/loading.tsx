export default function ChatChannelLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-on-surface/10">
        <div className="h-8 w-8 rounded-full bg-surface-container-high" />
        <div className="space-y-1.5">
          <div className="h-3 w-32 bg-surface-container-high rounded" />
          <div className="h-2 w-20 bg-surface-container-high/60 rounded" />
        </div>
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-5 space-y-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className={`flex gap-3 ${i % 3 === 0 ? "justify-end" : ""}`}>
            {i % 3 !== 0 && <div className="h-7 w-7 rounded-full bg-surface-container-high flex-shrink-0" />}
            <div className="space-y-1.5" style={{ maxWidth: `${40 + (i % 3) * 15}%` }}>
              <div className="h-3 w-16 bg-surface-container-high/60 rounded" />
              <div className="h-10 bg-surface-container-high rounded-lg w-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Input skeleton */}
      <div className="px-5 py-3 border-t border-on-surface/10">
        <div className="h-10 bg-surface-container-high rounded" />
      </div>
    </div>
  );
}
