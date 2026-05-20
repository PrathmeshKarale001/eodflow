import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChannels } from "@/app/actions/chat";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatToastContainer } from "@/components/chat/chat-toast";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // ─── PERF: Fetch channels ONCE at layout level ────────────────────────────
  // Previously, both chat/page.tsx and chat/[channelId]/page.tsx each called
  // getUserChannels() independently. Now the layout fetches once and passes
  // channels to both the ChatSidebar (rendered here) and ChatProvider (context).
  const channels = await getUserChannels();

  const channelList = (channels as { id: string; name: string | null; type: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  return (
    <ChatProvider channels={channelList} currentUserId={session.user.id}>
      <div className="flex flex-1 min-h-0 w-full h-full overflow-hidden">
        {/* Sidebar: shared across all chat routes — only children swap */}
        <div className="hidden md:block md:w-72 md:flex-shrink-0 h-full">
          <ChatSidebar
            channels={channels as any}
            currentUserId={session.user.id}
            canManageChannels={hasPermission(session.user.role as Role, "createChannel")}
          />
        </div>
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>
      </div>
      <ChatToastContainer />
    </ChatProvider>
  );
}
