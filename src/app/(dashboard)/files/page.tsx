import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const canViewAll = hasPermission(role, "viewAllClients");

  // Fetch files based on role
  const files = await db.file.findMany({
    where: canViewAll
      ? {}
      : {
          OR: [
            { uploadedById: session.user.id },
            { task: { assignedToId: session.user.id } },
            { client: { pocAdminId: session.user.id } },
          ],
        },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true, brandColor: true } },
      project: { select: { title: true } },
      task: { select: { title: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);
  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.includes("image")) return "image";
    if (mime.includes("video")) return "movie";
    if (mime.includes("pdf")) return "picture_as_pdf";
    if (mime.includes("document") || mime.includes("word")) return "description";
    if (mime.includes("spreadsheet") || mime.includes("excel")) return "table_chart";
    return "attach_file";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline text-2xl font-extrabold uppercase tracking-tight text-foreground">
            File_Library
          </h1>
          <p className="font-label text-[10px] uppercase tracking-widest text-outline mt-1">
            {files.length} FILES — {formatBytes(totalSize)} TOTAL
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "TOTAL", value: files.length, icon: "folder_open" },
          { label: "IMAGES", value: files.filter(f => f.mimeType.includes("image")).length, icon: "image" },
          { label: "DOCS", value: files.filter(f => f.mimeType.includes("pdf") || f.mimeType.includes("document")).length, icon: "description" },
          { label: "VIDEOS", value: files.filter(f => f.mimeType.includes("video")).length, icon: "movie" },
        ].map((stat) => (
          <div key={stat.label} className="brutalist-border bg-surface-container-lowest p-4">
            <span className="material-symbols-outlined text-sm text-primary mb-2 block">{stat.icon}</span>
            <span className="font-headline text-2xl font-bold text-foreground block">{stat.value}</span>
            <span className="font-label text-[8px] text-outline uppercase tracking-widest">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* File Table */}
      {files.length > 0 ? (
        <div className="brutalist-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low border-b border-white/10">
                <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">FILE</th>
                <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">CLIENT</th>
                <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">PROJECT</th>
                <th className="px-4 py-3 text-left font-label text-[9px] uppercase tracking-widest text-outline">UPLOADER</th>
                <th className="px-4 py-3 text-right font-label text-[9px] uppercase tracking-widest text-outline">SIZE</th>
                <th className="px-4 py-3 text-right font-label text-[9px] uppercase tracking-widest text-outline">DATE</th>
                <th className="px-4 py-3 text-center font-label text-[9px] uppercase tracking-widest text-outline">VER</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">
                        {getFileIcon(file.mimeType)}
                      </span>
                      <div className="min-w-0">
                        <a
                          href={file.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-label text-[11px] uppercase tracking-wide text-foreground hover:text-primary transition-colors block truncate max-w-[200px]"
                        >
                          {file.originalName}
                        </a>
                        <span className="font-label text-[8px] text-outline uppercase">{file.mimeType.split("/")[1]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {file.client ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2" style={{ backgroundColor: file.client.brandColor || "#6c5ce7" }} />
                        <span className="font-label text-[10px] text-foreground uppercase truncate max-w-[100px]">
                          {file.client.companyName}
                        </span>
                      </div>
                    ) : (
                      <span className="font-label text-[10px] text-outline">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-label text-[10px] text-outline uppercase truncate max-w-[120px] block">
                      {file.project?.title ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-label text-[10px] text-foreground uppercase">
                      {file.uploadedBy?.name ?? "SYSTEM"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-headline text-[10px] text-foreground">
                      {formatBytes(file.fileSize)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-label text-[10px] text-outline">
                      {new Date(file.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-headline text-[10px] text-outline">v{file.version}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="brutalist-border p-12 text-center">
          <span className="material-symbols-outlined text-3xl text-outline mb-3 block">folder_off</span>
          <p className="font-label text-[10px] text-outline uppercase tracking-widest">NO_FILES_FOUND</p>
        </div>
      )}
    </div>
  );
}
