"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Priority, ProjectStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export async function createProjectRecord(data: {
  title: string;
  clientId: string;
  assignedManagerId?: string;
  priority: Priority;
  deadline?: Date;
  briefObjective?: string;
  briefDeliverables?: string;
}) {
  // Always use server-side session — never trust client-passed IDs
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Verify the user actually exists in the DB (guards against stale sessions)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isActive: true },
  });

  if (!user || !user.isActive) {
    throw new Error("Your session is invalid. Please sign out and log back in.");
  }

  const project = await db.project.create({
    data: {
      ...data,
      createdById: user.id,
      status: ProjectStatus.DRAFT,
    },
  });

  revalidatePath("/projects");
  return project;
}

export async function createProjectFileRecord(data: {
  projectId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  await db.file.create({
    data: {
      ...data,
      uploadedById: session.user.id, // Always use session user, never trust client
    },
  });
}
