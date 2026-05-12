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
        // In development: DATABASE_URL points to port 5432 (direct, no PgBouncer).
        // This avoids "connection_limit=1" contention when many queries run in parallel.
        // In production (Vercel): DATABASE_URL is set in the dashboard to the
        // PgBouncer pooler URL (?pgbouncer=true&connection_limit=1).
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
