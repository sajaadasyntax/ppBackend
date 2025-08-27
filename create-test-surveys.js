const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestSurveys() {
  try {
    // Create public surveys
    const publicSurvey1 = await prisma.survey.create({
      data: {
        title: "استبيان رضا المواطنين عن الخدمات العامة",
        description: "استبيان لقياس مستوى رضا المواطنين عن الخدمات العامة المقدمة في المنطقة",
        dueDate: new Date(2024, 5, 30), // June 30, 2024
        questions: JSON.stringify([
          {
            id: "q1",
            text: "ما هو تقييمك العام لجودة الخدمات العامة؟",
            type: "rating",
            options: ["1", "2", "3", "4", "5"]
          },
          {
            id: "q2",
            text: "ما هي أكثر الخدمات التي تحتاج إلى تحسين؟",
            type: "multiple_choice",
            options: ["الصحة", "التعليم", "النقل", "البنية التحتية", "الخدمات الإلكترونية"]
          }
        ]),
        published: true
      }
    });

    const publicSurvey2 = await prisma.survey.create({
      data: {
        title: "استبيان الاحتياجات المجتمعية",
        description: "استبيان لتحديد الاحتياجات المجتمعية الأكثر إلحاحاً للسنة المقبلة",
        dueDate: new Date(2024, 6, 15), // July 15, 2024
        questions: JSON.stringify([
          {
            id: "q1",
            text: "ما هي أهم القضايا التي تواجه المجتمع حالياً؟",
            type: "multiple_choice",
            options: ["البطالة", "التعليم", "الصحة", "الإسكان", "البيئة"]
          },
          {
            id: "q2",
            text: "ما هي المشاريع التي ترى أنها يجب أن تكون ذات أولوية؟",
            type: "text"
          }
        ]),
        published: true
      }
    });

    // Create member surveys
    const memberSurvey1 = await prisma.survey.create({
      data: {
        title: "استبيان تطوير الخدمات الإلكترونية",
        description: "استبيان خاص بالأعضاء لتقييم واقتراح تحسينات على الخدمات الإلكترونية المقدمة",
        dueDate: new Date(2024, 5, 20), // June 20, 2024
        questions: JSON.stringify([
          {
            id: "q1",
            text: "ما هو تقييمك لسهولة استخدام المنصة الإلكترونية؟",
            type: "rating",
            options: ["1", "2", "3", "4", "5"]
          },
          {
            id: "q2",
            text: "ما هي الميزات التي ترغب في إضافتها للمنصة؟",
            type: "text"
          }
        ]),
        published: true
      }
    });

    const memberSurvey2 = await prisma.survey.create({
      data: {
        title: "استبيان تقييم البرامج التدريبية",
        description: "استبيان لتقييم البرامج التدريبية التي تم تقديمها للأعضاء خلال الستة أشهر الماضية",
        dueDate: new Date(2024, 5, 25), // June 25, 2024
        questions: JSON.stringify([
          {
            id: "q1",
            text: "ما هو تقييمك للبرامج التدريبية التي حضرتها؟",
            type: "rating",
            options: ["1", "2", "3", "4", "5"]
          },
          {
            id: "q2",
            text: "ما هي المواضيع التي ترغب في تغطيتها في البرامج المستقبلية؟",
            type: "multiple_choice",
            options: ["القيادة", "التقنية", "المهارات الشخصية", "إدارة المشاريع", "أخرى"]
          }
        ]),
        published: true
      }
    });

    console.log('✅ Test surveys created successfully:');
    console.log('Public Survey 1:', publicSurvey1.id);
    console.log('Public Survey 2:', publicSurvey2.id);
    console.log('Member Survey 1:', memberSurvey1.id);
    console.log('Member Survey 2:', memberSurvey2.id);
    
  } catch (error) {
    console.error('❌ Error creating test surveys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestSurveys();
