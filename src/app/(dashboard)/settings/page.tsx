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
      <div>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-tight text-foreground">
          System_Settings
        </h1>
        <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-1">
          USER_MANAGEMENT — {users.length} ACCOUNTS
        </p>
      </div>

      <UserManagementPanel initialUsers={users} currentUserId={session.user.id!} currentUserRole={role} />

    </div>
  );
}
