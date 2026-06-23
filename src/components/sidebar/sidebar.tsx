"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/permissions";
import { useUnread } from "@/components/chat/chat-provider";
import type { Role } from "@prisma/client";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { getAvailableDMUsers } from "@/app/actions/chat";

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

// ─── Brand type from layout server component ─────────────────────────────────
export interface BrandNode {
  id: string;
  companyName: string;
  brandColor: string;
  projects: Array<{
    id: string;
    title: string;
    status: string;
    _count: { tasks: number };
  }>;
}

interface SidebarProps {
  user: { id: string; name: string; email: string; image?: string; role: Role };
  navItems: NavItem[];
  unreadCount?: number;
  brands?: BrandNode[];
  allClients?: BrandNode[];
}

export function Sidebar({ user, navItems, unreadCount = 0, brands = [], allClients = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCounts } = useUnread();
  const totalChatUnread = Object.values(unreadCounts).reduce((sum, c) => sum + c, 0);
  const [collapsed, setCollapsed] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [chatSearchResults, setChatSearchResults] = useState<{ id: string; name: string; image: string | null }[]>([]);
  const [chatSearching, setChatSearching] = useState(false);
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; name: string; image: string | null }[] | null>(null);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // Prefetch available DM users on component mount to warm the search cache
  useEffect(() => {
    const initUsers = async () => {
      try {
        const users = await getAvailableDMUsers();
        setAllUsers(users.map((u) => ({ id: u.id, name: u.name, image: u.image ?? null })));
      } catch {
        setAllUsers([]);
      }
    };
    initUsers();
  }, []);

  const roleLabel: Record<Role, string> = {
    SUPER_ADMIN: "DIRECTOR",
    ADMIN: "MANAGEMENT",
    EMPLOYEE: "EMPLOYEE",
  };

  const toggleBrand = (brandId: string) => {
    setExpandedBrands((prev) => ({ ...prev, [brandId]: !prev[brandId] }));
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
            <img src="/flowlogo.svg" alt="EOD Flow" className="h-6 w-auto block" />
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
                onChange={(e) => {
                  const val = e.target.value;
                  setChatSearch(val);
                  setChatSearchOpen(true);
                  if (val.trim().length < 1) {
                    setChatSearchResults([]);
                    return;
                  }

                  if (allUsers) {
                    const filtered = allUsers.filter(
                      (u) => u.name.toLowerCase().includes(val.toLowerCase()) && u.id !== user.id
                    );
                    setChatSearchResults(filtered.slice(0, 5));
                  } else {
                    setChatSearching(true);
                    getAvailableDMUsers()
                      .then((users) => {
                        const mapped = users.map((u) => ({ id: u.id, name: u.name, image: u.image ?? null }));
                        setAllUsers(mapped);
                        const filtered = mapped.filter(
                          (u) => u.name.toLowerCase().includes(val.toLowerCase()) && u.id !== user.id
                        );
                        setChatSearchResults(filtered.slice(0, 5));
                      })
                      .catch(() => setChatSearchResults([]))
                      .finally(() => setChatSearching(false));
                  }
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
                    <p className="font-label text-[11px] uppercase tracking-widest text-on-surface/30">NO_USERS_FOUND</p>
                  </div>
                ) : (
                  chatSearchResults.map((u) => (
                    <button
                      key={u.id}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-surface-container-low transition-colors"
                      onClick={() => {
                        setChatSearch("");
                        setChatSearchOpen(false);
                        setChatSearchResults([]);
                        // Navigate instantly — chat sidebar handles DM resolution
                        router.push(`/chat?dm=${u.id}`);
                      }}
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-primary-container/30 text-[11px] font-headline font-bold text-primary uppercase overflow-hidden">
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
          {/* Row 1: New Task (primary) + New Project */}
          <div className="flex gap-1.5">
            <Link
              href="/tasks?action=new-task"
              className="flex h-8 flex-1 items-center justify-center gap-1.5 mono-clip bg-primary-container text-xs font-headline font-bold text-white uppercase hover:bg-primary-container/80 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              New Task
            </Link>
            <Link
              href="/projects/new"
              title="New Project"
              className="flex h-8 items-center justify-center gap-1 px-3 brutalist-border text-xs font-headline font-bold text-outline hover:text-foreground hover:bg-card/10 transition-colors uppercase"
            >
              <span className="material-symbols-outlined text-sm">create_new_folder</span>
              <span className="text-[10px]">Project</span>
            </Link>
          </div>

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

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
        {/* Navigation */}
        <nav className="px-2 py-2">
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const iconName = ICON_MAP[item.icon] ?? "space_dashboard";
              const isActive = pathname === item.href || (item.href !== "/overview" && pathname.startsWith(item.href));
              const isChatNav = item.href === "/chat";

              return (
                <Link
                  key={item.href + item.label}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 text-sm font-label uppercase text-[12px] tracking-widest rounded-lg transition-all duration-200 ease-out",
                    isActive
                      ? "bg-gradient-to-r from-primary-container/25 to-primary/10 text-primary border-l-2 border-l-primary shadow-sm"
                      : "text-outline hover:bg-surface-container-high/40 hover:text-foreground hover:translate-x-0.5 border-l-2 border-l-transparent"
                  )}
                >
                  <span className="material-symbols-outlined text-base flex-shrink-0">{iconName}</span>
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                  {isChatNav && totalChatUnread > 0 && (
                    <span className="min-w-[18px] h-[18px] bg-primary text-on-primary text-[11px] font-bold font-mono rounded-full flex items-center justify-center px-1 animate-pulse">
                      {totalChatUnread > 99 ? "99+" : totalChatUnread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* ─── Brand → Project Tree (ClickUp-style) ─────────────────────────── */}
        {!collapsed && brands.length > 0 && (
          <div className="px-2 py-2 border-t border-on-surface/10">
            <div className="flex items-center justify-between px-3 py-1.5 mb-1">
              <span className="font-label text-[11px] uppercase tracking-[0.15em] text-on-surface/40">Brands</span>
              <Link
                href="/clients/new"
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
                        "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group",
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
                        <span className="text-[11px] font-mono text-on-surface/30 flex-shrink-0">
                          {totalTasks}
                        </span>
                      )}
                    </button>

                    {/* Nested Projects */}
                    {isExpanded && (
                      <div className="ml-5 border-l border-on-surface/10 pl-2 space-y-0.5 py-0.5">
                        {brand.projects.length === 0 && (
                          <span className="px-2 py-1 font-mono text-[10px] text-on-surface/20 uppercase">No projects</span>
                        )}
                        {brand.projects.map((project) => {
                          const isProjectActive = pathname === `/projects/${project.id}`;
                          return (
                            <Link
                              key={project.id}
                              href={`/projects/${project.id}`}
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
                                  "text-[11px] font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0",
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
                          className="flex items-center gap-2 px-2 py-1 text-on-surface/20 hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-xs">add</span>
                          <span className="font-label text-[11px] uppercase tracking-widest">Add Project</span>
                        </Link>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── All Clients Section (ADMIN + EMPLOYEE) ────────────────────── */}
        {!collapsed && allClients.length > 0 && (
          <div className="px-2 py-2 border-t border-on-surface/10">
            <div className="flex items-center justify-between px-3 py-1.5 mb-1">
              <span className="font-label text-[11px] uppercase tracking-[0.2em] text-on-surface/40">All Clients</span>
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
                        "w-full flex items-center gap-2 px-3 py-1.5 text-left transition-colors group",
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
                        <span className="text-[11px] font-mono text-on-surface/30 flex-shrink-0">
                          {totalTasks}
                        </span>
                      )}
                    </button>

                    {/* Nested Projects */}
                    {isExpanded && (
                      <div className="ml-5 border-l border-on-surface/10 pl-2 space-y-0.5 py-0.5">
                        {brand.projects.length === 0 && (
                          <span className="px-2 py-1 font-mono text-[10px] text-on-surface/20 uppercase">No projects</span>
                        )}
                        {brand.projects.map((project) => {
                          const isProjectActive = pathname === `/projects/${project.id}`;
                          return (
                            <Link
                              key={project.id}
                              href={`/projects/${project.id}`}
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
                                  "text-[11px] font-mono px-1.5 py-0.5 rounded-sm flex-shrink-0",
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
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
                <p className="truncate text-[11px] font-label text-outline uppercase tracking-widest">
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
