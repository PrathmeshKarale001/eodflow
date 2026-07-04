/**
 * One-time script to promote Kavita Thakare from EMPLOYEE to ADMIN (Manager).
 * 
 * Run with: npx tsx src/scripts/promote-kavita.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "kavita.thakare@eod.media" },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error("❌ User kavita.thakare@eod.media not found.");
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.email}) — current role: ${user.role}`);

  if (user.role === "ADMIN") {
    console.log("✅ Already a Manager (ADMIN). Nothing to do.");
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`✅ Promoted ${updated.name} to ${updated.role} (Manager).`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
