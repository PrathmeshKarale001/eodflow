import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Check env vars
  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? `SET (${process.env.BETTER_AUTH_SECRET.length} chars)` : "MISSING";
  checks.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "NOT SET";
  checks.VERCEL_URL = process.env.VERCEL_URL || "NOT SET";
  checks.DATABASE_URL = process.env.DATABASE_URL ? "SET" : "MISSING";

  // 2. Check DB connection
  try {
    const userCount = await db.user.count();
    checks.database = `OK (${userCount} users)`;
    
    // Check if accounts exist
    const accountCount = await db.account.count();
    checks.accounts = `OK (${accountCount} accounts)`;

    // Check super admin specifically
    const superAdmin = await db.user.findUnique({ where: { email: "pkarale002@gmail.com" } });
    if (superAdmin) {
      const adminAccounts = await db.account.findMany({ where: { userId: superAdmin.id } });
      checks.superAdmin = `Found (${adminAccounts.length} credential accounts)`;
    } else {
      checks.superAdmin = "NOT FOUND";
    }
  } catch (e: any) {
    checks.database = `ERROR: ${e.message}`;
  }

  return NextResponse.json(checks);
}
