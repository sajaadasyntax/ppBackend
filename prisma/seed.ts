import { PrismaClient, AdminLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in environment variables.');
  console.error(`   Looking for .env file at: ${envPath}`);
  process.exit(1);
}

// Use standard PrismaClient (no pg adapter) - avoids driver adapter column resolution issues
const prisma = new PrismaClient({
  log: ['warn', 'error'],
  errorFormat: 'pretty'
});

async function createRootAdmin() {
  console.log('🌱 Creating root admin...');
  const adminPassword = await bcrypt.hash('admin123', 10);

  const rootAdmin = await prisma.user.upsert({
    where: { mobileNumber: '+249123456789' },
    update: {},
    create: {
      email: 'admin@pp.com',
      mobileNumber: '+249123456789',
      password: adminPassword,
      role: 'ADMIN',
      adminLevel: AdminLevel.ADMIN,
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

  console.log('✅ Root admin created:', rootAdmin.mobileNumber);
  return rootAdmin;
}

async function main() {
  console.log('🚀 Starting database seed...');
  try {
    await createRootAdmin();
    console.log('\n✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
