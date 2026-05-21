// ─── PERF: ChatSidebar + getUserChannels() moved to layout.tsx ───────────────
// This page now only renders the empty state content. The sidebar is shared
// via the layout and doesn't re-fetch channels on navigation.
// When ?dm=userId is present, we resolve the DM channel server-side and redirect.

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getOrCreateDMChannel } from "@/app/actions/chat";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ChatPage({ searchParams }: Props) {
  const params = await searchParams;
  const dmUserId = typeof params.dm === "string" ? params.dm : undefined;

  // If ?dm=userId is present, resolve the DM channel and redirect immediately
  if (dmUserId) {
    const session = await auth();
    if (session?.user?.id) {
      let channelId: string | null = null;
      try {
        const channel = await getOrCreateDMChannel(dmUserId);
        channelId = channel.id;
      } catch {
        // Fall through to default chat view if DM creation fails
      }
      if (channelId) {
        redirect(`/chat/${channelId}`);
      }
    }
  }

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
