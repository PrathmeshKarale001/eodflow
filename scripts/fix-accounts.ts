import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing account links...');
  // Find all credential accounts
  const accounts = await prisma.account.findMany({
    where: { providerId: 'credential' }
  });

  let fixed = 0;
  for (const acc of accounts) {
    if (acc.accountId !== acc.userId) {
      await prisma.account.update({
        where: { id: acc.id },
        data: { accountId: acc.userId } // Better Auth credential provider requires accountId to exactly equal userId
      });
      fixed++;
      console.log(`Fixed Account ID for UserId: ${acc.userId}`);
    }
  }
  
  // Update the Super Admin password properly using 10 salt rounds just in case (Better Auth defaults to 10)
  const bcrypt = require('bcryptjs');
  const superAdminPassword = await bcrypt.hash('EODFlow@2024!', 10);
  
  const superAdmin = await prisma.user.findUnique({ where: { email: 'pkarale002@gmail.com' } });
  if (superAdmin) {
    await prisma.account.updateMany({
      where: { userId: superAdmin.id, providerId: 'credential' },
      data: { password: superAdminPassword }
    });
    console.log(`Reset super admin password to EODFlow@2024! (10 rounds)`);
  }

  console.log(`Done. Fixed ${fixed} accounts.`);
}

main().finally(() => prisma.$disconnect());
