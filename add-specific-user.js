const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createSpecificUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { 
        OR: [
          { email: '116461085@example.com' },
          { profile: { phoneNumber: '116461085' } }
        ]
      },
      include: { profile: true }
    });

    if (existingUser) {
      console.log('✅ User with ID 116461085 already exists');
      console.log('Email: 116461085@example.com');
      console.log('Password: 116461085');
      return;
    }

    // Create the specific user
    const hashedPassword = await bcrypt.hash('116461085', 10);
    
    const user = await prisma.user.create({
      data: {
        email: '116461085@example.com',
        password: hashedPassword,
        role: 'USER',
        profile: {
          create: {
            firstName: 'User',
            lastName: '116461085',
            phoneNumber: '116461085'
          }
        }
      },
      include: {
        profile: true
      }
    });

    console.log('✅ Specific user created successfully!');
    console.log('Email: 116461085@example.com');
    console.log('Password: 116461085');
    console.log('Phone: 116461085');
    console.log('User ID:', user.id);
    
  } catch (error) {
    console.error('❌ Error creating specific user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createSpecificUser();
