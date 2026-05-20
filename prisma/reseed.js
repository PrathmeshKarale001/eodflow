// Quick re-seed script — uses Better Auth's hashPassword for compatibility
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("better-auth/crypto");

const prisma = new PrismaClient();

async function main() {
  console.log("Re-seeding super admin...");

  const password = "EODFlow@2024!";
  const passwordHash = await hashPassword(password);

  // Upsert super admin
  const superAdmin = await prisma.user.upsert({
    where: { email: "pkarale002@gmail.com" },
    update: { isActive: true },
    create: {
      name: "Prathmesh Karale",
      email: "pkarale002@gmail.com",
      emailVerified: true,
      role: "SUPER_ADMIN",
      department: "STRATEGY",
      isActive: true,
    },
  });

  // Upsert credential account with correct hash
  const existingAccount = await prisma.account.findFirst({
    where: { userId: superAdmin.id, providerId: "credential" },
  });

  if (existingAccount) {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: passwordHash },
    });
  } else {
    await prisma.account.create({
      data: {
        userId: superAdmin.id,
        accountId: superAdmin.email,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }

  console.log("✅ Super Admin restored:", superAdmin.email);

  // Re-create default channels
  const channels = ["General", "Unofficial EOD", "Solitario", "Aeromall", "CS Jewels", "Arome World"];
  for (const name of channels) {
    const existing = await prisma.chatChannel.findFirst({ where: { name, type: "GROUP" } });
    if (!existing) {
      const ch = await prisma.chatChannel.create({ data: { name, type: "GROUP" } });
      await prisma.chatChannelMember.create({ data: { channelId: ch.id, userId: superAdmin.id } });
      console.log("✅ Channel:", name);
    }
  }

  // Re-create clients
  await prisma.client.upsert({
    where: { id: "seed-arome-world" },
    update: {},
    create: { id: "seed-arome-world", companyName: "Arome World", brandColor: "#FF5733", pocAdminId: superAdmin.id, industry: "Beverage" },
  });
  await prisma.client.upsert({
    where: { id: "seed-solitario" },
    update: {},
    create: { id: "seed-solitario", companyName: "Solitario Diamonds", brandColor: "#B9A16B", pocAdminId: superAdmin.id, industry: "Jewelry" },
  });

  console.log("✅ Clients restored");
  console.log("\n🔑 Login: pkarale002@gmail.com / EODFlow@2024!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
