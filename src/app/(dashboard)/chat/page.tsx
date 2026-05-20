import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChannels } from "@/app/actions/chat";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export default async function ChatPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const channels = await getUserChannels();

  return (
    <div className="flex flex-1 min-h-0 w-full h-full overflow-hidden">
      <ChatSidebar
        channels={channels as any}
        currentUserId={session.user.id}
        canManageChannels={hasPermission(session.user.role as Role, "createChannel")}
      />

      {/* Empty state */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-surface-container-lowest">
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
    </div>
  );
}
