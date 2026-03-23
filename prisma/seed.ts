import { PrismaClient, Role, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  // Create a default password hash for all seed users
  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@eodmedia.com' },
    update: {},
    create: {
      name: 'Priya (Super Admin)',
      email: 'superadmin@eodmedia.com',
      passwordHash,
      role: Role.SUPER_ADMIN,
      department: Department.MANAGEMENT,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@eodmedia.com' },
    update: {},
    create: {
      name: 'Rohan (Admin)',
      email: 'admin@eodmedia.com',
      passwordHash,
      role: Role.ADMIN,
      department: Department.MANAGEMENT,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@eodmedia.com' },
    update: {},
    create: {
      name: 'Ayesha (Manager)',
      email: 'manager@eodmedia.com',
      passwordHash,
      role: Role.MANAGER,
      department: Department.STRATEGY,
    },
  });

  const employee1 = await prisma.user.upsert({
    where: { email: 'designer@eodmedia.com' },
    update: {},
    create: {
      name: 'Kabir (Designer)',
      email: 'designer@eodmedia.com',
      passwordHash,
      role: Role.EMPLOYEE,
      department: Department.DESIGN,
    },
  });

  const employee2 = await prisma.user.upsert({
    where: { email: 'dev@eodmedia.com' },
    update: {},
    create: {
      name: 'Sana (Developer)',
      email: 'dev@eodmedia.com',
      passwordHash,
      role: Role.EMPLOYEE,
      department: Department.DEVELOPMENT,
    },
  });

  console.log('Users created.');

  // 2. Create Clients
  const client1 = await prisma.client.create({
    data: {
      companyName: 'Arome World',
      brandColor: '#FF5733',
      pocAdminId: admin.id,
      industry: 'Beverage',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      companyName: 'Solitario Diamonds',
      brandColor: '#B9A16B',
      pocAdminId: admin.id,
      industry: 'Jewelry',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      companyName: 'Goosebumps Arena',
      brandColor: '#4A90E2',
      pocAdminId: admin.id,
      industry: 'Entertainment',
    },
  });

  console.log('Clients created.');
  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
