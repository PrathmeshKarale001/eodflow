import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getNavForRole } from "@/lib/permissions";
import { Sidebar } from "@/components/sidebar/sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { SearchDialog } from "@/components/search/search-dialog";
import { MainContentContainer } from "@/components/layout/main-content-container";
import { ChatProvider } from "@/components/chat/chat-provider";
import { ChatToastContainer } from "@/components/chat/chat-toast";
import { RealtimeSync } from "@/components/realtime-sync";
import { PushNotificationPrompt } from "@/components/push-notification-prompt";
import { getUserChannels } from "@/app/actions/chat";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

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
  const userRole = session.user.role as Role;
  const userId = session.user.id;

  // Fetch Brand → Project hierarchy for sidebar tree + chat channels in parallel
  // ADMIN: Only show brands where they are POC or manage a project
  const brandWhereClause = userRole === "ADMIN"
    ? {
        isActive: true,
        OR: [
          { pocAdminId: userId },
          { projects: { some: { assignedManagerId: userId } } },
        ],
      }
    : { isActive: true };

  const projectWhereClause = userRole === "ADMIN"
    ? { status: { not: "ARCHIVED" as const }, assignedManagerId: userId }
    : { status: { not: "ARCHIVED" as const } };

  const [brands, channels] = await Promise.all([
    db.client.findMany({
      where: brandWhereClause,
      select: {
        id: true,
        companyName: true,
        brandColor: true,
        projects: {
          where: projectWhereClause,
          select: {
            id: true,
            title: true,
            status: true,
            _count: { select: { tasks: true } },
          },
          orderBy: { title: "asc" },
        },
      },
      orderBy: { companyName: "asc" },
    }),
    getUserChannels(),
  ]);

  const channelList = (channels as { id: string; name: string | null; type: string }[]).map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
  }));

  return (
    <ChatProvider channels={channelList} currentUserId={session.user.id}>
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
          brands={brands}
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
          brands={brands}
        />

        {/* Main content with conditional scroll/padding */}
        <MainContentContainer>
          {children}
        </MainContentContainer>

        {/* Global realtime sync — auto-refresh all pages on task events */}
        <RealtimeSync />

        {/* Global Search */}
        <SearchDialog />
      </div>

      {/* Global chat toast notifications — visible on all dashboard pages */}
      <ChatToastContainer />

      {/* Push notification opt-in prompt */}
      <PushNotificationPrompt />
    </ChatProvider>
  );
}

