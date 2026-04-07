import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const lines: string[] = [];

  // 1. Dump the super admin user + account
  const user = await prisma.user.findUnique({ where: { email: 'pkarale002@gmail.com' } });
  lines.push('=== SUPER ADMIN USER ===');
  lines.push(JSON.stringify(user, null, 2));

  if (user) {
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    lines.push('\n=== SUPER ADMIN ACCOUNTS (count: ' + accounts.length + ') ===');
    for (const acc of accounts) {
      lines.push(JSON.stringify({
        id: acc.id,
        accountId: acc.accountId,
        providerId: acc.providerId,
        userId: acc.userId,
        passwordLength: acc.password?.length,
        passwordPrefix: acc.password?.substring(0, 40),
        passwordSuffix: acc.password?.substring((acc.password?.length || 0) - 20),
      }, null, 2));
    }
  }

  // 2. Also check the testauth user (the one that works via signup)
  const testUser = await prisma.user.findUnique({ where: { email: 'testauth@eodmedia.com' } });
  if (testUser) {
    const testAccounts = await prisma.account.findMany({ where: { userId: testUser.id } });
    lines.push('\n=== WORKING TEST USER ACCOUNT ===');
    for (const acc of testAccounts) {
      lines.push(JSON.stringify({
        id: acc.id,
        accountId: acc.accountId,
        providerId: acc.providerId,
        userId: acc.userId,
        passwordLength: acc.password?.length,
        passwordPrefix: acc.password?.substring(0, 40),
      }, null, 2));
    }
  } else {
    lines.push('\n=== NO TEST USER FOUND (already cleaned up) ===');
  }

  // 3. Try signing in via API  
  lines.push('\n=== TESTING SIGN-IN: pkarale002@gmail.com ===');
  try {
    const res = await fetch('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'pkarale002@gmail.com', password: 'EODFlow@2024!' })
    });
    lines.push('Status: ' + res.status);
    const body = await res.text();
    lines.push('Body: ' + body);
  } catch (e: any) {
    lines.push('Error: ' + e.message);
  }

  // 4. Create a FRESH user via signup and immediately sign-in to prove the flow works
  lines.push('\n=== CREATING FRESH TEST USER VIA SIGNUP ===');
  try {
    const signupRes = await fetch('http://localhost:3000/api/auth/sign-up/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'freshtest@eodmedia.com', password: 'FreshTest123!', name: 'Fresh Test' })
    });
    lines.push('Signup Status: ' + signupRes.status);
    const signupBody = await signupRes.text();
    lines.push('Signup Body: ' + signupBody.substring(0, 200));
    
    // Now sign in with the same credentials
    const signinRes = await fetch('http://localhost:3000/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
      body: JSON.stringify({ email: 'freshtest@eodmedia.com', password: 'FreshTest123!' })
    });
    lines.push('Signin Status: ' + signinRes.status);
    const signinBody = await signinRes.text();
    lines.push('Signin Body: ' + signinBody.substring(0, 200));

    // Dump this user's account for comparison
    const freshUser = await prisma.user.findUnique({ where: { email: 'freshtest@eodmedia.com' } });
    if (freshUser) {
      const freshAccounts = await prisma.account.findMany({ where: { userId: freshUser.id } });
      lines.push('\n=== FRESH USER ACCOUNT DATA ===');
      for (const acc of freshAccounts) {
        lines.push(JSON.stringify({
          id: acc.id,
          accountId: acc.accountId,
          providerId: acc.providerId,
          userId: acc.userId,
          passwordLength: acc.password?.length,
          passwordPrefix: acc.password?.substring(0, 40),
        }, null, 2));
      }
    }
  } catch (e: any) {
    lines.push('Error: ' + e.message);
  }

  fs.writeFileSync('scripts/debug-output.txt', lines.join('\n'));
  console.log('Output written to scripts/debug-output.txt');
}

main().finally(() => prisma.$disconnect());
