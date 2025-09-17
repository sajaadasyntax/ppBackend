const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateSubscriptions() {
  console.log('Starting cleanup of duplicate subscriptions...');
  
  try {
    // Find all active subscriptions grouped by userId and planId
    const duplicates = await prisma.$queryRaw`
      SELECT 
        "userId", 
        "planId", 
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY "createdAt" DESC) as subscription_ids
      FROM "Subscription" 
      WHERE status = 'active'
      GROUP BY "userId", "planId" 
      HAVING COUNT(*) > 1
    `;
    
    console.log(`Found ${duplicates.length} groups with duplicate subscriptions`);
    
    let totalDeleted = 0;
    
    for (const duplicate of duplicates) {
      const { userId, planId, count, subscription_ids } = duplicate;
      
      console.log(`Processing user ${userId}, plan ${planId}: ${count} duplicates`);
      
      // Keep the most recent subscription (first in the array since we ordered by createdAt DESC)
      const keepId = subscription_ids[0];
      const deleteIds = subscription_ids.slice(1);
      
      console.log(`Keeping subscription ${keepId}, deleting: ${deleteIds.join(', ')}`);
      
      // Delete the older duplicates
      const deleteResult = await prisma.subscription.deleteMany({
        where: {
          id: {
            in: deleteIds
          }
        }
      });
      
      totalDeleted += deleteResult.count;
      console.log(`Deleted ${deleteResult.count} duplicate subscriptions`);
    }
    
    console.log(`Cleanup completed. Total duplicates removed: ${totalDeleted}`);
    
    // Verify no duplicates remain
    const remainingDuplicates = await prisma.$queryRaw`
      SELECT 
        "userId", 
        "planId", 
        COUNT(*) as count
      FROM "Subscription" 
      WHERE status = 'active'
      GROUP BY "userId", "planId" 
      HAVING COUNT(*) > 1
    `;
    
    if (remainingDuplicates.length === 0) {
      console.log('✅ No duplicate subscriptions remain');
    } else {
      console.log(`⚠️  Warning: ${remainingDuplicates.length} duplicate groups still exist`);
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanupDuplicateSubscriptions()
    .then(() => {
      console.log('Cleanup script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupDuplicateSubscriptions };
