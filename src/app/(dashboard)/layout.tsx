import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNavForRole } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar/sidebar";
import { SearchDialog } from "@/components/search/search-dialog";
import type { Role } from "@prisma/client";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const navItems = getNavForRole(session.user.role as Role);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
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
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Global Search */}
      <SearchDialog />
    </div>
  );
}
