import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ProjectStatus, TaskStatus } from "@prisma/client";

export async function GET() {
  const checks: Record<string, string> = {};

  // 1. Env vars
  checks.BETTER_AUTH_SECRET = process.env.BETTER_AUTH_SECRET ? `SET (${process.env.BETTER_AUTH_SECRET.length} chars)` : "MISSING";
  checks.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || "NOT SET";
  checks.DATABASE_URL = process.env.DATABASE_URL ? "SET" : "MISSING";

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
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

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
    // Import dynamically to avoid edge issues
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    checks.authFunction = session ? `OK (user: ${session.user.email})` : "No session (expected - no cookie in this request)";
  } catch (e: any) {
    checks.authFunction = `ERROR: ${e.message}`;
  }

  return NextResponse.json(checks);
}
