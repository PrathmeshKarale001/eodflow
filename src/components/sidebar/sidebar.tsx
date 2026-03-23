"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { NotificationBell } from "@/components/notifications/notification-bell";

const ICON_MAP: Record<string, string> = {
  LayoutDashboard: "space_dashboard",
  CheckSquare: "task_alt",
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
  const [collapsed, setCollapsed] = useState(false);

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "ACCOUNT_MGR",
    MANAGER: "TEAM_LEAD",
    EMPLOYEE: "TEAM_MEMBER",
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col brutalist-border border-r-2 border-r-white/20 bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
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
          className="flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:bg-white/5 hover:text-foreground transition-colors"
        >
          <span className={cn("material-symbols-outlined text-sm transition-transform", collapsed && "rotate-180")}>
            chevron_left
          </span>
        </button>
      </div>

      {/* Quick actions */}
      {!collapsed && (
        <div className="flex gap-1.5 px-3 py-3 border-b border-white/10">
          <Link
            href="/projects/new"
            className="flex h-8 flex-1 items-center justify-center gap-1.5 mono-clip bg-primary-container text-xs font-headline font-bold text-white uppercase hover:bg-primary-container/80 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Project
          </Link>
          <NotificationBell userId={user.id} initialCount={unreadCount} />
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
                    : "text-outline hover:bg-white/5 hover:text-foreground border-l-2 border-l-transparent"
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
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center bg-primary-container/30 text-xs font-headline font-bold text-primary uppercase">
            {user.name.charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-headline font-bold text-foreground uppercase tracking-tight">
                {user.name}
              </p>
              <p className="truncate text-[9px] font-label text-outline uppercase tracking-widest">
                {roleLabel[user.role]}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-7 w-7 items-center justify-center brutalist-border text-outline hover:bg-error/10 hover:text-error transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
