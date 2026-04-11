"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role, Department } from "@prisma/client";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Shared helper — generates a readable temp password & its bcrypt hash
// Format: EOD-XXXX-XXXX  (easy to read over WhatsApp/message)
// ---------------------------------------------------------------------------

async function genTempPassword() {
  const part1 = randomBytes(2).toString("hex").toUpperCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  const tempPassword = `EOD-${part1}-${part2}`;
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(tempPassword, 12);
  return { tempPassword, passwordHash };
}

// ---------------------------------------------------------------------------
// Invite User (SUPER_ADMIN only)
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
    throw new Error("FORBIDDEN: You do not have permission to invite users.");
  }

  // Admins can only invite EMPLOYEE/MANAGER — not other Admins or Super Admins
  if (userRole === Role.ADMIN && (data.role === Role.ADMIN || data.role === Role.SUPER_ADMIN)) {
    throw new Error("FORBIDDEN: Admins can only invite Employees and Managers.");
  }

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("USER_EXISTS: A user with this email already exists.");

  const { tempPassword, passwordHash } = await genTempPassword();

  // Better-Auth stores passwords in the Account model, not on User directly
  const user = await db.user.create({
    data: {
      email: data.email,
      name: data.name,
      role: data.role,
      department: data.department,
      isActive: true,
    },
  });

  // Create credential account (Better-Auth convention: providerId = "credential")
  await db.account.create({
    data: {
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: passwordHash,
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
  // Return temp password — admin shares it via WhatsApp/message
  return { userId: user.id, tempPassword };
}

// ---------------------------------------------------------------------------
// List Users (ADMIN+)
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
      lastLoginAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Deactivate User — disables login, keeps data
// ---------------------------------------------------------------------------

export async function deactivateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers")) throw new Error("FORBIDDEN");
  if (userId === session.user.id) throw new Error("CANNOT_DEACTIVATE_SELF");

  await db.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Reactivate User — re-enables login + generates a fresh temp password
// ---------------------------------------------------------------------------

export async function reactivateUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers")) throw new Error("FORBIDDEN");

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("USER_NOT_FOUND");

  const { tempPassword, passwordHash } = await genTempPassword();

  // Reactivate user
  await db.user.update({
    where: { id: userId },
    data: { isActive: true },
  });

  // Update or create credential account with new password
  const existingAccount = await db.account.findFirst({
    where: { userId, providerId: "credential" },
  });

  if (existingAccount) {
    await db.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await db.account.create({
      data: {
        userId,
        accountId: userId,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATED",
      metadata: { reactivatedUserId: userId, reactivatedEmail: target.email },
    },
  });

  revalidatePath("/settings");
  // Admin must share these credentials manually
  return { tempPassword, name: target.name, email: target.email };
}

// ---------------------------------------------------------------------------
// Delete User — permanent hard delete (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export async function deleteUser(userId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN") throw new Error("FORBIDDEN: Only Super Admins can delete users.");
  if (userId === session.user.id) throw new Error("CANNOT_DELETE_SELF");

  // Reassign activity logs to the current super admin to preserve audit trail
  await db.activityLog.updateMany({
    where: { userId },
    data: { userId: session.user.id },
  });

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/settings");
}
