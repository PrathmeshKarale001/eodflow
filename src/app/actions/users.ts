"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role, Department } from "@prisma/client";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Invite User (Super Admin only)
// ---------------------------------------------------------------------------

export async function inviteUser(data: {
  email: string;
  name: string;
  role: Role;
  department?: Department;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "inviteUsers")) {
    throw new Error("FORBIDDEN: Only Super Admins can invite users.");
  }

  // Check if user already exists
  const existing = await db.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    throw new Error("USER_EXISTS: A user with this email already exists.");
  }

  // Generate a random invite token (would be used in email link in production)
  const inviteToken = randomBytes(32).toString("hex");

  // Create the user with a temporary placeholder password hash
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      department: data.department,
      isActive: true,
      // In production, this would be null and set during onboarding
      passwordHash: `INVITE:${inviteToken}`,
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "CREATED",
      metadata: { invitedEmail: data.email, invitedRole: data.role },
    },
  });

  revalidatePath("/settings");
  return { userId: user.id, inviteToken };
}

// ---------------------------------------------------------------------------
// List Users (Admin+)
// ---------------------------------------------------------------------------

export async function listUsers() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers") && !hasPermission(role, "editAnyTask")) {
    throw new Error("FORBIDDEN");
  }

  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Deactivate User
// ---------------------------------------------------------------------------

export async function deactivateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers")) {
    throw new Error("FORBIDDEN");
  }

  // Cannot deactivate yourself
  if (userId === session.user.id) {
    throw new Error("CANNOT_DEACTIVATE_SELF");
  }

  const updated = await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  revalidatePath("/settings");
  return updated;
}
