"use client";

interface AnnotationPinProps {
  pinNumber: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  content: string;
  authorName: string;
  isActive?: boolean;
  onClick?: () => void;
}

export function AnnotationPin({
  pinNumber,
  x,
  y,
  content,
  authorName,
  isActive = false,
  onClick,
}: AnnotationPinProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="group absolute z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Pin circle */}
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-headline font-bold transition-all duration-150 ${
          isActive
            ? "bg-primary text-on-primary scale-125 shadow-lg shadow-primary/40"
            : "bg-primary/80 text-on-primary hover:bg-primary hover:scale-110"
        } brutalist-border`}
      >
        {pinNumber}
      </div>

      {/* Tooltip on hover */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
        <div className="bg-card brutalist-border p-2 shadow-lg">
          <p className="font-headline text-[9px] uppercase tracking-widest text-primary mb-0.5">
            {authorName}
          </p>
          <p className="font-mono text-[10px] text-card-text leading-tight line-clamp-3">
            {content}
          </p>
        </div>
        {/* Arrow */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-on-surface/30" />
      </div>
    </button>
  );
}
