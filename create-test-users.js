const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createUsers() {
  try {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: adminPassword,
        role: 'ADMIN'
      },
      create: {
        email: 'admin@example.com',
        password: adminPassword,
        role: 'ADMIN',
        profile: {
          create: {
            firstName: 'مدير',
            lastName: 'النظام',
            phoneNumber: '123456789'
          }
        }
      }
    });
    console.log('Admin user created/updated:', admin);

    // Create regular user
    const userPassword = await bcrypt.hash('user123', 10);
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {
        password: userPassword,
        role: 'USER'
      },
      create: {
        email: 'user@example.com',
        password: userPassword,
        role: 'USER',
        profile: {
          create: {
            firstName: 'مستخدم',
            lastName: 'عادي',
            phoneNumber: '987654321'
          }
        }
      }
    });
    console.log('Regular user created/updated:', user);

    console.log('\nLogin credentials:');
    console.log('Admin - Email: admin@example.com, Password: admin123');
    console.log('User - Email: user@example.com, Password: user123');
    
  } catch (error) {
    console.error('Error creating users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createUsers();
