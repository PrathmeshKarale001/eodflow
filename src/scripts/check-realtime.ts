import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking Supabase Realtime publication status...");

  // 1. Check if supabase_realtime publication exists
  const publications: any = await prisma.$queryRawUnsafe(
    `SELECT pubname FROM pg_publication WHERE pubname = 'supabase_realtime'`
  );

  if (publications.length === 0) {
    console.log("Creating publication 'supabase_realtime'...");
    await prisma.$queryRawUnsafe(`CREATE PUBLICATION supabase_realtime`);
  } else {
    console.log("Publication 'supabase_realtime' already exists.");
  }

  // 2. Check which tables are in the publication
  const tables: any = await prisma.$queryRawUnsafe(
    `SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime'`
  );

  console.log("Current tables in publication:", tables);

  // 3. Ensure our core tables are in the publication
  const requiredTables = ["chat_messages", "tasks", "comments", "notifications"];
  for (const table of requiredTables) {
    const isAdded = tables.some((t: any) => t.tablename === table);
    if (!isAdded) {
      console.log(`Adding table '${table}' to publication...`);
      try {
        await prisma.$queryRawUnsafe(
          `ALTER PUBLICATION supabase_realtime ADD TABLE "${table}"`
        );
        console.log(`Successfully added '${table}'`);
      } catch (err: any) {
        console.error(`Failed to add '${table}':`, err.message);
      }
    } else {
      console.log(`Table '${table}' is already in publication.`);
    }
  }

  console.log("Supabase Realtime configuration complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
