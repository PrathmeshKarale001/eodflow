import { NextResponse } from "next/server";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check if db module loads
  try {
    const { db } = await import("@/lib/db");
    checks["db_import"] = "OK";

    // 2. Check DB connection
    try {
      await db.$queryRaw`SELECT 1`;
      checks["db_connection"] = "OK";
    } catch (e: any) {
      checks["db_connection"] = `FAIL: ${e.message}`;
    }

    // 3. Check if invitation table exists
    try {
      const count = await db.invitation.count();
      checks["invitation_table"] = `OK (${count} rows)`;
    } catch (e: any) {
      checks["invitation_table"] = `FAIL: ${e.message}`;
    }
  } catch (e: any) {
    checks["db_import"] = `FAIL: ${e.message}`;
  }

  // 4. Check if auth module loads
  try {
    await import("@/lib/auth");
    checks["auth_import"] = "OK";
  } catch (e: any) {
    checks["auth_import"] = `FAIL: ${e.message}`;
  }

  // 5. Check if better-auth/crypto loads
  try {
    const crypto = await import("better-auth/crypto");
    checks["better_auth_crypto"] = `OK (exports: ${Object.keys(crypto).join(", ")})`;
  } catch (e: any) {
    checks["better_auth_crypto"] = `FAIL: ${e.message}`;
  }

  // 6. Check if invitations module loads
  try {
    const inv = await import("@/app/actions/invitations");
    checks["invitations_module"] = `OK (exports: ${Object.keys(inv).join(", ")})`;
  } catch (e: any) {
    checks["invitations_module"] = `FAIL: ${e.message}`;
  }

  // 7. Check Prisma client types
  try {
    const prisma = await import("@prisma/client");
    const models = Object.keys(prisma).filter(k => k[0] === k[0].toUpperCase() && k !== "PrismaClient" && !k.startsWith("Prisma"));
    checks["prisma_enums"] = models.slice(0, 20).join(", ");
  } catch (e: any) {
    checks["prisma_types"] = `FAIL: ${e.message}`;
  }

  return NextResponse.json(checks, { status: 200 });
}
