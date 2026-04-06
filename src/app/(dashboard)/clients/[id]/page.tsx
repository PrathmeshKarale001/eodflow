import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BrandAssetsManager } from "@/components/clients/brand-assets-manager";
import { auth } from "@/lib/auth";

export default async function ClientDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return notFound();
  }

  const client = await db.client.findUnique({
    where: { id },
    include: {
      pocAdmin: true,
      files: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return notFound();
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Container */}
      <div className="brutalist-border bg-card p-6 relative overflow-hidden">
        {/* Decorative scanline */}
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-headline tracking-tighter uppercase mb-2">
              {client.companyName}
            </h1>
            <div className="flex items-center gap-4 text-xs font-mono tracking-widest uppercase text-muted-foreground">
              <span>CLIENT_ID // {client.id.slice(-8)}</span>
              <span>•</span>
              <span>POC_ADMIN // {client.pocAdmin.name}</span>
            </div>
          </div>
          <div className="mono-clip bg-primary text-primary-foreground px-6 py-3 font-headline uppercase text-sm font-bold shadow-[4px_4px_0px_#180065] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            WORKSPACE_ACTIVE
          </div>
        </div>
      </div>

      <div className="data-grid gap-6">
        {/* Left Column: Brand Assets */}
        <div className="col-span-12 lg:col-span-8">
          <div className="brutalist-border bg-card h-full p-6">
            <h2 className="text-xl font-headline uppercase tracking-tight mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">palette</span>
              BRAND_ASSETS
            </h2>
            
            <BrandAssetsManager 
              clientId={client.id} 
              initialFiles={client.files} 
              userId={userId}
            />
          </div>
        </div>

        {/* Right Column: Meta Info / Identity */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="brutalist-border bg-card-muted p-6 h-full border-l-8" style={{ borderLeftColor: client.brandColor || "#6C5CE7" }}>
             <h3 className="font-headline uppercase text-sm mb-4 tracking-widest text-card-text">
               BRAND_IDENTITY
             </h3>
             <ul className="space-y-4 font-mono text-xs uppercase text-muted-foreground">
               <li>
                 <span className="block text-card-text font-bold mb-1">INDUSTRY</span>
                 {client.industry || "N/A"}
               </li>
               <li>
                 <span className="block text-card-text font-bold mb-1">BRAND_COLOR</span>
                 <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border border-black" style={{ backgroundColor: client.brandColor || "#6C5CE7" }}></div>
                    {client.brandColor || "#6C5CE7"}
                 </div>
               </li>
               <li>
                 <span className="block text-card-text font-bold mb-1">WEBSITE</span>
                 {client.website ? (
                   <a href={client.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary underline underline-offset-4 decoration-primary decoration-2">
                     {client.website}
                   </a>
                 ) : "N/A"}
               </li>
             </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
