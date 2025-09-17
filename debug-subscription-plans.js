const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugSubscriptionPlans() {
  console.log('Debugging subscription plans data structure...');
  
  try {
    // Get all subscription plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        active: true
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        subscriptions: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\nFound ${plans.length} subscription plans:`);
    
    plans.forEach((plan, index) => {
      console.log(`\n${index + 1}. Plan ID: ${plan.id}`);
      console.log(`   Title: ${plan.title}`);
      console.log(`   Description: ${plan.description || 'No description'}`);
      console.log(`   Price: ${plan.price}`);
      console.log(`   Currency: ${plan.currency}`);
      console.log(`   Period: ${plan.period}`);
      console.log(`   Is Donation: ${plan.isDonation}`);
      console.log(`   Is Approved: ${plan.isApproved}`);
      console.log(`   Active: ${plan.active}`);
      console.log(`   Created At: ${plan.createdAt}`);
      console.log(`   Subscriptions Count: ${plan.subscriptions.length}`);
      
      // Show first few subscriptions for this plan
      if (plan.subscriptions.length > 0) {
        console.log(`   Sample Subscriptions:`);
        plan.subscriptions.slice(0, 2).forEach((sub, subIndex) => {
          console.log(`     ${subIndex + 1}. User ID: ${sub.userId}, Amount: ${sub.amount}, Status: ${sub.status}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error debugging subscription plans:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug if this script is executed directly
if (require.main === module) {
  debugSubscriptionPlans()
    .then(() => {
      console.log('\n✅ Debug completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugSubscriptionPlans };
