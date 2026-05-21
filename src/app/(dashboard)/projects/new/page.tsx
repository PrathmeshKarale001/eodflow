import { db } from "@/lib/db";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const { clientId: preselectedClientId } = await searchParams;

  // Fetch data for dropdowns
  const [clients, managers] = await Promise.all([
    db.client.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" }
    }),
    db.user.findMany({
      where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] }, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);

  // Resolve the pre-selected client name for display
  const preselectedClient = preselectedClientId
    ? clients.find((c) => c.id === preselectedClientId)
    : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Header */}
      <div className="brutalist-border bg-card p-5 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-headline tracking-tighter uppercase mb-1">
              {preselectedClient
                ? `NEW PROJECT — ${preselectedClient.companyName}`
                : "INIT_NEW_PROJECT"}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              ESTABLISH WORKSPACE PARAMETERS & BRIEF DATA
            </p>
          </div>
          <span className="material-symbols-outlined text-[36px] text-primary">add_box</span>
        </div>
      </div>

      {/* Form */}
      <div className="brutalist-border bg-card p-5 md:p-6">
        <CreateProjectForm
          clients={clients}
          managers={managers}
          preselectedClientId={preselectedClientId}
        />
      </div>
    </div>
  );
}
