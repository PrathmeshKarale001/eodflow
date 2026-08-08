"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role, Department } from "@prisma/client";
import { randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Shared helper — generates a readable temp password & its scrypt hash
// Uses Better Auth's own hashPassword to ensure login compatibility
// Format: EOD-XXXX-XXXX  (easy to read over WhatsApp/message)
// ---------------------------------------------------------------------------

import { hashPassword } from "better-auth/crypto";

async function genTempPassword() {
  const part1 = randomBytes(2).toString("hex").toUpperCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  const tempPassword = `EOD-${part1}-${part2}`;
  const passwordHash = await hashPassword(tempPassword);
  return { tempPassword, passwordHash };
}

// ---------------------------------------------------------------------------
// Invite User — REMOVED
// Registration is now handled by the invitation system (see invitations.ts).
// Use createInviteLink() for individual invites or createInviteCode() for batch.
// ---------------------------------------------------------------------------



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

  // Manual cleanup of dependents to prevent FK violations
  // This serves as a safety net if cascade delete is not active in the database
  try {
    await db.chatChannelMember.deleteMany({ where: { userId } });
    await db.chatMessage.deleteMany({ where: { userId } });
    await db.comment.deleteMany({ where: { userId } });
    await db.timeEntry.deleteMany({ where: { userId } });
    await db.notification.deleteMany({ where: { userId } });
    await db.session.deleteMany({ where: { userId } });
    await db.account.deleteMany({ where: { userId } });
    
    // For Files, we usually don't want to cascade delete physical storage files 
    // without careful logic, but for "trash" cleanup we delete the DB records.
    await db.file.deleteMany({ where: { uploadedById: userId } });

    // Reassign activity logs to the current super admin to preserve audit trail
    // instead of deleting them.
    await db.activityLog.updateMany({
      where: { userId },
      data: { userId: session.user.id },
    });
  } catch (e) {
    console.error("Cleanup before delete failed:", e);
  }

  await db.user.delete({ where: { id: userId } });

  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Change User Role (SUPER_ADMIN / Director only)
// Directors can set employees ↔ managers, but cannot promote to Director
// ---------------------------------------------------------------------------

export async function changeUserRole(userId: string, newRole: Role) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const callerRole = session.user.role as Role;
  if (callerRole !== "SUPER_ADMIN") throw new Error("FORBIDDEN: Only Directors can change roles.");
  if (userId === session.user.id) throw new Error("CANNOT_CHANGE_OWN_ROLE");

  // Safety: Directors can only assign ADMIN or EMPLOYEE — not SUPER_ADMIN
  if (newRole === "SUPER_ADMIN") {
    throw new Error("FORBIDDEN: Director promotion requires a database script.");
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) throw new Error("USER_NOT_FOUND");

  // Prevent modifying other SUPER_ADMINs
  if (target.role === "SUPER_ADMIN") {
    throw new Error("FORBIDDEN: Cannot change another Director's role.");
  }

  await db.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "UPDATED",
      metadata: {
        changedUserId: userId,
        changedUserEmail: target.email,
        previousRole: target.role,
        newRole: newRole,
      },
    },
  });

  revalidatePath("/settings");
}

// ---------------------------------------------------------------------------
// Change User Department (SUPER_ADMIN — direct, no approval needed)
// ---------------------------------------------------------------------------

export async function changeUserDepartment(userId: string, department: Department) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN") throw new Error("FORBIDDEN: Only Super Admins can directly change departments.");

  await db.user.update({
    where: { id: userId },
    data: { department },
  });

  revalidatePath("/settings");
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// Request Department Change (any user — needs SUPER_ADMIN approval)
// ---------------------------------------------------------------------------

export async function requestDepartmentChange(requestedDept: Department) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { department: true },
  });

  if (user?.department === requestedDept) throw new Error("ALREADY_IN_DEPARTMENT");

  // Check for existing pending request
  const existing = await db.departmentChangeRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
  });
  if (existing) throw new Error("REQUEST_ALREADY_PENDING");

  await db.departmentChangeRequest.create({
    data: {
      userId: session.user.id,
      currentDept: user?.department,
      requestedDept,
    },
  });

  revalidatePath("/profile");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Get Pending Department Change Requests (SUPER_ADMIN)
// ---------------------------------------------------------------------------

export async function getPendingDeptRequests() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");

  return db.departmentChangeRequest.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { id: true, name: true, email: true, department: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Approve / Reject Department Change Request (SUPER_ADMIN)
// ---------------------------------------------------------------------------

export async function reviewDeptRequest(requestId: string, action: "APPROVED" | "REJECTED") {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (role !== "SUPER_ADMIN") throw new Error("FORBIDDEN");

  const request = await db.departmentChangeRequest.findUnique({
    where: { id: requestId },
  });
  if (!request || request.status !== "PENDING") throw new Error("REQUEST_NOT_FOUND");

  // Update request status
  await db.departmentChangeRequest.update({
    where: { id: requestId },
    data: {
      status: action,
      reviewedById: session.user.id,
      reviewedAt: new Date(),
    },
  });

  // If approved, update the user's department
  if (action === "APPROVED") {
    await db.user.update({
      where: { id: request.userId },
      data: { department: request.requestedDept },
    });
  }

  revalidatePath("/settings");
  revalidatePath("/profile");
}

// ---------------------------------------------------------------------------
// Get My Pending Department Request (for profile page)
// ---------------------------------------------------------------------------

export async function getMyPendingDeptRequest() {
  const session = await auth();
  if (!session?.user?.id) return null;

  return db.departmentChangeRequest.findFirst({
    where: { userId: session.user.id, status: "PENDING" },
    select: { id: true, requestedDept: true, createdAt: true },
  });
}

