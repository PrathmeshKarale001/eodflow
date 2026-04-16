// =============================================================================
// EOD FLOW — Role-Based Access Control (RBAC)
// Single source of truth for all permissions in the system
//
// Roles:
//   SUPER_ADMIN = Director     (full control)
//   ADMIN       = POC          (point of contact — client-facing lead)
//   EMPLOYEE    = Employee     (normal team member)
// =============================================================================

import { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Role display labels (used app-wide)
// ---------------------------------------------------------------------------

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "DIRECTOR",
  ADMIN: "POC",
  EMPLOYEE: "EMPLOYEE",
};

export const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: "bg-error/20 text-error",
  ADMIN: "bg-primary/20 text-primary",
  EMPLOYEE: "bg-outline/20 text-outline",
};

// ---------------------------------------------------------------------------
// Permission definitions
// SUPER_ADMIN inherits all ADMIN permissions + more
// ADMIN inherits all EMPLOYEE permissions + more
// ---------------------------------------------------------------------------

export const PERMISSIONS = {
  // Client management
  viewAllClients: [Role.SUPER_ADMIN],
  viewOwnClients: [Role.SUPER_ADMIN, Role.ADMIN],
  createClient: [Role.SUPER_ADMIN],
  editClient: [Role.SUPER_ADMIN, Role.ADMIN],
  deleteClient: [Role.SUPER_ADMIN, Role.ADMIN],

  // Project management
  createProject: [Role.SUPER_ADMIN, Role.ADMIN],
  editProject: [Role.SUPER_ADMIN, Role.ADMIN],
  deleteProject: [Role.SUPER_ADMIN, Role.ADMIN],
  assignProjectManager: [Role.SUPER_ADMIN, Role.ADMIN],
  viewAllProjects: [Role.SUPER_ADMIN],

  // Task management
  createTask: [Role.SUPER_ADMIN, Role.ADMIN],
  editAnyTask: [Role.SUPER_ADMIN, Role.ADMIN],
  editOwnTask: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  deleteTask: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  assignTask: [Role.SUPER_ADMIN, Role.ADMIN],
  moveOwnTask: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],

  // Review & approval
  reviewTask: [Role.SUPER_ADMIN, Role.ADMIN],
  approveForClient: [Role.SUPER_ADMIN, Role.ADMIN],
  requestRevision: [Role.SUPER_ADMIN, Role.ADMIN],

  // File management
  uploadFiles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  deleteFiles: [Role.SUPER_ADMIN, Role.ADMIN],
  manageBrandAssets: [Role.SUPER_ADMIN, Role.ADMIN],

  // Comments
  addComment: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  deleteAnyComment: [Role.SUPER_ADMIN],
  deleteOwnComment: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],

  // Time tracking
  logTime: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  viewTeamTime: [Role.SUPER_ADMIN, Role.ADMIN],
  viewAllTime: [Role.SUPER_ADMIN],

  // Workload & analytics
  viewTeamWorkload: [Role.SUPER_ADMIN, Role.ADMIN],
  viewAgencyDashboard: [Role.SUPER_ADMIN],
  viewClientReports: [Role.SUPER_ADMIN, Role.ADMIN],
  exportReports: [Role.SUPER_ADMIN],

  // Channel management
  createChannel: [Role.SUPER_ADMIN, Role.ADMIN],
  deleteChannel: [Role.SUPER_ADMIN, Role.ADMIN],
  manageChannelMembers: [Role.SUPER_ADMIN, Role.ADMIN],

  // System admin
  manageUsers: [Role.SUPER_ADMIN, Role.ADMIN],
  inviteUsers: [Role.SUPER_ADMIN, Role.ADMIN],
  manageRoles: [Role.SUPER_ADMIN],
  manageSettings: [Role.SUPER_ADMIN],
  viewAuditLog: [Role.SUPER_ADMIN],
  manageTemplates: [Role.SUPER_ADMIN, Role.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ---------------------------------------------------------------------------
// Permission checker
// ---------------------------------------------------------------------------

export function hasPermission(userRole: Role, permission: Permission): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return (allowedRoles as readonly Role[]).includes(userRole);
}

export function hasAnyPermission(
  userRole: Role,
  permissions: Permission[]
): boolean {
  return permissions.some((p) => hasPermission(userRole, p));
}

export function hasAllPermissions(
  userRole: Role,
  permissions: Permission[]
): boolean {
  return permissions.every((p) => hasPermission(userRole, p));
}

// ---------------------------------------------------------------------------
// Role hierarchy (for "at least this role" checks)
// ---------------------------------------------------------------------------

const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 3,
  ADMIN: 2,
  EMPLOYEE: 1,
};

export function isAtLeast(userRole: Role, minimumRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

// ---------------------------------------------------------------------------
// Route access map (for middleware)
// ---------------------------------------------------------------------------

export const ROUTE_ACCESS: Record<string, Role[]> = {
  "/onboarding": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/overview": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/clients": [Role.SUPER_ADMIN, Role.ADMIN],
  "/projects": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/tasks": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/files": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/chat": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/time": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/calendar": [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE],
  "/reports": [Role.SUPER_ADMIN, Role.ADMIN],
  "/settings": [Role.SUPER_ADMIN, Role.ADMIN],
};

// ---------------------------------------------------------------------------
// Sidebar navigation (role-filtered)
// ---------------------------------------------------------------------------

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  roles: Role[];
  badge?: string;
}

export const SIDEBAR_NAV: NavItem[] = [
  { label: "Overview", href: "/overview", icon: "LayoutDashboard", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "My tasks", href: "/tasks", icon: "CheckSquare", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Calendar", href: "/calendar", icon: "CalendarDays", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Time Tracker", href: "/time", icon: "Timer", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Projects", href: "/projects", icon: "FolderKanban", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Clients", href: "/clients", icon: "Building2", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Files", href: "/files", icon: "FileStack", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Chat", href: "/chat", icon: "MessageSquare", roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.EMPLOYEE] },
  { label: "Reports", href: "/reports", icon: "BarChart3", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
  { label: "Team", href: "/settings", icon: "Users", roles: [Role.SUPER_ADMIN, Role.ADMIN] },
];

export function getNavForRole(role: Role): NavItem[] {
  return SIDEBAR_NAV.filter((item) => item.roles.includes(role));
}
