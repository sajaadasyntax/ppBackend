const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createGeneralSecretariat() {
  try {
    console.log('Creating GENERAL_SECRETARIAT user...');
    
    const password = await bcrypt.hash('admin123', 10);
    
    const generalSecretariat = await prisma.user.upsert({
      where: { email: 'general.secretariat@pp.com' },
      update: {
        adminLevel: 'GENERAL_SECRETARIAT',
        role: 'ADMIN'
      },
      create: {
        email: 'general.secretariat@pp.com',
        mobileNumber: '+249123456788',
        password: password,
        role: 'ADMIN',
        adminLevel: 'GENERAL_SECRETARIAT',
        profile: {
          create: {
            firstName: 'الأمانة',
            lastName: 'العامة',
            phoneNumber: '+249123456788',
          }
        }
      },
      include: {
        profile: true
      }
    });
    
    console.log('✅ GENERAL_SECRETARIAT user created/updated:');
    console.log(`- Email: ${generalSecretariat.email}`);
    console.log(`- Mobile: ${generalSecretariat.mobileNumber}`);
    console.log(`- Admin Level: ${generalSecretariat.adminLevel}`);
    console.log(`- Password: admin123`);
    
  } catch (error) {
    console.error('Error creating GENERAL_SECRETARIAT user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createGeneralSecretariat();
