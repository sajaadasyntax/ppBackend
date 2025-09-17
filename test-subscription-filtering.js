const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testSubscriptionFiltering() {
  console.log('Testing subscription filtering by planId...');
  
  try {
    // Get all plans
    const plans = await prisma.subscriptionPlan.findMany({
      select: {
        id: true,
        title: true
      }
    });
    
    console.log(`\nFound ${plans.length} plans:`);
    plans.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.title} (ID: ${plan.id})`);
    });
    
    // Test filtering for each plan
    for (const plan of plans) {
      console.log(`\n🔍 Testing plan: ${plan.title}`);
      
      const subscriptions = await prisma.subscription.findMany({
        where: {
          planId: plan.id
        },
        include: {
          user: {
            select: {
              id: true,
              memberDetails: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      });
      
      console.log(`   Found ${subscriptions.length} subscriptions for this plan:`);
      subscriptions.forEach((sub, index) => {
        const userName = sub.user.memberDetails?.fullName || 'Unknown';
        console.log(`   ${index + 1}. ${userName} (${sub.user.id}) - Amount: ${sub.amount} - Status: ${sub.status}`);
      });
    }
    
  } catch (error) {
    console.error('Error testing subscription filtering:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSubscriptionFiltering()
    .then(() => {
      console.log('\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSubscriptionFiltering };
