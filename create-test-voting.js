const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestVoting() {
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

    // Create test voting items
    const votingItem1 = await prisma.votingItem.create({
      data: {
        title: "التصويت على المشروع التنموي الجديد",
        description: "اختيار أحد المشاريع التنموية المقترحة للحي",
        options: JSON.stringify([
          { id: "opt1", text: "مشروع المركز الثقافي" },
          { id: "opt2", text: "مشروع التشجير" },
          { id: "opt3", text: "مشروع الملاعب الرياضية" }
        ]),
        startDate: new Date(),
        endDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
        targetLevel: "الحي",
        createdById: user.id,
        published: true
      }
    });

    console.log('✅ Test voting item 1 created successfully:', votingItem1);

    // Add some votes to the first option
    const vote1 = await prisma.vote.create({
      data: {
        votingId: votingItem1.id,
        userId: user.id,
        optionId: "opt1"
      }
    });

    console.log('✅ Vote added for option 1');

    const votingItem2 = await prisma.votingItem.create({
      data: {
        title: "التصويت على ميزانية التعليم",
        description: "تحديد نسبة توزيع ميزانية التعليم على المناطق المختلفة",
        options: JSON.stringify([
          { id: "opt1", text: "80% مناطق نائية، 20% مدن" },
          { id: "opt2", text: "70% مناطق نائية، 30% مدن" },
          { id: "opt3", text: "60% مناطق نائية، 40% مدن" }
        ]),
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        endDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        targetLevel: "الوحدة الإدارية",
        createdById: user.id,
        published: true
      }
    });

    console.log('✅ Test voting item 2 created successfully:', votingItem2);

    // Count all voting items
    const votingCount = await prisma.votingItem.count();
    console.log(`✅ Total voting items: ${votingCount}`);
    
  } catch (error) {
    console.error('❌ Error creating test voting items:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestVoting();
