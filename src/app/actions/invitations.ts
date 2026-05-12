"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { hasPermission } from "@/lib/permissions";
import { Role, Department, InvitationType } from "@prisma/client";
import { randomBytes } from "crypto";
import { sendInviteEmail } from "@/lib/email";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a 64-char hex token for magic links */
function generateLinkToken(): string {
  return randomBytes(32).toString("hex");
}

/** Generate a human-readable invite code: EOD-XXXX-XXXX */
function generateInviteCode(): string {
  const part1 = randomBytes(2).toString("hex").toUpperCase();
  const part2 = randomBytes(2).toString("hex").toUpperCase();
  return `EOD-${part1}-${part2}`;
}

/** Hash a password with bcrypt */
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 12);
}

// ---------------------------------------------------------------------------
// Create Magic Invite Link (SUPER_ADMIN, ADMIN)
// ---------------------------------------------------------------------------

export async function createInviteLink(data: {
  name: string;
  email: string;
  role: Role;
  department?: Department;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (!hasPermission(userRole, "inviteUsers")) {
    throw new Error("FORBIDDEN: You do not have permission to invite users.");
  }

  // POCs (ADMIN) can only invite EMPLOYEE
  if (userRole === Role.ADMIN && data.role !== Role.EMPLOYEE) {
    throw new Error("FORBIDDEN: POCs can only invite Employees.");
  }

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("USER_EXISTS: A user with this email already exists.");

  // Check if there's already an active invite for this email
  const existingInvite = await db.invitation.findFirst({
    where: {
      email: data.email,
      type: InvitationType.LINK,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });
  if (existingInvite) {
    // Deactivate old invite before creating new one
    await db.invitation.update({
      where: { id: existingInvite.id },
      data: { isActive: false },
    });
  }

  const token = generateLinkToken();
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

  const invitation = await db.invitation.create({
    data: {
      type: InvitationType.LINK,
      token,
      email: data.email,
      name: data.name,
      role: data.role,
      department: data.department,
      maxUses: 1,
      expiresAt,
      createdById: session.user.id,
    },
  });

  // Build the magic link URL
  const baseUrl = process.env.BETTER_AUTH_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const joinUrl = `${baseUrl}/join?token=${token}`;

  // Send invite email via Resend (fire-and-forget)
  sendInviteEmail({
    to: data.email,
    name: data.name,
    invitedBy: session.user.name || "Your team",
    role: data.role,
    department: data.department,
    joinUrl,
    expiresAt,
  }).catch((err) => {
    console.error("[INVITE] Failed to send email:", err);
  });

  // Log activity
  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "CREATED",
      metadata: {
        type: "INVITE_LINK",
        invitedEmail: data.email,
        invitedRole: data.role,
      },
    },
  });

  revalidatePath("/settings");
  return { invitationId: invitation.id, joinUrl };
}

// ---------------------------------------------------------------------------
// Create Invite Code (SUPER_ADMIN only)
// ---------------------------------------------------------------------------

export async function createInviteCode(data: {
  maxUses?: number;
  expiryDays?: number;
  role?: Role;
  department?: Department;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const userRole = session.user.role as Role;
  if (userRole !== Role.SUPER_ADMIN) {
    throw new Error("FORBIDDEN: Only Directors can create invite codes.");
  }

  const code = generateInviteCode();
  const maxUses = data.maxUses ?? 5;
  const expiryDays = data.expiryDays ?? 7;
  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      type: InvitationType.CODE,
      token: code,
      role: data.role ?? Role.EMPLOYEE,
      department: data.department,
      maxUses,
      expiresAt,
      createdById: session.user.id,
    },
  });

  await db.activityLog.create({
    data: {
      userId: session.user.id,
      action: "CREATED",
      metadata: { type: "INVITE_CODE", code, maxUses },
    },
  });

  revalidatePath("/settings");
  return { code, invitationId: invitation.id, maxUses, expiresAt };
}

