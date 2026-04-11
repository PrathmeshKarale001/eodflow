import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { UserManagementPanel } from "@/components/settings/user-management-panel";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "manageUsers")) {
    redirect("/overview");
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-headline tracking-tighter uppercase mb-1 text-card-text">
              TEAM_SETTINGS
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-on-surface/50">
              USER_MANAGEMENT — {users.length} ACCOUNTS
            </p>
          </div>
          <span className="material-symbols-outlined text-[36px] text-primary">admin_panel_settings</span>
        </div>
      </div>

      <UserManagementPanel initialUsers={users} currentUserId={session.user.id!} currentUserRole={role} />

    </div>
  );
}
