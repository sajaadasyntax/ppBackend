const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSubscriptions() {
  try {
    console.log('Creating test subscriptions...');
    
    // Get the approved plan
    const approvedPlan = await prisma.subscriptionPlan.findFirst({
      where: { isApproved: true }
    });
    
    if (!approvedPlan) {
      console.log('No approved plans found. Please approve a plan first.');
      return;
    }
    
    console.log(`Found approved plan: ${approvedPlan.title}`);
    
    // Get some users to subscribe
    const users = await prisma.user.findMany({
      where: { 
        role: 'USER',
        regionId: approvedPlan.targetRegionId // Users in the same region
      },
      take: 3
    });
    
    if (users.length === 0) {
      console.log('No users found in the target region. Creating some test users...');
      
      // Create a test user
      const testUser = await prisma.user.create({
        data: {
          email: 'testuser@example.com',
          mobileNumber: '+249123456999',
          password: 'hashedpassword',
          role: 'USER',
          adminLevel: 'USER',
          regionId: approvedPlan.targetRegionId,
          localityId: approvedPlan.targetLocalityId,
          profile: {
            create: {
              firstName: 'مستخدم',
              lastName: 'تجريبي',
              phoneNumber: '+249123456999'
            }
          }
        }
      });
      
      users.push(testUser);
    }
    
    console.log(`Found ${users.length} users to subscribe`);
    
    // Create subscriptions for each user
    for (const user of users) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year subscription
      
      const subscription = await prisma.subscription.create({
        data: {
          planId: approvedPlan.id,
          userId: user.id,
          startDate,
          endDate,
          amount: approvedPlan.price,
          paymentStatus: Math.random() > 0.5 ? 'paid' : 'pending',
          status: 'active',
          paymentMethod: Math.random() > 0.5 ? 'cash' : 'bank_transfer'
        }
      });
      
      console.log(`Created subscription for user ${user.email}: ${subscription.id}`);
    }
    
    console.log('Test subscriptions created successfully!');
    
  } catch (error) {
    console.error('Error creating test subscriptions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSubscriptions();
