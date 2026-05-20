"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import type { Role } from "@prisma/client";

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

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; name: string; email: string; image?: string; role: Role };
  navItems: NavItem[];
}

export function MobileSidebar({ isOpen, onClose, user, navItems }: MobileSidebarProps) {
  const pathname = usePathname();

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "MANAGEMENT",
    EMPLOYEE: "EMPLOYEE",
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" />
        <Dialog.Content 
          className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r-2 brutalist-border shadow-2xl animate-in slide-in-from-left duration-300 focus:outline-none flex flex-col"
        >
          <Dialog.Title className="sr-only">Navigation Menu</Dialog.Title>
          <div className="flex items-center justify-between p-4 border-b border-on-surface/10">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center bg-primary-container text-xs font-headline font-bold text-white">
                E
              </div>
              <span className="text-sm font-headline font-bold text-foreground uppercase tracking-tight">
                EOD <span className="text-primary">Flow</span>
              </span>
            </div>
            <Dialog.Close asChild>
              <button className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-foreground transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </Dialog.Close>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const iconName = ICON_MAP[item.icon] ?? "space_dashboard";
                const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href + item.label}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 text-sm transition-colors font-label uppercase text-[12px] tracking-widest",
                      isActive
                        ? "bg-primary-container/20 text-primary border-l-4 border-l-primary"
                        : "text-outline hover:bg-card/5 hover:text-foreground border-l-4 border-l-transparent"
                    )}
                  >
                    <span className="material-symbols-outlined text-xl flex-shrink-0">{iconName}</span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-on-surface/10 p-4 bg-card-muted/30">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center bg-primary-container/30 text-sm font-headline font-bold text-primary uppercase">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-headline font-bold text-foreground uppercase tracking-tight">
                  {user.name}
                </p>
                <p className="truncate text-[9px] font-label text-outline uppercase tracking-widest">
                  {roleLabel[user.role]}
                </p>
              </div>
              <button
                onClick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = "/login" } } })}
                className="flex h-9 w-9 items-center justify-center brutalist-border text-outline hover:bg-error/10 hover:text-error transition-colors"
              >
                <span className="material-symbols-outlined text-sm">logout</span>
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
