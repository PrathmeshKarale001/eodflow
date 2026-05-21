import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Inspecting columns of table 'comments'...");
  const commentCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'comments'
  `);
  console.log("Comments columns:", commentCols.map((c: any) => `${c.column_name} (${c.data_type})`));

  console.log("Inspecting columns of table 'notifications'...");
  const notifCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'notifications'
  `);
  console.log("Notifications columns:", notifCols.map((c: any) => `${c.column_name} (${c.data_type})`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
