import { db } from "@/lib/db";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

export default async function NewProjectPage() {
  const session = await auth();
  if (!session?.user?.id) return notFound();

  // Fetch data for dropdowns
  const [clients, managers] = await Promise.all([
    db.client.findMany({
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" }
    }),
    db.user.findMany({
      where: { role: Role.MANAGER, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="brutalist-border bg-white p-6 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-headline tracking-tighter uppercase mb-2">
              INIT_NEW_PROJECT
            </h1>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              ESTABLISH WORKSPACE PARAMETERS & BRIEF DATA
            </p>
          </div>
          <span className="material-symbols-outlined text-[40px] text-primary">add_box</span>
        </div>
      </div>

      <div className="brutalist-border bg-white p-6 md:p-8">
        <CreateProjectForm 
          clients={clients} 
          managers={managers} 
          creatorId={session.user.id} 
        />
      </div>
    </div>
  );
}
