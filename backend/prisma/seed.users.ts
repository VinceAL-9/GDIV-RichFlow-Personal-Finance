import { PrismaClient } from '@prisma/client';
import {hashPassword} from '../src/utils/password.utils';

const prisma = new PrismaClient();



const users = [
  {
    name: 'admin',
    email: 'richflow@gdiv.se',
    password: 'C28Qw5UaXucMup',
    isAdmin: true,
    preferredCurrencyId: 1, // USD
  },
  {
    name: 'testuser1',
    email: 'testuser1@example.com',
    password: 'Test123!',
    isAdmin: false,
    preferredCurrencyId: 10, // USD
  },
  {
    name: 'testuser2',
    email: 'testuser2@example.com',
    password: 'Test123!',
    isAdmin: false,
    preferredCurrencyId: 20, // EUR
  },
  {
    name: 'testuser3',
    email: 'testuser3@example.com',
    password: 'Test123!',
    isAdmin: false,
    preferredCurrencyId: 30, // GBP
  },
];

async function main() {
  console.log('Starting user seed...');

  for (const user of users) {
    const hashedPassword = await hashPassword(user.password);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        isAdmin: user.isAdmin,
        preferredCurrencyId: user.preferredCurrencyId,
        updatedAt: new Date(),
      },
      create: {
        name: user.name,
        email: user.email,
        password: hashedPassword,
        isAdmin: user.isAdmin,
        preferredCurrencyId: user.preferredCurrencyId,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Upserted user: ${user.email} (${user.isAdmin ? 'Admin' : 'User'})`);
  }

  console.log(`\n✅ Successfully seeded ${users.length} users`);
  console.log('\nUser credentials:');
  console.log('================');
  users.forEach((user) => {
    console.log(`${user.email} / ${user.password}`);
  });
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