// ---------------------------------------------------------------------------
// Validate Invitation (Public — no auth required)
// ---------------------------------------------------------------------------

export async function validateInvitation(token: string) {
  const invitation = await db.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return { valid: false, error: "INVALID_TOKEN" as const };
  }

  if (!invitation.isActive) {
    return { valid: false, error: "DEACTIVATED" as const };
  }

  if (invitation.expiresAt < new Date()) {
    return { valid: false, error: "EXPIRED" as const };
  }

  if (invitation.usedCount >= invitation.maxUses) {
    return { valid: false, error: "MAX_USES_REACHED" as const };
  }

  return {
    valid: true,
    invitation: {
      id: invitation.id,
      type: invitation.type,
      email: invitation.email,
      name: invitation.name,
      role: invitation.role,
      department: invitation.department,
    },
  };
}

// ---------------------------------------------------------------------------
// Accept Invitation (Public — creates the user account)
// ---------------------------------------------------------------------------

export async function acceptInvitation(data: {
  token: string;
  password: string;
  name?: string;   // Required for CODE type (not pre-filled)
  email?: string;  // Required for CODE type (not pre-filled)
}) {
  // Validate the invitation
  const result = await validateInvitation(data.token);
  if (!result.valid) {
    const messages: Record<string, string> = {
      INVALID_TOKEN: "This invite link or code is invalid.",
      DEACTIVATED: "This invitation has been revoked.",
      EXPIRED: "This invitation has expired. Please request a new one.",
      MAX_USES_REACHED: "This invite code has reached its maximum uses.",
    };
    throw new Error(messages[result.error!] || "Invalid invitation.");
  }

  const inv = result.invitation!;

  // Determine name and email based on invitation type
  const name = inv.type === "LINK" ? inv.name! : data.name?.trim();
  const email = inv.type === "LINK" ? inv.email! : data.email?.trim();

  if (!name || !email) {
    throw new Error("Name and email are required.");
  }

  // Password validation
  if (!data.password || data.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // Check if user already exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account with this email already exists. Please log in instead.");
  }

  // Hash password
  const passwordHash = await hashPassword(data.password);

  // Create user + credential account in a transaction
  const user = await db.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        name,
        role: inv.role,
        department: inv.department,
        isActive: true,
        invitedBy: (await db.invitation.findUnique({
          where: { token: data.token },
          select: { createdById: true },
        }))?.createdById,
      },
    });

    // Create credential account (Better-Auth convention)
    await tx.account.create({
      data: {
        userId: newUser.id,
        accountId: newUser.id,
        providerId: "credential",
        password: passwordHash,
      },
    });

    // Increment used count (and deactivate if single-use link)
    await tx.invitation.update({
      where: { token: data.token },
      data: {
        usedCount: { increment: 1 },
        ...(inv.type === "LINK" ? { isActive: false } : {}),
      },
    });

    return newUser;
  });

  // Log activity
  await db.activityLog.create({
    data: {
      userId: user.id,
      action: "CREATED",
      metadata: { type: "ACCEPTED_INVITATION", invitationType: inv.type },
    },
  });

  revalidatePath("/settings");
  return { success: true, userId: user.id };
}

// ---------------------------------------------------------------------------
// List Invitations (ADMIN+)
// ---------------------------------------------------------------------------

export async function listInvitations() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers")) throw new Error("FORBIDDEN");

  return db.invitation.findMany({
    include: {
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Deactivate Invitation (ADMIN+)
// ---------------------------------------------------------------------------

export async function deactivateInvitation(invitationId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("UNAUTHORIZED");

  const role = session.user.role as Role;
  if (!hasPermission(role, "inviteUsers")) throw new Error("FORBIDDEN");

  await db.invitation.update({
    where: { id: invitationId },
    data: { isActive: false },
  });

  revalidatePath("/settings");
}
