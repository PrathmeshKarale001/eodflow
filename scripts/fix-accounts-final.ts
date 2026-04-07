import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// These are the users we need to fix
const usersToFix = [
  { email: 'pkarale002@gmail.com', password: 'EODFlow@2024!' },
  { email: 'kayo@eodmedia.com', password: 'EOD@Kayo123' },
  { email: 'shripad@eodmedia.com', password: 'EOD@Shripad123' },
  { email: 'prem@eodmedia.com', password: 'EOD@Prem123' },
  { email: 'dev@eodmedia.com', password: 'EOD@Dev123' },
];

async function main() {
  console.log('=== Proper Account Repair ===\n');

  for (const entry of usersToFix) {
    // 1. Find the real user
    const user = await prisma.user.findUnique({ where: { email: entry.email } });
    if (!user) {
      console.log(`SKIP: User ${entry.email} not found`);
      continue;
    }
    console.log(`Found user: ${user.name} (${user.id})`);

    // 2. Check if they have any accounts
    const existingAccounts = await prisma.account.findMany({ 
      where: { userId: user.id, providerId: 'credential' } 
    });
    console.log(`  Existing accounts: ${existingAccounts.length}`);

    // 3. Delete any broken accounts for this user
    if (existingAccounts.length > 0) {
      await prisma.account.deleteMany({ where: { userId: user.id, providerId: 'credential' } });
      console.log(`  Cleaned up ${existingAccounts.length} old accounts`);
    }

    // 4. Create a temp user via Better Auth signup to get a properly hashed password
    const tempEmail = `fix_${Date.now()}_${Math.random().toString(36).substring(2, 8)}@temp.com`;
    const signupRes = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: tempEmail, password: entry.password, name: 'Temp' })
    });

    if (!signupRes.ok) {
      const err = await signupRes.text();
      console.log(`  ERROR: Signup failed for temp user: ${err}`);
      continue;
    }

    // 5. Get the temp user's account to steal the properly-hashed password
    const tempUser = await prisma.user.findUnique({ where: { email: tempEmail } });
    if (!tempUser) {
      console.log(`  ERROR: Temp user not found after signup`);
      continue;
    }

    const tempAccount = await prisma.account.findFirst({ 
      where: { userId: tempUser.id, providerId: 'credential' } 
    });

    if (!tempAccount || !tempAccount.password) {
      console.log(`  ERROR: Temp account has no password`);
      continue;
    }

    console.log(`  Got native hash (length: ${tempAccount.password.length})`);

    // 6. Create a proper account for the REAL user with the correct hash
    await prisma.account.create({
      data: {
        accountId: user.id,  // Better Auth requires accountId === userId for credential provider
        providerId: 'credential',
        userId: user.id,
        password: tempAccount.password,
      }
    });
    console.log(`  ✅ Created proper credential account for ${entry.email}`);

    // 7. Cleanup temp user (cascade deletes their account too)
    await prisma.user.delete({ where: { id: tempUser.id } });
    console.log(`  Cleaned up temp user\n`);
  }

  // Final verification
  console.log('\n=== VERIFICATION ===');
  for (const entry of usersToFix) {
    const user = await prisma.user.findUnique({ where: { email: entry.email } });
    if (!user) continue;
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    console.log(`${entry.email}: ${accounts.length} account(s), accountId matches userId: ${accounts[0]?.accountId === user.id}`);
  }

  // Test sign-in with super admin
  console.log('\n=== TESTING SIGN-IN ===');
  const signinRes = await fetch('http://localhost:3000/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({ email: 'pkarale002@gmail.com', password: 'EODFlow@2024!' })
  });
  console.log(`Sign-in status: ${signinRes.status}`);
  if (signinRes.status === 200) {
    console.log('🎉 SUCCESS! Login is working!');
  } else {
    const body = await signinRes.text();
    console.log(`Body: ${body}`);
  }
}

main().finally(() => prisma.$disconnect());
