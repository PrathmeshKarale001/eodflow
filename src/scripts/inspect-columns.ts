import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Inspecting columns of table 'tasks'...");
  const taskCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'tasks'
  `);
  console.log("Tasks columns:", taskCols.map((c: any) => `${c.column_name} (${c.data_type})`));

  console.log("Inspecting columns of table 'chat_messages'...");
  const chatCols: any = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'chat_messages'
  `);
  console.log("Chat Messages columns:", chatCols.map((c: any) => `${c.column_name} (${c.data_type})`));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
