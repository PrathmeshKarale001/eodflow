"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn, getInitials } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import {
  LayoutDashboard, CheckSquare, FolderKanban, Building2,
  FileStack, MessageSquare, BarChart3, Users, Settings,
  ChevronLeft, LogOut, Bell, Search, Plus,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, CheckSquare, FolderKanban, Building2,
  FileStack, MessageSquare, BarChart3, Users, Settings,
};

interface SidebarProps {
  user: { name: string; email: string; image?: string; role: Role };
  navItems: NavItem[];
}

export function Sidebar({ user, navItems }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "Director",
    ADMIN: "Account Manager",
    MANAGER: "Team Lead",
    EMPLOYEE: "Team Member",
  };

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border bg-card transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground">
              E
            </div>
            <span className="text-sm font-semibold text-foreground">
              EOD Flow
            </span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronLeft
            className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")}
          />
        </button>
      </div>

      {/* Quick actions */}
      {!collapsed && (
        <div className="flex gap-1.5 px-3 pb-3">
          <button className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="h-3.5 w-3.5" />
            New task
          </button>
          <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors">
            <Search className="h-3.5 w-3.5" />
          </button>
          <button className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-accent transition-colors">
            <Bell className="h-3.5 w-3.5" />
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = ICON_MAP[item.icon] ?? LayoutDashboard;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User profile */}
      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
            {getInitials(user.name)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {roleLabel[user.role]}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
