import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";
import { FilesLibraryClient } from "@/components/files/files-library-client";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = session.user.role as Role;
  const isSuperAdmin = role === "SUPER_ADMIN";

  // Build role-based file scoping:
  // SUPER_ADMIN: all files | ADMIN: managed projects, POC clients, own uploads | EMPLOYEE: own files
  const fileScope = isSuperAdmin
    ? {}
    : role === "ADMIN"
      ? {
          OR: [
            { uploadedById: session.user.id },
            { project: { assignedManagerId: session.user.id } },
            { client: { pocAdminId: session.user.id } },
          ],
        }
      : {
          OR: [
            { uploadedById: session.user.id },
            { task: { assignedToId: session.user.id } },
          ],
        };

  // Fetch files (root files only — no version children)
  const files = await db.file.findMany({
    where: {
      AND: [
        fileScope,
        { parentFileId: null }, // only root files
      ],
    },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true, brandColor: true } },
      project: { select: { title: true } },
      task: { select: { title: true } },
      versions: {
        select: { id: true, version: true },
        orderBy: { version: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalSize = files.reduce((sum, f) => sum + f.fileSize, 0);

  // Fetch clients and projects for upload association
  const clients = await db.client.findMany({
    where: isSuperAdmin
      ? {}
      : role === "ADMIN"
        ? { OR: [{ pocAdminId: session.user.id }, { projects: { some: { assignedManagerId: session.user.id } } }] }
        : { pocAdminId: session.user.id },
    select: { id: true, companyName: true },
    orderBy: { companyName: "asc" },
  });

  const projects = await db.project.findMany({
    where: isSuperAdmin
      ? {}
      : {
          OR: [
            { createdById: session.user.id },
            { assignedManagerId: session.user.id },
          ],
        },
    select: { id: true, title: true, clientId: true },
    orderBy: { title: "asc" },
  });

  return (
    <FilesLibraryClient
      initialFiles={JSON.parse(JSON.stringify(files))}
      clients={clients}
      projects={projects}
      totalSize={totalSize}
      uploaderName={session.user.name || "Unknown"}
      userId={session.user.id}
    />
  );
}
