"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Page transition wrapper — triggers a CSS fade-in animation on route change.
 * Uses the page-enter keyframes defined in globals.css.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPathname.current && ref.current) {
      // Remove and re-add the animation class to retrigger
      ref.current.classList.remove("page-transition-enter");
      // Force reflow to restart animation
      void ref.current.offsetHeight;
      ref.current.classList.add("page-transition-enter");
      prevPathname.current = pathname;
    }
  }, [pathname]);

  return (
    <div ref={ref} className="page-transition-enter flex-1 flex flex-col min-h-0">
      {children}
    </div>
  );
}
