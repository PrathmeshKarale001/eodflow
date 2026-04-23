import { PrismaClient, Role, Department } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // ============================================================
  // STEP 1: Real Super Admin (Bootstrap Account)
  // ============================================================
  // Change password before going live — this is for initial setup only
  const superAdminPassword = await bcrypt.hash('EODFlow@2024!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'pkarale002@gmail.com' },
    update: { isActive: true },
    create: {
      name: 'Prathmesh Karale',
      email: 'pkarale002@gmail.com',
      emailVerified: true,
      role: Role.SUPER_ADMIN,
      department: Department.MANAGEMENT,
      isActive: true,
      accounts: {
        create: {
          accountId: 'pkarale002@gmail.com',
          providerId: 'credential',
          password: superAdminPassword,
        }
      }
    },
  });

  console.log(`✅ Super Admin: ${superAdmin.email}`);

  // ============================================================
  // STEP 2: Real Clients (Arome World + Solitario — real accounts)
  // ============================================================
  const aromeWorld = await prisma.client.upsert({
    where: { id: 'seed-arome-world' },
    update: {},
    create: {
      id: 'seed-arome-world',
      companyName: 'Arome World',
      brandColor: '#FF5733',
      pocAdminId: superAdmin.id,
      industry: 'Beverage',
    },
  });

  const solitario = await prisma.client.upsert({
    where: { id: 'seed-solitario' },
    update: {},
    create: {
      id: 'seed-solitario',
      companyName: 'Solitario Diamonds',
      brandColor: '#B9A16B',
      pocAdminId: superAdmin.id,
      industry: 'Jewelry',
    },
  });

  console.log(`✅ Clients: ${aromeWorld.companyName}, ${solitario.companyName}`);

  // ============================================================
  // STEP 3: Default GROUP Channels (seeded once, managed via UI after)
  // ============================================================
  const defaultChannels = [
    { name: 'General', description: 'Team-wide announcements and conversation' },
    { name: 'Unofficial EOD', description: 'Casual team conversation' },
    { name: 'Solitario', description: 'Solitario Diamonds project discussion' },
    { name: 'Aeromall', description: 'Aeromall project discussion' },
    { name: 'CS Jewels', description: 'CS Jewels project discussion' },
    { name: 'Arome World', description: 'Arome World project discussion' },
  ];

  const createdChannels = [];
  for (const ch of defaultChannels) {
    const existing = await prisma.chatChannel.findFirst({
      where: { name: ch.name, type: 'GROUP' },
    });

    if (!existing) {
      const channel = await prisma.chatChannel.create({
        data: {
          name: ch.name,
          type: 'GROUP',
        },
      });
      createdChannels.push(channel);
      console.log(`✅ Channel created: #${ch.name}`);
    } else {
      createdChannels.push(existing);
      console.log(`⏭  Channel exists: #${ch.name}`);
    }
  }

  // Add super admin to all channels
  for (const channel of createdChannels) {
    await prisma.chatChannelMember.upsert({
      where: { channelId_userId: { channelId: channel.id, userId: superAdmin.id } },
      update: {},
      create: { channelId: channel.id, userId: superAdmin.id },
    });
  }

  console.log('✅ Super admin added to all channels.');
  console.log('\n🎉 Seed complete! Use Settings → User Management to invite your team.');
  console.log(`\n📧 Login: pkarale002@gmail.com`);
  console.log(`🔑 Password: EODFlow@2024! (change this immediately after first login)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
