"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/sidebar/mobile-sidebar";
import { NavItem } from "@/lib/permissions";
import { Role } from "@prisma/client";

interface DashboardHeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    role: Role;
  };
  navItems: NavItem[];
}

export function DashboardHeader({ user, navItems }: DashboardHeaderProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <header className="hidden max-md:flex sticky top-0 z-30 h-14 w-full items-center justify-between border-b brutalist-border bg-background px-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="flex h-9 w-9 items-center justify-center brutalist-border text-foreground hover:bg-card/10 transition-colors"
          aria-label="Open Menu"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex items-center gap-2">
          <img src="/flowlogo.svg" alt="EOD Flow" className="h-5 w-auto block" />
        </div>
      </div>

      <div className="flex items-center gap-2">
         <div className="flex h-7 w-7 items-center justify-center bg-primary-container/30 text-[10px] font-headline font-bold text-primary uppercase">
            {user.name.charAt(0)}
          </div>
      </div>

      <MobileSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        user={user}
        navItems={navItems}
      />
    </header>
  );
}
