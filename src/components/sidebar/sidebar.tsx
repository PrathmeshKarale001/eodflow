"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { NotificationBell } from "@/components/notifications/notification-bell";

const ICON_MAP: Record<string, string> = {
  LayoutDashboard: "space_dashboard",
  CheckSquare: "task_alt",
  CalendarDays: "calendar_month",
  Timer: "timer",
  FolderKanban: "folder_open",
  Building2: "domain",
  FileStack: "folder_copy",
  MessageSquare: "forum",
  BarChart3: "bar_chart",
  Users: "group",
  Settings: "settings",
};

interface SidebarProps {
  user: { id: string; name: string; email: string; image?: string; role: Role };
  navItems: NavItem[];
  unreadCount?: number;
}

export function Sidebar({ user, navItems, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<{ id: string; name: string; image: string | null }[]>([]);
  const [chatSearching, setChatSearching] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "MANAGEMENT",
    EMPLOYEE: "EMPLOYEE",
  };

  return (
    <aside
      className={cn(
        "flex max-md:hidden h-full flex-col brutalist-border border-r-2 border-r-white/20 bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-on-surface/10">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center bg-primary-container text-xs font-headline font-bold text-white">
              E
            </div>
            <span className="text-sm font-headline font-bold text-foreground uppercase tracking-tight">
              EOD <span className="text-primary">Flow</span>
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:bg-card/5 hover:text-foreground transition-colors"
        >
          <span className={cn("material-symbols-outlined text-sm transition-transform", collapsed && "rotate-180")}>
            chevron_left
          </span>
        </button>
      </div>

      {/* Quick Chat Search */}
      {!collapsed && (
        <div className="px-3 pt-3 pb-1.5">
          <div className="relative">
            <div className="flex items-center gap-2 brutalist-border bg-surface-container-lowest px-2.5 py-1.5">
              <span className="material-symbols-outlined text-sm text-on-surface/30">chat</span>
              <input
                type="text"
                value={chatSearch}
                onChange={async (e) => {
                  const val = e.target.value;
                  setChatSearch(val);
                  setChatSearchOpen(true);
                  if (val.trim().length < 1) {
                    setChatSearchResults([]);
                    return;
                  }
                  setChatSearching(true);
                  try {
                    const { getAvailableDMUsers } = await import("@/app/actions/chat");
                    const users = await getAvailableDMUsers();
                    const filtered = (users as { id: string; name: string; image?: string | null }[]).filter(
                      (u) => u.name.toLowerCase().includes(val.toLowerCase()) && u.id !== user.id
                    );
                    setChatSearchResults(filtered.slice(0, 5).map((u) => ({ id: u.id, name: u.name, image: u.image ?? null })));
                  } catch { setChatSearchResults([]); }
                  finally { setChatSearching(false); }
                }}
                onFocus={() => setChatSearchOpen(true)}
                placeholder="Quick chat..."
                className="flex-1 bg-transparent font-body text-xs text-foreground placeholder:text-on-surface/30 focus:outline-none min-w-0"
              />
              {chatSearching && (
                <span className="material-symbols-outlined text-xs text-primary animate-spin">progress_activity</span>
              )}
            </div>
            {/* Search Results Dropdown */}
            {chatSearchOpen && chatSearch.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-50 brutalist-border bg-surface-container-lowest max-h-40 overflow-y-auto shadow-lg">
                {chatSearchResults.length === 0 && !chatSearching ? (
                  <div className="p-3 text-center">
                    <p className="font-label text-[9px] uppercase tracking-widest text-on-surface/30">NO_USERS_FOUND</p>
                  </div>
                ) : (
                  chatSearchResults.map((u) => (
                    <button
                      key={u.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-container-low transition-colors"
                      onClick={async () => {
                        setChatSearch("");
                        setChatSearchOpen(false);
                        setChatSearchResults([]);
                        try {
                          const { getOrCreateDMChannel } = await import("@/app/actions/chat");
                          const channelId = await getOrCreateDMChannel(u.id);
                          router.push(`/chat/${channelId}`);
                        } catch {}
                      }}
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-primary-container/30 text-[9px] font-headline font-bold text-primary uppercase overflow-hidden">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={u.image} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name.charAt(0)
                        )}
                      </div>
                      <span className="font-label text-[10px] uppercase tracking-wide text-foreground truncate">{u.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick actions */}
      {!collapsed && (
        <div className="px-3 pb-3 pt-1.5 border-b border-on-surface/10 space-y-1.5">
          {/* Row 1: New Project (full width) */}
          <Link
            href="/projects/new"
            className="flex h-8 w-full items-center justify-center gap-1.5 mono-clip bg-primary-container text-xs font-headline font-bold text-white uppercase hover:bg-primary-container/80 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Project
          </Link>

          {/* Row 2: Admin-only quick actions + notification bell */}
          <div className="flex gap-1.5">
            {(user.role === "SUPER_ADMIN" || user.role === "ADMIN") && (
              <>
                <Link
                  href="/chat?action=new-channel"
                  title="New Channel"
                  className="flex h-8 flex-1 items-center justify-center gap-1 brutalist-border text-xs font-headline font-bold text-outline hover:text-foreground hover:bg-card/10 transition-colors uppercase"
                >
                  <span className="material-symbols-outlined text-sm">tag</span>
                  <span className="text-[10px]">Channel</span>
                </Link>
                <Link
                  href="/settings?tab=users&action=invite"
                  title="Invite User"
                  className="flex h-8 flex-1 items-center justify-center gap-1 brutalist-border text-xs font-headline font-bold text-outline hover:text-foreground hover:bg-card/10 transition-colors uppercase"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span className="text-[10px]">Invite</span>
                </Link>
              </>
            )}
            <NotificationBell userId={user.id} initialCount={unreadCount} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const iconName = ICON_MAP[item.icon] ?? "space_dashboard";
            const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors font-label uppercase text-[11px] tracking-widest",
                  isActive
                    ? "bg-primary-container/20 text-primary border-l-2 border-l-primary"
                    : "text-outline hover:bg-card/5 hover:text-foreground border-l-2 border-l-transparent"
                )}
              >
                <span className="material-symbols-outlined text-base flex-shrink-0">{iconName}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User profile */}
      <div className="border-t border-on-surface/10 p-3">
        <div className="flex items-center gap-2.5">
          <Link href="/profile" className="flex items-center gap-2.5 group cursor-pointer flex-1 min-w-0">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary-container/30 text-xs font-headline font-bold text-primary uppercase group-hover:bg-primary/20 transition-colors overflow-hidden">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0)
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-headline font-bold text-foreground uppercase tracking-tight group-hover:text-primary transition-colors">
                  {user.name}
                </p>
                <p className="truncate text-[9px] font-label text-outline uppercase tracking-widest">
                  {roleLabel[user.role]}
                </p>
              </div>
            )}
          </Link>
          {!collapsed && (
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login" } } })}
              className="flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:bg-error/10 hover:text-error transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
