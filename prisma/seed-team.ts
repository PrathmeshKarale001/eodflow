import { PrismaClient, Role, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Initiating team account creation...');

  const team = [
    { name: 'Kayo Daruwala', email: 'kayo@eodmedia.com', password: 'EOD@KD', role: Role.ADMIN, department: Department.STRATEGY },
    { name: 'Shripad Kale', email: 'shripad@eodmedia.com', password: 'EOD@SK', role: Role.EMPLOYEE, department: Department.STRATEGY },
    { name: 'Prem Khetre', email: 'prem@eodmedia.com', password: 'EOD@PK', role: Role.EMPLOYEE, department: Department.STRATEGY },
    { name: 'Dev Enmulwar', email: 'dev@eodmedia.com', password: 'EOD@DE', role: Role.EMPLOYEE, department: Department.STRATEGY },
  ];

  for (const user of team) {
    const hashedPassword = await bcrypt.hash(user.password, 12);

    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        name: user.name,
        email: user.email,
        emailVerified: true,
        role: user.role,
        department: user.department,
        isActive: true,
        accounts: {
          create: {
            accountId: user.email,
            providerId: 'credential',
            password: hashedPassword,
          }
        }
      },
    });

    console.log(`✅ Created User: ${createdUser.name} | Role: ${createdUser.role} | Email: ${createdUser.email} | Pass: ${user.password}`);
  }

  console.log('\n🎉 Team Member seeded successfully! They can now log in.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
