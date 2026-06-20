import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Supabase Pro: 200+ pooled connections — use connection_limit=10 per
// Vercel serverless instance for full parallel query performance.
function withPoolParams(url: string): string {
  if (!url) return url;
  url = url.replace(/connection_limit=\d+/, "connection_limit=10");
  const sep = url.includes("?") ? "&" : "?";
  const params: string[] = [];
  if (!url.includes("pool_timeout")) params.push("pool_timeout=10");
  if (!url.includes("connect_timeout")) params.push("connect_timeout=10");
  return params.length > 0 ? `${url}${sep}${params.join("&")}` : url;
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
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
