const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestReport() {
  try {
    // Find the test user
    const user = await prisma.user.findFirst({
      where: {
        email: '116461085@example.com'
      }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('✅ Found user:', user.id);

    // Create a test report for this user
    const report = await prisma.report.create({
      data: {
        userId: user.id,
        title: 'تقرير اختبار',
        type: 'general',
        description: 'هذا تقرير اختبار تم إنشاؤه تلقائيًا',
        date: new Date(),
        status: 'pending'
      }
    });

    console.log('✅ Test report created successfully:', report);

    // Count all reports for this user
    const reportCount = await prisma.report.count({
      where: {
        userId: user.id
      }
    });

    console.log(`✅ User now has ${reportCount} reports`);
    
  } catch (error) {
    console.error('❌ Error creating test report:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestReport();
