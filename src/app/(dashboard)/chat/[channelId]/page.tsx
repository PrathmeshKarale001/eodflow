import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChannels, getChannelMessages } from "@/app/actions/chat";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { db } from "@/lib/db";

interface Props {
  params: Promise<{ channelId: string }>;
}

export default async function ChatChannelPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { channelId } = await params;

  // Run ALL queries in parallel (not sequentially)
  const [channel, channels, messages] = await Promise.all([
    // Channel details
    db.chatChannel.findUnique({
      where: { id: channelId },
      include: {
        project: { select: { title: true } },
        members: { include: { user: { select: { id: true, name: true } } } },
      },
    }),
    // Sidebar channels (needed for ChatSidebar prop)
    getUserChannels(),
    // Channel messages
    getChannelMessages(channelId),
  ]);

  if (!channel) redirect("/chat");

  const channelName =
    channel.type === "DIRECT"
      ? channel.members.find((m: { user: { id: string; name: string } }) => m.user.id !== session.user.id)?.user.name || "Direct Message"
      : channel.name || channel.project?.title || "Channel";

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -my-6 flex h-[calc(100vh)] overflow-hidden">
      <ChatSidebar
        channels={channels as any}
        currentUserId={session.user.id}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatWindow
          channelId={channelId}
          channelName={channelName}
          channelType={channel.type}
          currentUserId={session.user.id}
          initialMessages={messages as any}
          memberCount={channel.members.length}
        />
      </div>
    </div>
  );
}
