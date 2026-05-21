"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUnread } from "./chat-provider";
import {
  getOrCreateDMChannel,
  getAvailableDMUsers,
  createGroupChannel,
  deleteGroupChannel,
} from "@/app/actions/chat";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@prisma/client";

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
  canManageChannels: boolean;
  isMobile?: boolean;
}

interface AvailableUser {
  id: string;
  name: string;
  role: string;
  department: string | null;
}

export function ChatSidebar({ channels, currentUserId, canManageChannels, isMobile = false }: ChatSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCounts } = useUnread();
  const searchParams = useSearchParams();
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [dmUsers, setDmUsers] = useState<AvailableUser[]>([]);
  const [loadingDM, setLoadingDM] = useState(false);
  const [search, setSearch] = useState("");
  const [newChannelName, setNewChannelName] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [channelError, setChannelError] = useState("");

  // Member picker state
  const [channelStep, setChannelStep] = useState<1 | 2>(1);
  const [availableMembers, setAvailableMembers] = useState<AvailableUser[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [memberSearch, setMemberSearch] = useState("");
  const [loadingMembers, setLoadingMembers] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "new-channel") {
      setShowNewChannel(true);
    }
  }, [searchParams]);

  const groupChannels = channels.filter((c) => c.type === "GROUP");
  const directChannels = channels.filter((c) => c.type === "DIRECT");

  const handleNewDM = async () => {
    setShowNewDM(true);
    setLoadingDM(true);
    try {
      const users = await getAvailableDMUsers();
      setDmUsers(users as AvailableUser[]);
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

  // Step 1 → Step 2: load available members
  const handleNextStep = async () => {
    if (!newChannelName.trim()) return;
    setLoadingMembers(true);
    try {
      const users = await getAvailableDMUsers();
      setAvailableMembers(users as AvailableUser[]);
    } catch {
      // silently fail
    }
    setLoadingMembers(false);
    setChannelStep(2);
  };

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAll = () => {
    const filtered = filteredAvailableMembers();
    if (filtered.every((u) => selectedMembers.has(u.id))) {
      // Deselect all filtered
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        filtered.forEach((u) => next.delete(u.id));
        return next;
      });
    } else {
      // Select all filtered
      setSelectedMembers((prev) => {
        const next = new Set(prev);
        filtered.forEach((u) => next.add(u.id));
        return next;
      });
    }
  };

  const filteredAvailableMembers = () => {
    if (!memberSearch) return availableMembers;
    return availableMembers.filter((u) =>
      u.name.toLowerCase().includes(memberSearch.toLowerCase())
    );
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) return;
    setCreatingChannel(true);
    setChannelError("");
    try {
      const channel = await createGroupChannel(
        newChannelName.trim(),
        Array.from(selectedMembers)
      );
      resetCreateModal();
      router.push(`/chat/${channel.id}`);
      router.refresh();
    } catch (err) {
      setChannelError(err instanceof Error ? err.message : "Failed to create channel");
    }
    setCreatingChannel(false);
  };

  const resetCreateModal = () => {
    setShowNewChannel(false);
    setNewChannelName("");
    setChannelStep(1);
    setSelectedMembers(new Set());
    setMemberSearch("");
    setChannelError("");
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
    <div className={`${isMobile ? 'w-full' : 'w-full md:w-72'} brutalist-border border-t-0 border-b-0 border-l-0 flex flex-col bg-card h-full flex-shrink-0`}>
      {/* Header */}
      <div className="px-4 py-3 brutalist-border border-t-0 border-x-0 bg-card-muted">
        <div className="flex items-center justify-between">
          <h3 className="font-headline text-[10px] uppercase tracking-widest text-card-text">
            MESSAGES
          </h3>
          {/* Mobile: show new DM + new channel buttons in header */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleNewDM}
                className="flex items-center gap-1 px-2 py-1 brutalist-border text-[8px] font-headline uppercase tracking-widest text-on-surface/60 hover:text-primary hover:border-primary/30 transition-colors"
              >
                <span className="material-symbols-outlined text-xs">chat</span>
                NEW_DM
              </button>
              {canManageChannels && (
                <button
                  onClick={() => setShowNewChannel(true)}
                  className="flex items-center gap-1 px-2 py-1 brutalist-border text-[8px] font-headline uppercase tracking-widest text-on-surface/60 hover:text-primary hover:border-primary/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  CHANNEL
                </button>
              )}
            </div>
          )}
        </div>
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
            {canManageChannels && (
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
              const unread = unreadCounts[ch.id] ?? 0;
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
                    <p className={`font-headline text-[10px] uppercase tracking-wider truncate ${
                      unread > 0 ? "text-on-surface" : "text-card-text"
                    }`}>
                      {ch.name}
                    </p>
                    {ch.messages[0] && (
                      <p className="font-mono text-[8px] text-on-surface/40 truncate">
                        {ch.messages[0].user.name}: {ch.messages[0].content?.substring(0, 30)}
                      </p>
                    )}
                  </div>
                  {unread > 0 && (
                    <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-primary text-on-primary text-[8px] font-bold font-mono rounded-full flex items-center justify-center px-1">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                  {canManageChannels && unread === 0 && (
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
            const unread = unreadCounts[ch.id] ?? 0;
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
                <div className="relative flex-shrink-0">
                  <div className="flex h-5 w-5 items-center justify-center bg-surface-container-high text-[8px] font-headline font-bold text-on-surface/60 uppercase">
                    {otherUser?.name.charAt(0) || "?"}
                  </div>
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] bg-primary text-on-primary text-[7px] font-bold font-mono rounded-full flex items-center justify-center px-0.5">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`font-headline text-[10px] uppercase tracking-wider truncate ${
                    unread > 0 ? "text-on-surface" : "text-card-text"
                  }`}>
                    {otherUser?.name || "Unknown"}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* CREATE CHANNEL MODAL — Two-step: Name → Select Members                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showNewChannel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={resetCreateModal} />
          <div className="relative bg-card brutalist-border w-80 max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-3 py-2 brutalist-border border-t-0 border-x-0 bg-card-muted flex items-center justify-between flex-shrink-0">
              <h4 className="font-headline text-[9px] uppercase tracking-widest text-card-text">
                {channelStep === 1 ? "CREATE_CHANNEL" : "SELECT_MEMBERS"}
              </h4>
              <div className="flex items-center gap-1">
                {channelStep === 2 && (
                  <button
                    onClick={() => setChannelStep(1)}
                    className="text-on-surface/40 hover:text-on-surface text-[9px] font-mono uppercase"
                  >
                    ← BACK
                  </button>
                )}
                <button onClick={resetCreateModal} className="text-on-surface/40 hover:text-on-surface">
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>
            </div>

            {/* Step 1: Channel Name */}
            {channelStep === 1 && (
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
                      if (e.key === "Enter") handleNextStep();
                    }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleNextStep}
                  disabled={!newChannelName.trim() || loadingMembers}
                  className="w-full brutalist-border bg-primary/10 hover:bg-primary/20 text-primary font-headline text-[9px] uppercase tracking-widest py-2 transition-colors disabled:opacity-50"
                >
                  {loadingMembers ? "Loading..." : "NEXT → SELECT_MEMBERS"}
                </button>
              </div>
            )}

            {/* Step 2: Select Members */}
            {channelStep === 2 && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Member search */}
                <div className="px-3 pt-2 pb-1 flex-shrink-0">
                  <input
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search team members..."
                    className="w-full bg-surface-container-lowest brutalist-border px-2 py-1.5 text-[10px] text-on-surface font-mono placeholder:text-on-surface/30 focus:outline-none focus:ring-1 focus:ring-primary"
                    autoFocus
                  />
                </div>

                {/* Select all / count */}
                <div className="px-3 py-1.5 flex items-center justify-between flex-shrink-0">
                  <button
                    onClick={selectAll}
                    className="font-mono text-[8px] text-primary uppercase tracking-widest hover:underline"
                  >
                    {filteredAvailableMembers().every((u) => selectedMembers.has(u.id))
                      ? "DESELECT_ALL"
                      : "SELECT_ALL"}
                  </button>
                  <span className="font-mono text-[8px] text-on-surface/40 uppercase">
                    {selectedMembers.size} SELECTED
                  </span>
                </div>

                {/* Member list */}
                <div className="flex-1 overflow-y-auto max-h-60 divide-y divide-outline-variant/10 px-1">
                  {filteredAvailableMembers().map((u) => {
                    const isSelected = selectedMembers.has(u.id);
                    return (
                      <button
                        key={u.id}
                        onClick={() => toggleMember(u.id)}
                        className={`w-full px-2 py-2 text-left flex items-center gap-2 transition-colors ${
                          isSelected ? "bg-primary/10" : "hover:bg-card-muted"
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 brutalist-border flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-primary" : ""
                        }`}>
                          {isSelected && (
                            <span className="material-symbols-outlined text-[10px] text-on-primary">check</span>
                          )}
                        </div>
                        {/* Avatar */}
                        <div className="flex h-6 w-6 items-center justify-center bg-surface-container-high text-[9px] font-headline font-bold text-on-surface/60 uppercase flex-shrink-0">
                          {u.name.charAt(0)}
                        </div>
                        {/* Info */}
                        <div className="min-w-0 flex-1">
                          <p className="font-headline text-[10px] uppercase tracking-wider text-card-text truncate">
                            {u.name}
                          </p>
                          <p className="font-mono text-[8px] text-on-surface/40 uppercase">
                            {ROLE_LABELS[u.role as Role] || u.role}
                            {u.department ? ` · ${u.department}` : ""}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Error */}
                {channelError && (
                  <p className="px-3 font-mono text-[9px] text-red-400">{channelError}</p>
                )}

                {/* Create button */}
                <div className="p-3 flex-shrink-0 border-t border-outline-variant/20">
                  <button
                    onClick={handleCreateChannel}
                    disabled={creatingChannel || !newChannelName.trim()}
                    className="w-full brutalist-border bg-primary/10 hover:bg-primary/20 text-primary font-headline text-[9px] uppercase tracking-widest py-2 transition-colors disabled:opacity-50"
                  >
                    {creatingChannel
                      ? "CREATING..."
                      : `CREATE "${newChannelName.toUpperCase()}" → ${selectedMembers.size + 1} MEMBERS`}
                  </button>
                  <p className="font-mono text-[7px] text-on-surface/30 mt-1.5 text-center">
                    You will be added automatically as channel creator
                  </p>
                </div>
              </div>
            )}
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
                      <p className="font-mono text-[8px] text-on-surface/40 uppercase">
                        {ROLE_LABELS[u.role as Role] || u.role}
                      </p>
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
