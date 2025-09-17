const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSubscriptions() {
  try {
    // Check subscription plans
    const plans = await prisma.subscriptionPlan.findMany();
    console.log('Subscription Plans found:', plans.length);
    plans.forEach(plan => {
      console.log(`- Plan: ${plan.title} (ID: ${plan.id})`);
      console.log(`  Target: Region=${plan.targetRegionId}, Locality=${plan.targetLocalityId}`);
      console.log(`  Approved: ${plan.isApproved}, Active: ${plan.active}`);
    });
    
    console.log('\n');
    
    // Check actual subscriptions
    const subscriptions = await prisma.subscription.findMany();
    console.log('Subscriptions found:', subscriptions.length);
    if (subscriptions.length > 0) {
      subscriptions.forEach(sub => {
        console.log(`- Subscription ID: ${sub.id}`);
        console.log(`  Plan ID: ${sub.planId}`);
        console.log(`  User ID: ${sub.userId}`);
        console.log(`  Status: ${sub.status}, Payment: ${sub.paymentStatus}`);
      });
    } else {
      console.log('No subscriptions found in database');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSubscriptions();
