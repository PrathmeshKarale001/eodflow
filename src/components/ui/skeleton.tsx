import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional stagger delay index (0, 1, 2...) for cascading shimmer */
  delay?: number;
}

export function Skeleton({ className, delay = 0, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "shimmer brutalist-border",
        className
      )}
      style={{
        ...style,
        animationDelay: delay ? `${delay * 100}ms` : undefined,
      }}
      {...props}
    />
  );
}
