import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getChannelMessages } from "@/app/actions/chat";
import { ChatWindow } from "@/components/chat/chat-window";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ channelId: string }>;
}

export default async function ChatChannelPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { channelId } = await params;

  // ─── PERF: Only fetch channel details + messages ──────────────────────────
  // ChatSidebar + getUserChannels() have been moved to chat/layout.tsx.
  // This page only needs the active channel's data.
  const [channel, messages] = await Promise.all([
    db.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        project: { select: { title: true } },
        members: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    getChannelMessages(channelId),
  ]);

  if (!channel) redirect("/chat");

  const channelName =
    channel.type === "DIRECT"
      ? channel.members.find((m: { user: { id: string; name: string } }) => m.user.id !== session.user.id)?.user.name || "Direct Message"
      : channel.name || channel.project?.title || "Channel";

  return (
    <ChatWindow
      channelId={channelId}
      channelName={channelName}
      channelType={channel.type}
      currentUserId={session.user.id}
      initialMessages={messages as any}
      memberCount={channel.members.length}
    />
  );
}
