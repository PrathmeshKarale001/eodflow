import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Ensure pool_timeout and connect_timeout are appended to prevent
// Supabase free-tier connection exhaustion on Vercel serverless.
// Uses simple string manipulation to avoid 'url.parse()' deprecation warning.
function withPoolParams(url: string): string {
  if (!url) return url;
  // Override connection_limit to 3 (Supabase free tier supports ~20 pooled connections;
  // limit=1 caused pool contention when pages run 3-5 parallel queries)
  url = url.replace(/connection_limit=\d+/, "connection_limit=3");
  const sep = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  if (!url.includes("pool_timeout")) params.push("pool_timeout=15");
  if (!url.includes("connect_timeout")) params.push("connect_timeout=10");
  return params.length > 0 ? `${url}${sep}${params.join("&")}` : url;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is opt-in (set PRISMA_LOG_QUERIES=1 to enable)
    log: process.env.PRISMA_LOG_QUERIES
      ? ["query", "error", "warn"]
      : process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: withPoolParams(process.env.DATABASE_URL || ""),
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
