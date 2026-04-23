"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Get Team Members (for @mention autocomplete)
// ---------------------------------------------------------------------------

export async function getTeamMembers(search?: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const users = await db.user.findMany({
    where: {
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { email: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      department: true,
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return users;
}
