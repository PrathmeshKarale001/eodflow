"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  getOrCreateDMChannel,
  getAvailableDMUsers,
  createGroupChannel,
  deleteGroupChannel,
  getCurrentUserRole,
} from "@/app/actions/chat";

interface Channel {
  id: string;
  name: string | null;
  type: "PROJECT" | "DIRECT" | "GROUP";
  project?: { title: string; client: { companyName: string; brandColor: string } | null } | null;
  members: { user: { id: string; name: string; image: string | null } }[];
  messages: { user: { name: string }; content?: string }[];
  _count: { messages: number };
}

interface ChatSidebarProps {
  channels: Channel[];
  currentUserId: string;
}

export function ChatSidebar({ channels, currentUserId }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [dmUsers, setDmUsers] = useState<{ id: string; name: string; role: string }[]>([]);
  const [loadingDM, setLoadingDM] = useState(false);
  const [search, setSearch] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getCurrentUserRole().then((role) => {
      if (role === "ADMIN" || role === "SUPER_ADMIN") {
        setIsAdmin(true);
      }
    });
  }, []);

  const groupChannels = channels.filter((c) => c.type === "GROUP");
  const directChannels = channels.filter((c) => c.type === "DIRECT");

  const handleNewDM = async () => {
    setShowNewDM(true);
    setLoadingDM(true);
    try {
      const users = await getAvailableDMUsers();
      setDmUsers(users as { id: string; name: string; role: string }[]);
    } catch {
      // silently fail
    }
    setLoadingDM(false);
  };

  const handleStartDM = async (userId: string) => {
    try {
      const channel = await getOrCreateDMChannel(userId);
      setShowNewDM(false);
      router.push(`/chat/${channel.id}`);
    } catch {
      // silently fail
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    setChannelError("");
    try {
      const channel = await createGroupChannel(newChannelName.trim());
      setShowNewChannel(false);
      setNewChannelName("");
      router.push(`/chat/${channel.id}`);
      router.refresh();
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : "Failed to create channel");
    }
    setCreatingChannel(false);
  };

  const handleDeleteChannel = async (channelId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this channel and all its messages?")) return;
    try {
      await deleteGroupChannel(channelId);
      router.refresh();
      if (pathname === `/chat/${channelId}`) {
        router.push("/chat");
      }
    } catch {
      // silently fail
    }
  };

  const filteredChannels = (chs: Channel[]) => {
    if (!search) return chs;
    return chs.filter((c) => {
      const name = c.name || c.project?.title || "";
      return name.toLowerCase().includes(search.toLowerCase());
    });
  };

  const getOtherUser = (channel: Channel) => {
    const other = channel.members.find((m) => m.user.id !== currentUserId);
    return other?.user;
  };

  return (
    <div className="w-72 brutalist-border border-t-0 border-b-0 border-l-0 flex flex-col bg-card h-full flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted">
        <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">
          MESSAGES
        </h3>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels..."
          className="w-full bg-surface-container-lowest brutalist-border px-2 py-1.5 text-[10px] text-on-surface font-mono placeholder:text-on-surface/30 focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Group Channels */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <p className="font-headline text-[8px] uppercase tracking-widest text-on-surface/40">
              CHANNELS
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowNewChannel(true)}
                className="flex h-5 w-5 items-center justify-center text-on-surface/40 hover:text-primary transition-colors"
                title="Create Channel"
              >
                <span className="material-symbols-outlined text-xs">add</span>
              </button>
            )}
          </div>
          {filteredChannels(groupChannels).length === 0 ? (
            <p className="font-mono text-[9px] text-on-surface/30 px-2 py-1">No channels yet</p>
          ) : (
            filteredChannels(groupChannels).map((ch) => {
              const isActive = pathname === `/chat/${ch.id}`;
              return (
                <Link
                  key={ch.id}
                  href={`/chat/${ch.id}`}
                  className={`group flex items-center gap-2 px-2 py-2 transition-colors ${
                    isActive
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-card-muted border-l-2 border-l-transparent"
                  }`}
                >
                  <span className="text-primary/60 font-mono text-[11px] flex-shrink-0">#</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                      {ch.name}
                    </p>
                    {ch.messages[0] && (
                      <p className="font-mono text-[8px] text-on-surface/40 truncate">
                        {ch.messages[0].user.name}: {ch.messages[0].content?.substring(0, 30)}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      onClick={(e) => handleDeleteChannel(ch.id, e)}
                      className="opacity-0 group-hover:opacity-100 text-on-surface/30 hover:text-red-400 transition-all flex-shrink-0"
                      title="Delete channel"
                    >
                      <span className="material-symbols-outlined text-[11px]">close</span>
                    </button>
                  )}
                </Link>
              );
            })
          )}
        </div>

        {/* Direct Messages */}
        <div className="px-3 py-2 border-t border-outline-variant/20">
          <div className="flex items-center justify-between mb-1">
            <p className="font-headline text-[8px] uppercase tracking-widest text-on-surface/40">
              DIRECT_MESSAGES
            </p>
            <button
              onClick={handleNewDM}
              className="flex h-5 w-5 items-center justify-center text-on-surface/40 hover:text-primary transition-colors"
            >
              <span className="material-symbols-outlined text-xs">add</span>
            </button>
          </div>

          {filteredChannels(directChannels).map((ch) => {
            const isActive = pathname === `/chat/${ch.id}`;
            const otherUser = getOtherUser(ch);
            return (
              <Link
                key={ch.id}
                href={`/chat/${ch.id}`}
                className={`flex items-center gap-2 px-2 py-2 transition-colors ${
                  isActive
                    ? "bg-primary/10 border-l-2 border-l-primary"
                    : "hover:bg-card-muted border-l-2 border-l-transparent"
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center bg-surface-container-high text-[8px] font-headline font-bold text-on-surface/60 flex-shrink-0 uppercase">
                  {otherUser?.name.charAt(0) || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                    {otherUser?.name || "Unknown"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* New Channel Modal */}
      {showNewChannel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewChannel(false)} />
          <div className="relative bg-card brutalist-border w-72 flex flex-col">
            <div className="px-3 py-2 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
              <h4 className="font-headline text-[9px] uppercase tracking-widest text-card-text">
                CREATE_CHANNEL
              </h4>
              <button onClick={() => setShowNewChannel(false)} className="text-on-surface/40 hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="p-3 space-y-3">
              <div>
                <label className="block font-headline text-[8px] uppercase tracking-widest text-on-surface/50 mb-1">
                  Channel Name
                </label>
                <input
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. General, Solitario, CS Jewels..."
                  className="w-full bg-surface-container-lowest brutalist-border px-2 py-1.5 text-[10px] text-on-surface font-mono placeholder:text-on-surface/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateChannel();
                  }}
                  autoFocus
                />
              </div>
              {channelError && (
                <p className="font-mono text-[9px] text-red-400">{channelError}</p>
              )}
              <button
                onClick={handleCreateChannel}
                disabled={creatingChannel || !newChannelName.trim()}
                className="w-full brutalist-border bg-primary/10 hover:bg-primary/20 text-primary font-headline text-[9px] uppercase tracking-widest py-2 transition-colors disabled:opacity-50"
              >
                {creatingChannel ? "Creating..." : "Create Channel"}
              </button>
              <p className="font-mono text-[8px] text-on-surface/30 leading-relaxed">
                All team members will be added automatically.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* New DM Modal */}
      {showNewDM && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowNewDM(false)} />
          <div className="relative bg-card brutalist-border w-64 max-h-80 flex flex-col">
            <div className="px-3 py-2 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between">
              <h4 className="font-headline text-[9px] uppercase tracking-widest text-card-text">
                NEW_DIRECT_MESSAGE
              </h4>
              <button onClick={() => setShowNewDM(false)} className="text-on-surface/40 hover:text-on-surface">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/20">
              {loadingDM ? (
                <p className="p-3 font-mono text-[9px] text-on-surface/40 text-center uppercase">
                  Loading...
                </p>
              ) : (
                dmUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleStartDM(u.id)}
                    className="w-full px-3 py-2 text-left hover:bg-card-muted transition-colors flex items-center gap-2"
                  >
                    <div className="flex h-6 w-6 items-center justify-center bg-surface-container-high text-[9px] font-headline font-bold text-on-surface/60 uppercase">
                      {u.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-headline text-[10px] uppercase tracking-wider text-card-text">
                        {u.name}
                      </p>
                      <p className="font-mono text-[8px] text-on-surface/40 uppercase">{u.role}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
