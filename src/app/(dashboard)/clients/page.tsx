import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import Link from "next/link";

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl md:text-3xl font-extrabold uppercase tracking-tight text-foreground leading-none">
            Client_Workspaces
          </h1>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-1.5">
            {clients.length} ACTIVE_ACCOUNTS
          </p>
        </div>
        {hasPermission(role, "createClient") && (
          <Link
            href="/clients/new"
            className="mono-clip bg-primary-container text-white px-5 py-3 font-headline text-xs uppercase hover:brightness-110 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            NEW_CLIENT
          </Link>
        )}
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const activeProjects = client.projects.filter(p => p.status === "ACTIVE").length;
          const totalProjects = client._count.projects;

          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="brutalist-border bg-surface-container-lowest p-5 hover:bg-surface-container-low transition-colors group block"
            >
              {/* Brand Color Bar */}
              <div
                className="h-1 w-full mb-4"
                style={{ backgroundColor: client.brandColor || "#6c5ce7" }}
              />

              {/* Client Name */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-headline text-sm font-bold uppercase tracking-tight text-foreground group-hover:text-primary transition-colors">
                    {client.companyName}
                  </h3>
                  {client.industry && (
                    <p className="font-label text-[9px] text-outline uppercase tracking-widest mt-0.5">
                      {client.industry}
                    </p>
                  )}
                </div>
                <div
                  className="w-3 h-3 flex-shrink-0 mt-1"
                  style={{ backgroundColor: client.brandColor || "#6c5ce7" }}
                  title={client.brandColor || ""}
                />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="brutalist-border p-2 text-center">
                  <span className="font-headline text-lg font-bold text-foreground block">{activeProjects}</span>
                  <span className="font-label text-[8px] text-outline uppercase tracking-widest">ACTIVE</span>
                </div>
                <div className="brutalist-border p-2 text-center">
                  <span className="font-headline text-lg font-bold text-foreground block">{totalProjects}</span>
                  <span className="font-label text-[8px] text-outline uppercase tracking-widest">TOTAL</span>
                </div>
                <div className="brutalist-border p-2 text-center">
                  <span className="font-headline text-lg font-bold text-foreground block">{client._count.files}</span>
                  <span className="font-label text-[8px] text-outline uppercase tracking-widest">FILES</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-on-surface/10 pt-3">
                <span className="font-label text-[9px] text-outline uppercase tracking-widest">
                  POC: {client.pocAdmin?.name ?? "UNASSIGNED"}
                </span>
                <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors">
                  arrow_forward
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {clients.length === 0 && (
        <div className="brutalist-border p-12 text-center">
          <span className="material-symbols-outlined text-3xl text-outline mb-3 block">domain_disabled</span>
          <p className="font-label text-[10px] text-outline uppercase tracking-widest">NO_CLIENTS_FOUND</p>
        </div>
      )}
    </div>
  );
}
