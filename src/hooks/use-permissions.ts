// =============================================================================
// usePermissions — React hook for checking RBAC in components
// Usage: const { can, role, isAtLeast } = usePermissions()
// =============================================================================

"use client";

import { useSession } from "@/lib/auth-client";
import {
  hasPermission,
  isAtLeast as checkIsAtLeast,
  type Permission,
} from "@/lib/permissions";
import type { Role } from "@prisma/client";

export function usePermissions() {
  const { data: session } = useSession();
  const role = ((session?.user as any)?.role ?? "EMPLOYEE") as Role;

  return {
    role,
    user: session?.user,
    isAuthenticated: !!session?.user,

    /** Check if current user has a specific permission */
    can: (permission: Permission) => hasPermission(role, permission),

    /** Check if current user's role is at least the given minimum */
    isAtLeast: (minimumRole: Role) => checkIsAtLeast(role, minimumRole),

    /** Check if current user has the exact role */
    isRole: (checkRole: Role) => role === checkRole,

    /** Quick role checks */
    isSuperAdmin: role === "SUPER_ADMIN",
    isAdmin: role === "ADMIN",
    isManager: role === "MANAGER",
    isEmployee: role === "EMPLOYEE",
  };
}
