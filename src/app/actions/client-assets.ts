"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function createBrandAssetRecord(data: {
  clientId: string;
  uploadedById: string;
  filename: string;
  originalName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
}) {
  const file = await db.file.create({
    data,
  });

  revalidatePath(`/clients/${data.clientId}`);
  return file;
}
