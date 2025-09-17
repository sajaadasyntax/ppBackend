const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Migration script to add mobile numbers to existing users
 * This script generates Sudanese mobile numbers for users who don't have them
 */

async function migrateMobileNumbers() {
  console.log('Starting mobile number migration...');
  
  try {
    // Get all users without mobile numbers
    const usersWithoutMobile = await prisma.user.findMany({
      where: {
        mobileNumber: null
      },
      include: {
        profile: true
      }
    });
    
    console.log(`Found ${usersWithoutMobile.length} users without mobile numbers`);
    
    for (const user of usersWithoutMobile) {
      let mobileNumber;
      
      // Try to use phone number from profile if available
      if (user.profile?.phoneNumber) {
        mobileNumber = user.profile.phoneNumber;
        // Ensure it starts with +249 for Sudanese numbers
        if (!mobileNumber.startsWith('+249') && !mobileNumber.startsWith('249')) {
          if (mobileNumber.startsWith('0')) {
            mobileNumber = '+249' + mobileNumber.substring(1);
          } else {
            mobileNumber = '+249' + mobileNumber;
          }
        } else if (mobileNumber.startsWith('249')) {
          mobileNumber = '+' + mobileNumber;
        }
      } else {
        // Generate a random Sudanese mobile number
        const randomNumber = Math.floor(Math.random() * 90000000) + 10000000; // 8-digit number
        mobileNumber = '+249' + randomNumber;
      }
      
      // Check if this mobile number already exists
      const existingUser = await prisma.user.findUnique({
        where: { mobileNumber }
      });
      
      if (existingUser) {
        // If mobile number exists, generate a unique one
        let uniqueNumber;
        let counter = 1;
        do {
          const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
          uniqueNumber = '+249' + randomNumber;
          counter++;
        } while (await prisma.user.findUnique({ where: { mobileNumber: uniqueNumber } }) && counter < 100);
        
        mobileNumber = uniqueNumber;
      }
      
      // Update the user with mobile number
      await prisma.user.update({
        where: { id: user.id },
        data: { mobileNumber }
      });
      
      console.log(`Updated user ${user.email} with mobile number: ${mobileNumber}`);
    }
    
    console.log('Mobile number migration completed successfully!');
    
    // Display summary
    const totalUsers = await prisma.user.count();
    const usersWithMobile = await prisma.user.count({
      where: {
        mobileNumber: { not: null }
      }
    });
    
    console.log(`\nMigration Summary:`);
    console.log(`Total users: ${totalUsers}`);
    console.log(`Users with mobile numbers: ${usersWithMobile}`);
    console.log(`Migration successful: ${usersWithMobile === totalUsers ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateMobileNumbers()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  });
