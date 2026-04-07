const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Sending signup request...');
  const res = await fetch('http://localhost:3000/api/auth/sign-up/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Origin': 'http://localhost:3000' },
    body: JSON.stringify({
      email: 'testauth@eodmedia.com',
      password: 'Password123!',
      name: 'Test Auth User'
    })
  });
  
  if (!res.ok) {
    const err = await res.text();
    console.error('Signup failed:', res.status, err);
  } else {
    console.log('Signup succeeded!');
  }

  const user = await prisma.user.findUnique({ where: { email: 'testauth@eodmedia.com' }});
  if (user) {
    console.log('User ID:', user.id);
    const accounts = await prisma.account.findMany({ where: { userId: user.id } });
    console.log('Accounts:', accounts);
  }
}

main().finally(() => prisma.$disconnect());
