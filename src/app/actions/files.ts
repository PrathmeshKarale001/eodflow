"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { deleteStorageFile } from "@/lib/storage";

// ---------------------------------------------------------------------------
// Upload File Record (after client-side upload to Supabase Storage)
// ---------------------------------------------------------------------------

export async function uploadFileRecord(data: {
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  clientId?: string;
  projectId?: string;
  taskId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const file = await db.file.create({
    data: {
      uploadedById: session.user.id,
      filename: data.filename,
      originalName: data.originalName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      clientId: data.clientId || null,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      version: 1,
    },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true, brandColor: true } },
      project: { select: { title: true } },
      task: { select: { title: true } },
    },
  });

  // Activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      projectId: data.projectId || null,
      taskId: data.taskId || null,
      action: "FILE_UPLOADED",
      metadata: { fileId: file.id, filename: data.originalName },
    },
  });

  revalidatePath("/files");
  if (data.projectId) revalidatePath(`/projects/${data.projectId}`);
  if (data.clientId) revalidatePath(`/clients/${data.clientId}`);

  return file;
}

// ---------------------------------------------------------------------------
// Upload New Version (creates a new File record linked to parent)
// ---------------------------------------------------------------------------

export async function uploadNewVersion(data: {
  parentFileId: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Get parent file to inherit client/project/task associations
  const parentFile = await db.file.findUnique({
    where: { id: data.parentFileId },
    select: {
      id: true,
      clientId: true,
      projectId: true,
      taskId: true,
      version: true,
      parentFileId: true,
    },
  });

  if (!parentFile) throw new Error("Parent file not found");

  // Get the root file (the original)
  const rootId = parentFile.parentFileId || parentFile.id;

  // Count existing versions to determine next version number
  const existingVersions = await db.file.count({
    where: {
      OR: [{ id: rootId }, { parentFileId: rootId }],
    },
  });

  const newFile = await db.file.create({
    data: {
      uploadedById: session.user.id,
      filename: data.filename,
      originalName: data.originalName,
      fileUrl: data.fileUrl,
      mimeType: data.mimeType,
      fileSize: data.fileSize,
      clientId: parentFile.clientId,
      projectId: parentFile.projectId,
      taskId: parentFile.taskId,
      version: existingVersions + 1,
      parentFileId: rootId,
    },
    include: {
      uploadedBy: { select: { name: true } },
      client: { select: { companyName: true, brandColor: true } },
      project: { select: { title: true } },
      task: { select: { title: true } },
    },
  });

  // Activity log
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      projectId: parentFile.projectId,
      taskId: parentFile.taskId,
      action: "FILE_VERSIONED",
      metadata: {
        fileId: newFile.id,
        parentFileId: rootId,
        version: existingVersions + 1,
        filename: data.originalName,
      },
    },
  });

  revalidatePath("/files");
  return newFile;
}

// ---------------------------------------------------------------------------
// Delete File (removes from DB + Supabase Storage)
// ---------------------------------------------------------------------------

export async function deleteFile(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      uploadedById: true,
      fileUrl: true,
      filename: true,
      clientId: true,
      projectId: true,
    },
  });

  if (!file) throw new Error("File not found");

  // Only owner or admins can delete
  const isOwner = file.uploadedById === session.user.id;
  if (!isOwner && !hasPermission(userRole, "deleteFiles")) {
    throw new Error("FORBIDDEN: Cannot delete this file");
  }

  // Try to delete from storage (extract path from URL)
  try {
    const urlObj = new URL(file.fileUrl);
    const pathParts = urlObj.pathname.split("/storage/v1/object/public/");
    if (pathParts[1]) {
      const [bucket, ...rest] = pathParts[1].split("/");
      await deleteStorageFile(rest.join("/"), bucket);
    }
  } catch (e) {
    console.warn("Storage delete failed (file may already be removed):", e);
  }

  // Delete DB record (cascade will handle child versions if this is a root)
  await db.file.delete({ where: { id: fileId } });

  revalidatePath("/files");
  if (file.projectId) revalidatePath(`/projects/${file.projectId}`);
  if (file.clientId) revalidatePath(`/clients/${file.clientId}`);

  return { success: true };
}

// ---------------------------------------------------------------------------
// Get File Versions (all versions of a root file)
// ---------------------------------------------------------------------------

export async function getFileVersions(fileId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  // Determine the root file
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, parentFileId: true },
  });

  if (!file) throw new Error("File not found");

  const rootId = file.parentFileId || file.id;

  const versions = await db.file.findMany({
    where: {
      OR: [{ id: rootId }, { parentFileId: rootId }],
    },
    include: {
      uploadedBy: { select: { name: true } },
    },
    orderBy: { version: "desc" },
  });

  return versions;
}

// ---------------------------------------------------------------------------
// Get Files with Filters
// ---------------------------------------------------------------------------

export async function getFilteredFiles(filters: {
  search?: string;
  type?: "image" | "video" | "document" | "all";
  clientId?: string;
  projectId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  const canViewAll = hasPermission(userRole, "viewAllClients");

  const mimeFilter =
    filters.type === "image"
      ? { mimeType: { contains: "image" } }
      : filters.type === "video"
        ? { mimeType: { contains: "video" } }
        : filters.type === "document"
          ? {
              OR: [
                { mimeType: { contains: "pdf" } },
                { mimeType: { contains: "document" } },
                { mimeType: { contains: "word" } },
                { mimeType: { contains: "spreadsheet" } },
              ],
            }
          : {};

  const files = await db.file.findMany({
    where: {
      AND: [
        // RBAC filter
        canViewAll
          ? {}
          : {
              OR: [
                { uploadedById: session.user.id },
                { task: { assignedToId: session.user.id } },
                { client: { pocAdminId: session.user.id } },
              ],
            },
        // Search
        filters.search
          ? {
              OR: [
                { originalName: { contains: filters.search, mode: "insensitive" as const } },
                { filename: { contains: filters.search, mode: "insensitive" as const } },
              ],
            }
          : {},
        // Type filter
        mimeFilter,
        // Client filter
        filters.clientId ? { clientId: filters.clientId } : {},
        // Project filter
        filters.projectId ? { projectId: filters.projectId } : {},
        // Only show root files or standalone files (not version children)
        { parentFileId: null },
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

  return files;
}
