const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createUsers() {
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Create root admin with specified credentials
  const rootAdmin = await prisma.user.upsert({
    where: { email: 'admin@pp.com' },
    update: {},
    create: {
      email: 'admin@pp.com',
      password: adminPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      profile: {
        create: {
          firstName: 'المدير',
          lastName: 'العام',
          phoneNumber: '+249123456789',
        }
      }
    },
    include: {
      profile: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'النظام',
          phoneNumber: '123456789',
        }
      }
    },
    include: {
      profile: true
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      password: userPassword,
      role: 'USER',
      adminLevel: 'USER',
      profile: {
        create: {
          firstName: 'مستخدم',
          lastName: 'عادي',
          phoneNumber: '987654321',
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('✅ Created users successfully:');
  console.log('  - Root Admin:', rootAdmin.email);
  console.log('  - Admin:', admin.email);
  console.log('  - User:', user.email);
  
  return { rootAdmin, admin, user };
}

async function main() {
  console.log('🚀 Starting user seeding...');
  try {
    await createUsers();
    console.log('✅ User seeding completed successfully!');
    console.log('');
    console.log('🔑 Admin Credentials:');
    console.log('   Email: admin@pp.com');
    console.log('   Password: admin123');
    console.log('');
  } catch (error) {
    console.error('❌ Error during user seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
