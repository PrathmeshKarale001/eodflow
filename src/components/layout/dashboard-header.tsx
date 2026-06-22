"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { NavItem } from "@/lib/permissions";
import { Role } from "@prisma/client";
import type { BrandNode } from "@/components/sidebar/sidebar";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: Role;
  };
  navItems: NavItem[];
  unreadCount?: number;
  brands?: BrandNode[];
  allClients?: BrandNode[];
}

export function DashboardHeader({ user, navItems, unreadCount = 0, brands = [], allClients = [] }: DashboardHeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <header className="hidden max-md:flex sticky top-0 z-30 h-14 w-full items-center justify-between border-b brutalist-border bg-background px-3">
      {/* Left: menu + logo */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center brutalist-border text-foreground hover:bg-card/10 transition-colors"
          aria-label="Open Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <img src="/flowlogo.svg" alt="EOD Flow" className="h-5 w-auto block" />
      </div>

      {/* Right: quick actions + notification + avatar */}
      <div className="flex items-center gap-1.5">
        {/* New Task — compact on mobile */}
        <Link
          href="/tasks?action=new-task"
          className="flex h-8 items-center justify-center gap-1 px-2.5 mono-clip bg-primary-container text-[10px] font-headline font-bold text-white uppercase hover:bg-primary-container/80 transition-colors"
          title="New Task"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden xs:inline">Task</span>
        </Link>

        {/* New Project — icon only on mobile */}
        <Link
          href="/projects/new"
          className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-foreground hover:bg-card/10 transition-colors"
          title="New Project"
        >
          <span className="material-symbols-outlined text-sm">create_new_folder</span>
        </Link>

        {/* Notification Bell */}
        <NotificationBell userId={user.id} initialCount={unreadCount} />

        {/* User Avatar */}
        <Link href="/profile" className="flex-shrink-0">
          <div className="flex h-7 w-7 items-center justify-center bg-primary-container/30 text-[10px] font-headline font-bold text-primary uppercase overflow-hidden">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              user.name.charAt(0)
            )}
          </div>
        </Link>
      </div>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        navItems={navItems}
        brands={brands}
        allClients={allClients}
      />
    </header>
  );
}
