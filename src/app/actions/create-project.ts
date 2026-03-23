"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { Priority, ProjectStatus } from "@prisma/client";

export async function createProjectRecord(data: {
  title: string;
  clientId: string;
  createdById: string;
  assignedManagerId?: string;
  priority: Priority;
  deadline?: Date;
  briefObjective?: string;
  briefDeliverables?: string;
}) {
  const project = await db.project.create({
    data: {
      ...data,
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
  await db.file.create({
    data,
  });
}
