"use client";

import { usePathname } from "next/navigation";
import { PageTransition } from "./page-transition";

export function MainContentContainer({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isChat = pathname?.startsWith("/chat");

  return (
    <main className={`flex-1 min-h-0 flex flex-col ${isChat ? "overflow-hidden" : "overflow-auto"}`}>
      <div className={`w-full flex-1 flex flex-col min-h-0 ${isChat ? "px-0 py-0 overflow-hidden" : "px-4 py-4 md:px-6 md:py-6"}`}>
        <PageTransition>
          {children}
        </PageTransition>
      </div>
    </main>
  );
}
