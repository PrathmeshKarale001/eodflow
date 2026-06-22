"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import type { BrandNode } from "@/components/sidebar/sidebar";

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
  brands?: BrandNode[];
  allClients?: BrandNode[];
}

export function MobileSidebar({ isOpen, onClose, user, navItems, brands = [], allClients = [] }: MobileSidebarProps) {
  const pathname = usePathname();
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "MANAGEMENT",
    EMPLOYEE: "EMPLOYEE",
  };

  const toggleBrand = (brandId: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brandId]: !prev[brandId] }));
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
              <img src="/flowlogo.svg" alt="EOD Flow" className="h-6 w-auto block" />
            </div>
            <Dialog.Close asChild>
              <button className="flex h-8 w-8 items-center justify-center brutalist-border text-outline hover:text-foreground transition-colors">
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </Dialog.Close>
          </div>

          {/* Quick Actions */}
          <div className="px-3 py-3 border-b border-on-surface/10 flex gap-2">
            <Link
              href="/tasks?action=new-task"
              onClick={onClose}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 mono-clip bg-primary-container text-xs font-headline font-bold text-white uppercase hover:bg-primary-container/80 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Task
            </Link>
            <Link
              href="/projects/new"
              onClick={onClose}
              className="flex h-9 flex-1 items-center justify-center gap-1.5 brutalist-border text-xs font-headline font-bold text-outline uppercase hover:text-foreground hover:bg-card/10 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
              Project
            </Link>
          </div>

          <nav className="flex-1 overflow-y-auto">
            {/* Navigation Links */}
            <div className="px-2 py-4 space-y-1">
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

            {/* Brand → Project Tree */}
            {brands.length > 0 && (
              <div className="px-2 py-2 border-t border-on-surface/10">
                <div className="flex items-center justify-between px-4 py-1.5 mb-1">
                  <span className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface/40">Brands</span>
                  <Link
                    href="/clients/new"
                    onClick={onClose}
                    className="flex h-5 w-5 items-center justify-center text-on-surface/30 hover:text-primary transition-colors"
                    title="New Brand"
                  >
                    <span className="material-symbols-outlined text-xs">add</span>
                  </Link>
                </div>
                <div className="space-y-0.5">
                  {brands.map((brand) => {
                    const isExpanded = expandedBrands[brand.id] ?? false;
                    const totalTasks = brand.projects.reduce((sum, p) => sum + p._count.tasks, 0);
                    const hasBrandActive = pathname.startsWith(`/clients/${brand.id}`) ||
                      brand.projects.some((p) => pathname === `/projects/${p.id}`);

                    return (
                      <div key={brand.id}>
                        {/* Brand Row */}
                        <button
                          onClick={() => toggleBrand(brand.id)}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-2 text-left transition-colors group",
                            hasBrandActive
                              ? "text-foreground"
                              : "text-outline hover:text-foreground hover:bg-card/5"
                          )}
                        >
                          <span
                            className={cn(
                              "material-symbols-outlined text-xs transition-transform duration-200",
                              isExpanded ? "rotate-90" : ""
                            )}
                          >
                            chevron_right
                          </span>
                          <span
                            className="w-3 h-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: brand.brandColor }}
                          />
                          <span className="font-label text-[10px] uppercase tracking-widest truncate flex-1">
                            {brand.companyName}
                          </span>
                          {totalTasks > 0 && (
                            <span className="text-[9px] font-mono text-on-surface/30 flex-shrink-0">
                              {totalTasks}
                            </span>
                          )}
                        </button>

                        {/* Nested Projects */}
                        {isExpanded && (
                          <div className="ml-6 border-l border-on-surface/10 pl-2 space-y-0.5 py-0.5">
                            {brand.projects.map((project) => {
                              const isProjectActive = pathname === `/projects/${project.id}`;
                              return (
                                <Link
                                  key={project.id}
                                  href={`/projects/${project.id}`}
                                  onClick={onClose}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 transition-colors",
                                    isProjectActive
                                      ? "bg-primary-container/20 text-primary"
                                      : "text-outline hover:text-foreground hover:bg-card/5"
                                  )}
                                >
                                  <span className="material-symbols-outlined text-xs text-on-surface/30">
                                    {project.status === "ACTIVE" ? "folder_open" : "folder"}
                                  </span>
                                  <span className="font-label text-[10px] uppercase tracking-wide truncate flex-1">
                                    {project.title}
                                  </span>
                                  {project._count.tasks > 0 && (
                                    <span className={cn(
                                      "text-[9px] font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0",
                                      isProjectActive
                                        ? "bg-primary/20 text-primary"
                                        : "text-on-surface/30"
                                    )}>
                                      {project._count.tasks}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                            {/* Quick Add Project under this Brand */}
                            <Link
                              href={`/projects/new?clientId=${brand.id}`}
                              onClick={onClose}
                              className="flex items-center gap-2 px-3 py-1.5 text-on-surface/20 hover:text-primary transition-colors"
                            >
                              <span className="material-symbols-outlined text-xs">add</span>
                              <span className="font-label text-[9px] uppercase tracking-widest">Add Project</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* All Clients Section (ADMIN + EMPLOYEE) */}
            {allClients.length > 0 && (
              <div className="px-2 py-2 border-t border-on-surface/10">
                <div className="flex items-center justify-between px-4 py-1.5 mb-1">
                  <span className="font-label text-[9px] uppercase tracking-[0.2em] text-on-surface/40">All Clients</span>
                </div>
                <div className="space-y-0.5">
                  {allClients.map((brand) => {
                    const isExpanded = expandedBrands[`all-${brand.id}`] ?? false;
                    const totalTasks = brand.projects.reduce((sum, p) => sum + p._count.tasks, 0);
                    const hasBrandActive = pathname.startsWith(`/clients/${brand.id}`) ||
                      brand.projects.some((p) => pathname === `/projects/${p.id}`);

                    return (
                      <div key={brand.id}>
                        <button
                          onClick={() => setExpandedBrands((prev) => ({ ...prev, [`all-${brand.id}`]: !prev[`all-${brand.id}`] }))}
                          className={cn(
                            "w-full flex items-center gap-2 px-4 py-1.5 text-left transition-colors group",
                            hasBrandActive
                              ? "text-foreground"
                              : "text-outline hover:text-foreground hover:bg-card/5"
                          )}
                        >
                          <span
                            className={cn(
                              "material-symbols-outlined text-xs transition-transform duration-200",
                              isExpanded ? "rotate-90" : ""
                            )}
                          >
                            chevron_right
                          </span>
                          <span
                            className="w-3 h-3 flex-shrink-0 rounded-sm"
                            style={{ backgroundColor: brand.brandColor }}
                          />
                          <span className="font-label text-[10px] uppercase tracking-widest truncate flex-1">
                            {brand.companyName}
                          </span>
                          {totalTasks > 0 && (
                            <span className="text-[9px] font-mono text-on-surface/30 flex-shrink-0">
                              {totalTasks}
                            </span>
                          )}
                        </button>

                        {isExpanded && (
                          <div className="ml-6 border-l border-on-surface/10 pl-2 space-y-0.5 py-0.5">
                            {brand.projects.length === 0 && (
                              <span className="px-2 py-1 font-mono text-[8px] text-on-surface/20 uppercase">No projects</span>
                            )}
                            {brand.projects.map((project) => {
                              const isProjectActive = pathname === `/projects/${project.id}`;
                              return (
                                <Link
                                  key={project.id}
                                  href={`/projects/${project.id}`}
                                  onClick={onClose}
                                  className={cn(
                                    "flex items-center gap-2 px-2 py-1 transition-colors",
                                    isProjectActive
                                      ? "bg-primary-container/20 text-primary"
                                      : "text-outline hover:text-foreground hover:bg-card/5"
                                  )}
                                >
                                  <span className="material-symbols-outlined text-xs text-on-surface/30">
                                    {project.status === "ACTIVE" ? "folder_open" : "folder"}
                                  </span>
                                  <span className="font-label text-[10px] uppercase tracking-wide truncate flex-1">
                                    {project.title}
                                  </span>
                                  {project._count.tasks > 0 && (
                                    <span className={cn(
                                      "text-[9px] font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0",
                                      isProjectActive ? "bg-primary/20 text-primary" : "text-on-surface/30"
                                    )}>
                                      {project._count.tasks}
                                    </span>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
