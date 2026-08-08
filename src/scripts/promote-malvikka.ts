/**
 * One-time script to promote Malvikka Vahi from ADMIN (Manager) to SUPER_ADMIN (Director).
 * 
 * Run with: npx tsx src/scripts/promote-malvikka.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "hr@lokshahilive.com" },
    select: { id: true, name: true, email: true, role: true },
  });

  if (!user) {
    console.error("❌ User hr@lokshahilive.com not found.");
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.email}) — current role: ${user.role}`);

  if (user.role === "SUPER_ADMIN") {
    console.log("✅ Already a Director (SUPER_ADMIN). Nothing to do.");
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: "SUPER_ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`✅ Promoted ${updated.name} to ${updated.role} (Director).`);
}

main()
  .catch((e) => {
    console.error("Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
