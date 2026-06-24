import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import Link from "next/link";
import { ClientsGridClient } from "@/components/clients/clients-grid-client";

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const canViewAll = hasPermission(role, "viewAllClients");
  const canViewOwn = hasPermission(role, "viewOwnClients");

  if (!canViewAll && !canViewOwn) redirect("/overview");

  const clients = await db.client.findMany({
    where: canViewAll ? {} : { pocAdminId: session.user.id },
    include: {
      pocAdmin: { select: { name: true } },
      projects: { select: { id: true, status: true } },
      _count: { select: { projects: true, files: true } },
    },
    orderBy: { companyName: "asc" },
  });

  // Transform for client component
  const clientCards = clients.map((client) => ({
    id: client.id,
    companyName: client.companyName,
    industry: client.industry,
    brandColor: client.brandColor,
    pocAdminName: client.pocAdmin?.name ?? null,
    activeProjects: client.projects.filter((p) => p.status === "ACTIVE").length,
    totalProjects: client._count.projects,
    fileCount: client._count.files,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-foreground leading-none">
            Client Workspaces
          </h1>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-1.5">
            {clients.length} ACTIVE_ACCOUNTS
          </p>
        </div>
        {hasPermission(role, "createClient") && (
          <Link
            href="/clients/new"
            className="rounded-lg bg-primary-container text-white px-5 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Client
          </Link>
        )}
      </div>

      <ClientsGridClient clients={clientCards} />
    </div>
  );
}
