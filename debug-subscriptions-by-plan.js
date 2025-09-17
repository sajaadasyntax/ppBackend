const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSubscriptionsByPlan() {
  console.log('Debugging subscriptions by plan...');
  
  try {
    // Get all plans with their subscriptions
    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        subscriptions: {
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
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\nTotal plans found: ${plans.length}\n`);
    
    plans.forEach((plan, planIndex) => {
      console.log(`\n📋 Plan ${planIndex + 1}: ${plan.title} (ID: ${plan.id})`);
      console.log(`   Price: ${plan.price} ${plan.currency}`);
      console.log(`   Period: ${plan.period}`);
      console.log(`   Approved: ${plan.isApproved}`);
      console.log(`   Subscribers: ${plan.subscriptions.length}`);
      
      if (plan.subscriptions.length > 0) {
        console.log(`   \n   👥 Subscribers:`);
        plan.subscriptions.forEach((sub, subIndex) => {
          // Get user name
          let userName = 'Unknown';
          if (sub.user.memberDetails?.fullName) {
            userName = sub.user.memberDetails.fullName;
          } else if (sub.user.profile?.firstName || sub.user.profile?.lastName) {
            userName = `${sub.user.profile.firstName || ''} ${sub.user.profile.lastName || ''}`.trim();
          } else if (sub.user.email) {
            userName = sub.user.email;
          }
          
          console.log(`     ${subIndex + 1}. ${userName} (${sub.user.id})`);
          console.log(`        Amount: ${sub.amount} | Status: ${sub.status} | Payment: ${sub.paymentStatus}`);
          console.log(`        Dates: ${sub.startDate.toISOString().split('T')[0]} to ${sub.endDate.toISOString().split('T')[0]}`);
          console.log(`        Created: ${sub.createdAt.toISOString()}`);
        });
      }
    });
    
    // Check for users with multiple subscriptions to the same plan
    console.log(`\n🔍 Checking for duplicate subscriptions per plan:`);
    let hasDuplicates = false;
    
    plans.forEach(plan => {
      const userSubscriptions = {};
      
      plan.subscriptions.forEach(sub => {
        const userId = sub.userId;
        if (!userSubscriptions[userId]) {
          userSubscriptions[userId] = [];
        }
        userSubscriptions[userId].push(sub);
      });
      
      // Check for users with multiple subscriptions to this plan
      Object.keys(userSubscriptions).forEach(userId => {
        const userSubs = userSubscriptions[userId];
        if (userSubs.length > 1) {
          hasDuplicates = true;
          const userName = userSubs[0].user.memberDetails?.fullName || 
                          `${userSubs[0].user.profile?.firstName || ''} ${userSubs[0].user.profile?.lastName || ''}`.trim() ||
                          userSubs[0].user.email;
          
          console.log(`\n❌ User ${userName} has ${userSubs.length} subscriptions to plan "${plan.title}":`);
          userSubs.forEach((sub, index) => {
            console.log(`   ${index + 1}. ID: ${sub.id} | Status: ${sub.status} | Payment: ${sub.paymentStatus} | Created: ${sub.createdAt.toISOString()}`);
          });
        }
      });
    });
    
    if (!hasDuplicates) {
      console.log(`✅ No duplicate subscriptions found per plan`);
    }
    
  } catch (error) {
    console.error('Error debugging subscriptions by plan:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugSubscriptionsByPlan()
    .then(() => {
      console.log('\nDebug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSubscriptionsByPlan };
