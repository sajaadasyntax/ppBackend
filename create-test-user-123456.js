const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user with password 123456...');
    
    // Create hashed password
    const hashedPassword = await bcrypt.hash('123456', 10);
    console.log('Generated hash:', hashedPassword);
    
    // Create or update the test user
    const testUser = await prisma.user.upsert({
      where: { email: 'test@example.com' },
      update: {
        password: hashedPassword
      },
      create: {
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
        profile: {
          create: {
            firstName: 'مستخدم',
            lastName: 'اختبار',
            phoneNumber: '912305441',
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('Test user created/updated successfully:', {
      id: testUser.id,
      email: testUser.email,
      phone: testUser.profile?.phoneNumber,
      passwordHash: hashedPassword
    });

    return testUser;
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser()
  .then(() => console.log('Script completed'))
  .catch(e => console.error(e));
