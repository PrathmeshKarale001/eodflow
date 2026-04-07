import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const desiredAccounts = [
  { email: 'pkarale002@gmail.com', desiredPassword: 'EODFlow@2024!' },
  { email: 'kayo@eodmedia.com', desiredPassword: 'EOD@KD' },
  { email: 'shripad@eodmedia.com', desiredPassword: 'EOD@SK' },
  { email: 'prem@eodmedia.com', desiredPassword: 'EOD@PK' },
  { email: 'dev@eodmedia.com', desiredPassword: 'EOD@DE' },
];

async function main() {
  console.log('Generating proper Better Auth hashes...');

  for (const acc of desiredAccounts) {
    const tempEmail = `temp_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
    
    // 1. Sign up a temp user to force Better Auth to map it
    const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({
        email: tempEmail,
        password: acc.desiredPassword,
        name: 'Temp'
      })
    });

    if (!res.ok) {
      console.log(`Failed to generate temp hash for ${acc.email} because the server rejected it. Is the server running?`);
      continue;
    }

    // 2. Extract the perfect hash from the DB
    const tempUser = await prisma.user.findUnique({ where: { email: tempEmail } });
    if (!tempUser) continue;
    
    const tempAccount = await prisma.account.findFirst({
        where: { userId: tempUser.id, providerId: 'credential' }
    });

    if (tempAccount && tempAccount.password) {
      // 3. Apply this hash to the REAL user
      const realUser = await prisma.user.findUnique({ where: { email: acc.email } });
      if (realUser) {
        await prisma.account.updateMany({
          where: { userId: realUser.id, providerId: 'credential' },
          data: { password: tempAccount.password } // Copy the exact valid Better Auth hash!
        });
        console.log(`Successfully patched password format for ${acc.email}`);
      } else {
        console.log(`Could not find real user ${acc.email} in DB`);
      }
    }

    // 4. Cleanup the temp user
    await prisma.user.delete({ where: { email: tempEmail } });
  }

  console.log('All passwords successfully converted to native Better Auth crypto formats.');
}

main().finally(() => prisma.$disconnect());
