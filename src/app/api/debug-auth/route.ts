export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ProjectStatus, TaskStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const checks: Record<string, string> = {};

  // 1. Env vars
  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? `SET (${process.env.BETTER_AUTH_SECRET.length} chars)` : "MISSING";
  checks.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "NOT SET";

  // Show DATABASE_URL host+port so we can verify it's the transaction pooler
  const dbUrl = process.env.DATABASE_URL || "";
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      checks.DATABASE_URL_HOST = `${parsed.hostname}:${parsed.port}`;
      checks.DATABASE_URL_PARAMS = parsed.search || "(none)";
    } catch {
      checks.DATABASE_URL = "SET (could not parse)";
    }
  } else {
    checks.DATABASE_URL = "MISSING";
  }

  // 1b. Cookie inspection — check all variants (plain + __Secure- prefix for HTTPS)
  const allCookies = req.cookies.getAll().map(c => c.name);
  checks.cookies = allCookies.length > 0 ? allCookies.join(", ") : "NONE";

  // Check all 4 possible cookie name variants
  checks.cookie_eodflow = req.cookies.get("eod-flow.session_token")?.value ? "FOUND" : "MISSING";
  checks.cookie_eodflow_secure = req.cookies.get("__Secure-eod-flow.session_token")?.value ? "FOUND" : "MISSING";
  checks.cookie_betterauth = req.cookies.get("better-auth.session_token")?.value ? "FOUND" : "MISSING";
  checks.cookie_betterauth_secure = req.cookies.get("__Secure-better-auth.session_token")?.value ? "FOUND" : "MISSING";

  // 2. DB connection
  try {
    const userCount = await db.user.count();
    checks.database = `OK (${userCount} users)`;

    const accountCount = await db.account.count();
    checks.accounts = `OK (${accountCount} accounts)`;
  } catch (e: any) {
    checks.database = `ERROR: ${e.message}`;
    return NextResponse.json(checks);
  }

  // 3. Test the EXACT queries from /overview (super admin path)
  try {
    const [activeProjects, totalClients, overdueTasks, totalTeam] = await Promise.all([
      db.project.count({ where: { status: ProjectStatus.ACTIVE } }),
      db.client.count({ where: { isActive: true } }),
      db.task.count({
        where: { dueDate: { lt: new Date() }, status: { notIn: [TaskStatus.DONE, TaskStatus.APPROVED] } },
      }),
      db.user.count({ where: { isActive: true } }),
    ]);

    checks.overviewQueries = `OK (projects=${activeProjects}, clients=${totalClients}, overdue=${overdueTasks}, team=${totalTeam})`;
  } catch (e: any) {
    checks.overviewQueries = `ERROR: ${e.message}`;
  }

  // 4. Test auth() function
  try {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    checks.authFunction = session ? `OK (user: ${session.user.email})` : "No session (no cookie sent)";
  } catch (e: any) {
    checks.authFunction = `ERROR: ${e.message}`;
  }

  return NextResponse.json(checks);
}
