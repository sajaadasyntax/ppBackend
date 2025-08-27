const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.user.create({
      data: {
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
      },
      include: {
        profile: true
      }
    });
    
    console.log('Admin user created successfully:');
    console.log(`ID: ${admin.id}, Email: ${admin.email}, Role: ${admin.role}`);
  } catch (e) {
    console.error('Error creating admin user:', e);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
