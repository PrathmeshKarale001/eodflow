import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChannels } from "@/app/actions/chat";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatToastContainer } from "@/components/chat/chat-toast";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatMobileLayout } from "@/components/chat/chat-mobile-layout";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const channels = await getUserChannels();

  const channelList = (channels as { id: string; name: string | null; type: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  const canManage = hasPermission(session.user.role as Role, "createChannel");

  return (
    <ChatProvider channels={channelList} currentUserId={session.user.id}>
      <div className="flex flex-1 min-h-0 w-full h-full overflow-hidden">
        {/* Desktop: always show sidebar + content side by side */}
        <div className="hidden md:block md:w-72 md:flex-shrink-0 h-full">
          <ChatSidebar
            channels={channels as any}
            currentUserId={session.user.id}
            canManageChannels={canManage}
          />
        </div>
        <div className="hidden md:flex flex-1 flex-col min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Mobile: show either sidebar (channel list) or chat thread */}
        <ChatMobileLayout
          sidebar={
            <ChatSidebar
              channels={channels as any}
              currentUserId={session.user.id}
              canManageChannels={canManage}
              isMobile
            />
          }
        >
          {children}
        </ChatMobileLayout>
      </div>
      <ChatToastContainer />
    </ChatProvider>
  );
}
