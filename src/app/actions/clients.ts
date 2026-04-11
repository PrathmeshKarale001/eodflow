"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import type { Role } from "@prisma/client";

export async function createClient(data: {
  companyName: string;
  industry?: string;
  brandColor?: string;
  website?: string;
  retainerValue?: number;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "createClient")) {
    throw new Error("You don't have permission to create clients.");
  }

  const client = await db.client.create({
    data: {
      companyName: data.companyName,
      industry: data.industry || null,
      brandColor: data.brandColor || "#6C5CE7",
      website: data.website || null,
      retainerValue: data.retainerValue || null,
      pocAdminId: session.user.id,
    },
  });

  revalidatePath("/clients");
  return client;
}
