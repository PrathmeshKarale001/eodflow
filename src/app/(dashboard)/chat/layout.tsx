import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserChannels } from "@/app/actions/chat";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatToastContainer } from "@/components/chat/chat-toast";

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Fetch channels once at layout level so both sidebar + provider share the same data
  const channels = await getUserChannels();

  const channelList = (channels as { id: string; name: string | null; type: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  return (
    <ChatProvider channels={channelList} currentUserId={session.user.id}>
      {children}
      {/* Global toast overlay for incoming messages */}
      <ChatToastContainer />
    </ChatProvider>
  );
}
