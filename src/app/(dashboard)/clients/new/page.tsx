import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";
import { CreateClientForm } from "@/components/clients/create-client-form";

export default async function NewClientPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  const role = session.user.role as Role;
  if (!hasPermission(role, "createClient")) return notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="brutalist-border bg-card p-4 md:p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-5xl font-headline tracking-tighter uppercase mb-2">
              New Client
            </h1>
            <p className="font-mono text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground">
              REGISTER A NEW CLIENT WORKSPACE
            </p>
          </div>
          <span className="material-symbols-outlined text-[28px] md:text-[40px] text-primary flex-shrink-0">domain_add</span>
        </div>
      </div>

      <div className="brutalist-border bg-card p-6 md:p-8">
        <CreateClientForm />
      </div>
    </div>
  );
}
