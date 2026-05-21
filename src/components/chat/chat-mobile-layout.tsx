"use client";

import { usePathname } from "next/navigation";

interface ChatMobileLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

/**
 * On mobile:
 * - /chat → show sidebar (channel list with search, new DM, new channel)
 * - /chat/[channelId] → show chat thread with a back button
 */
export function ChatMobileLayout({ sidebar, children }: ChatMobileLayoutProps) {
  const pathname = usePathname();
  const isInChannel = pathname !== "/chat" && pathname.startsWith("/chat/");

  return (
    <div className="flex md:hidden flex-1 flex-col min-h-0 overflow-hidden w-full h-full">
      {isInChannel ? (
        // Show the chat thread
        <>{children}</>
      ) : (
        // Show the channel list (sidebar in full-width mode)
        <>{sidebar}</>
      )}
    </div>
  );
}
