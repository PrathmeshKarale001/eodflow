const { PrismaClient } = require('@prisma/client');

const URL = "postgresql://postgres.sffypbdlmxelowljbmvt:EODFlow2024secure@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";

console.log("Testing CORRECT pooler:", URL.replace(/:([^:@]+)@/, ':***@'));

const prisma = new PrismaClient({ datasources: { db: { url: URL } } });

prisma.$queryRawUnsafe('SELECT current_user, current_database()')
  .then(r => { console.log("✅ CONNECTED!", JSON.stringify(r)); })
  .catch(e => { console.log("❌ FAILED:", e.message); })
  .finally(() => prisma.$disconnect());
