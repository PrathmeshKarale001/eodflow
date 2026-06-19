import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is opt-in (set PRISMA_LOG_QUERIES=1 to enable)
    // Default "query" logging in dev floods stdout and slows terminal I/O
    log: process.env.PRISMA_LOG_QUERIES
      ? ["query", "error", "warn"]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        // Append pool_timeout and connect_timeout if not already present
        // to handle intermittent Supabase connection exhaustion on Vercel serverless
        url: addPoolParams(process.env.DATABASE_URL || ""),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Ensures pool_timeout and connect_timeout are present on the DATABASE_URL.
 * These prevent Vercel serverless cold starts from timing out on Supabase free tier.
 */
function addPoolParams(url: string): string {
  if (!url) return url;
  const u = new URL(url);
  if (!u.searchParams.has("pool_timeout")) u.searchParams.set("pool_timeout", "20");
  if (!u.searchParams.has("connect_timeout")) u.searchParams.set("connect_timeout", "15");
  return u.toString();
}
