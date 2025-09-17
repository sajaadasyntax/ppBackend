const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUsers() {
  try {
    // Check for GENERAL_SECRETARIAT users
    const generalSecretariatUsers = await prisma.user.findMany({
      where: { adminLevel: 'GENERAL_SECRETARIAT' }
    });
    
    console.log('GENERAL_SECRETARIAT users:');
    generalSecretariatUsers.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`- Mobile: ${user.mobileNumber}`);
      console.log(`- Admin Level: ${user.adminLevel}`);
      console.log('---');
    });
    
    // Check for ADMIN users
    const adminUsers = await prisma.user.findMany({
      where: { adminLevel: 'ADMIN' }
    });
    
    console.log('\nADMIN users:');
    adminUsers.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`- Mobile: ${user.mobileNumber}`);
      console.log(`- Admin Level: ${user.adminLevel}`);
      console.log('---');
    });
    
    // Check all admin levels
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        mobileNumber: true,
        adminLevel: true,
        role: true
      }
    });
    
    console.log('\nAll users:');
    allUsers.forEach(user => {
      console.log(`- Email: ${user.email}`);
      console.log(`- Mobile: ${user.mobileNumber}`);
      console.log(`- Admin Level: ${user.adminLevel}`);
      console.log(`- Role: ${user.role}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();
