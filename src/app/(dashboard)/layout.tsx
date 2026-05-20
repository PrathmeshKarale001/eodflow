import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNavForRole } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SearchDialog } from "@/components/search/search-dialog";
import { MainContentContainer } from "@/components/layout/main-content-container";
import type { Role } from "@prisma/client";

// auth() uses headers() — will automatically make routes dynamic at request time
// but removing the explicit flag allows for better optimization granularly

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

      {/* Main content with conditional scroll/padding */}
      <MainContentContainer>
        {children}
      </MainContentContainer>

      {/* Global Search */}
      <SearchDialog />
    </div>
  );
}
