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
      pocAdminId: session.user.id,
    },
  });

  revalidatePath("/clients");
  return client;
}

export async function updateClient(
  clientId: string,
  data: {
    companyName: string;
    industry?: string;
    brandColor?: string;
    website?: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "editClient")) {
    throw new Error("You don't have permission to edit clients.");
  }

  const client = await db.client.update({
    where: { id: clientId },
    data: {
      companyName: data.companyName,
      industry: data.industry || null,
      brandColor: data.brandColor || "#6C5CE7",
      website: data.website || null,
    },
  });

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
  return client;
}

export async function deleteClient(clientId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const role = session.user.role as Role;
  if (!hasPermission(role, "deleteClient")) {
    throw new Error("You don't have permission to delete clients.");
  }

  await db.client.delete({ where: { id: clientId } });

  revalidatePath("/clients");
}
