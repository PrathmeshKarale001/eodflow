import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNavForRole } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SearchDialog } from "@/components/search/search-dialog";
import type { Role } from "@prisma/client";

// auth() uses headers() — must be dynamic, cannot be statically rendered
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await auth();
    console.log("[DASHBOARD_LAYOUT] auth() result:", JSON.stringify(session?.user?.email ?? "NO_SESSION"));
  } catch (error) {
    console.error("[DASHBOARD_LAYOUT] auth() CRASHED:", error);
    redirect("/login");
  }

  if (!session?.user) {
    console.log("[DASHBOARD_LAYOUT] No session user, redirecting to login");
    redirect("/login");
  }

  const navItems = getNavForRole(session.user.role as Role);

  return (
    <div className="flex flex-col md:flex-row h-screen bg-background overflow-hidden">
      {/* Mobile Header */}
      <DashboardHeader
        user={{
          id: session.user.id ?? "",
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          image: session.user.image ?? undefined,
          role: session.user.role as Role,
        }}
        navItems={navItems}
      />

      {/* Desktop Sidebar */}
      <Sidebar
        user={{
          id: session.user.id ?? "",
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          image: session.user.image ?? undefined,
          role: session.user.role as Role,
        }}
        navItems={navItems}
      />

      {/* Main content */}
      <main className="flex-1 overflow-auto min-h-0 flex flex-col">
        <div className="w-full px-4 py-4 md:px-6 md:py-6 flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </main>

      {/* Global Search */}
      <SearchDialog />
    </div>
  );
}
