const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSubscriptions() {
  console.log('Debugging subscription data...');
  
  try {
    // Get all subscriptions with user and plan details
    const subscriptions = await prisma.subscription.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        },
        plan: {
          select: {
            id: true,
            title: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\nTotal subscriptions found: ${subscriptions.length}\n`);
    
    // Group by user name to see potential duplicates
    const userGroups = {};
    subscriptions.forEach(sub => {
      // Get user name from profile or memberDetails
      let userName = 'Unknown';
      if (sub.user.memberDetails?.fullName) {
        userName = sub.user.memberDetails.fullName;
      } else if (sub.user.profile?.firstName || sub.user.profile?.lastName) {
        userName = `${sub.user.profile.firstName || ''} ${sub.user.profile.lastName || ''}`.trim();
      } else if (sub.user.email) {
        userName = sub.user.email;
      }
      
      if (!userGroups[userName]) {
        userGroups[userName] = [];
      }
      userGroups[userName].push(sub);
    });
    
    // Show groups with multiple subscriptions
    Object.keys(userGroups).forEach(userName => {
      const userSubs = userGroups[userName];
      if (userSubs.length > 1) {
        console.log(`\n👤 User: ${userName} (${userSubs.length} subscriptions)`);
        userSubs.forEach((sub, index) => {
          console.log(`  ${index + 1}. Plan: ${sub.plan.title} | Amount: ${sub.amount} | Status: ${sub.status} | Payment: ${sub.paymentStatus} | User ID: ${sub.user.id} | Created: ${sub.createdAt}`);
        });
      }
    });
    
    // Check for exact duplicates (same user ID + plan ID + status)
    const duplicateGroups = {};
    subscriptions.forEach(sub => {
      const key = `${sub.userId}-${sub.planId}-${sub.status}`;
      if (!duplicateGroups[key]) {
        duplicateGroups[key] = [];
      }
      duplicateGroups[key].push(sub);
    });
    
    console.log('\n🔍 Checking for exact duplicates (same user + plan + status):');
    let hasDuplicates = false;
    Object.keys(duplicateGroups).forEach(key => {
      const group = duplicateGroups[key];
      if (group.length > 1) {
        hasDuplicates = true;
        // Get user name
        let userName = 'Unknown';
        if (group[0].user.memberDetails?.fullName) {
          userName = group[0].user.memberDetails.fullName;
        } else if (group[0].user.profile?.firstName || group[0].user.profile?.lastName) {
          userName = `${group[0].user.profile.firstName || ''} ${group[0].user.profile.lastName || ''}`.trim();
        } else if (group[0].user.email) {
          userName = group[0].user.email;
        }
        console.log(`\n❌ Duplicate found: User ${userName} - Plan ${group[0].plan.title} - Status ${group[0].status}`);
        group.forEach((sub, index) => {
          console.log(`  ${index + 1}. ID: ${sub.id} | Created: ${sub.createdAt} | Amount: ${sub.amount}`);
        });
      }
    });
    
    if (!hasDuplicates) {
      console.log('✅ No exact duplicates found');
    }
    
    // Show status distribution
    const statusCounts = {};
    subscriptions.forEach(sub => {
      statusCounts[sub.status] = (statusCounts[sub.status] || 0) + 1;
    });
    
    console.log('\n📊 Status distribution:');
    Object.keys(statusCounts).forEach(status => {
      console.log(`  ${status}: ${statusCounts[status]} subscriptions`);
    });
    
  } catch (error) {
    console.error('Error debugging subscriptions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugSubscriptions()
    .then(() => {
      console.log('\nDebug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSubscriptions };
