const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createUsers() {
  console.log('Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Create root admin with specified credentials
  const rootAdmin = await prisma.user.upsert({
    where: { email: 'admin@pp.com' },
    update: {},
    create: {
      email: 'admin@pp.com',
      mobileNumber: '+249123456789',
      password: adminPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      profile: {
        create: {
          firstName: 'المدير',
          lastName: 'العام',
          phoneNumber: '+249123456789',
        }
      }
    },
    include: {
      profile: true
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      mobileNumber: '+249123456790',
      password: adminPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'النظام',
          phoneNumber: '+249123456790',
        }
      }
    },
    include: {
      profile: true
    }
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      mobileNumber: '+249987654321',
      password: userPassword,
      role: 'USER',
      adminLevel: 'USER',
      profile: {
        create: {
          firstName: 'مستخدم',
          lastName: 'عادي',
          phoneNumber: '+249987654321',
        }
      }
    },
    include: {
      profile: true
    }
  });

  console.log('Created users:', { 
    rootAdmin: rootAdmin.email, 
    admin: admin.email, 
    user: user.email 
  });
  return { rootAdmin, admin, user };
}

async function createBulletins(regions) {
  console.log('Creating bulletins...');
  
  // Get the first region (Khartoum) for seeding bulletins
  const khartoumRegion = regions.find(r => r.name === 'الخرطوم');
  const bahriLocality = khartoumRegion?.localities?.find(l => l.name === 'محلية بحري');
  
  const bulletins = [
    {
      title: "تطورات الأزمة السياسية في السودان",
      content: "استمرار المحادثات بين الأطراف السياسية في السودان للتوصل إلى حل للأزمة السياسية الحالية. ممثلو القوى السياسية يجتمعون في جدة لمناقشة خارطة الطريق للانتقال الديمقراطي.",
      date: new Date('2024-04-01'),
      image: "/images/news1.png",
      published: true,
      targetRegionId: khartoumRegion.id, // Target entire Khartoum region
    },
    {
      title: "اجتماعات القمة العربية في السودان",
      content: "استعدادات مكثفة في الخرطوم لاستضافة القمة العربية المقبلة. القادة العرب سيناقشون قضايا المنطقة وأهمها الأزمة السودانية والعلاقات العربية-الإفريقية.",
      date: new Date('2024-03-25'),
      image: "/images/news2.png",
      published: true,
      targetRegionId: khartoumRegion.id, // Target entire Khartoum region
    },
    {
      title: "تطورات عملية السلام في دارفور",
      content: "تقدم ملحوظ في مفاوضات السلام في دارفور. الأطراف الموقعة على اتفاقية جوبا تبدأ تنفيذ المرحلة الثانية من الاتفاقية وسط تأكيدات دولية بدعم عملية السلام.",
      date: new Date('2024-03-15'),
      image: "/images/news3.png",
      published: true,
      targetRegionId: regions.find(r => r.name === 'شمال دارفور')?.id || khartoumRegion.id, // Target Darfur region
    },
  ];

  for (const bulletin of bulletins) {
    await prisma.bulletin.create({
      data: bulletin
    });
  }

  console.log(`Created ${bulletins.length} bulletins`);
}

async function createArchiveDocuments() {
  console.log('Creating archive documents...');
  const archiveDocuments = [
    {
      title: "النظام الأساسي للمؤسسة",
      type: "PDF",
      category: "وثائق قانونية",
      date: new Date('2023-01-15'),
      size: "1.2 MB",
      url: "/documents/statute.pdf",
      published: true,
    },
    {
      title: "التقرير السنوي 2023",
      type: "PDF",
      category: "تقارير",
      date: new Date('2024-01-30'),
      size: "3.5 MB",
      url: "/documents/annual-report-2023.pdf",
      published: true,
    },
    {
      title: "محضر اجتماع الجمعية العمومية",
      type: "DOCX",
      category: "محاضر اجتماعات",
      date: new Date('2023-12-10'),
      size: "0.8 MB",
      url: "/documents/meeting-minutes.docx",
      published: true,
    },
    {
      title: "الخطة الاستراتيجية 2024-2026",
      type: "PDF",
      category: "خطط استراتيجية",
      date: new Date('2024-02-20'),
      size: "2.1 MB",
      url: "/documents/strategic-plan.pdf",
      published: true,
    },
    {
      title: "الميزانية التقديرية 2024",
      type: "XLSX",
      category: "ميزانيات",
      date: new Date('2024-03-05'),
      size: "1.5 MB",
      url: "/documents/budget-2024.xlsx",
      published: true,
    },
  ];

  for (const document of archiveDocuments) {
    await prisma.archiveDocument.create({
      data: document
    });
  }

  console.log(`Created ${archiveDocuments.length} archive documents`);
}

async function createSurveys(regions) {
  console.log('Creating surveys...');
  
  // Get the first region (Khartoum) for seeding surveys
  const khartoumRegion = regions.find(r => r.name === 'الخرطوم');
  
  const surveys = [
    {
      title: "استطلاع رأي حول الخدمات البلدية",
      description: "استطلاع لتقييم مستوى رضا المواطنين عن الخدمات البلدية المقدمة",
      dueDate: new Date('2024-05-15'),
      targetRegionId: khartoumRegion.id, // Target Khartoum region
      questions: JSON.stringify([
        {
          id: "1",
          text: "ما مدى رضاك عن خدمات النظافة في منطقتك؟",
          type: "rating",
          options: ["سيء جداً", "سيء", "متوسط", "جيد", "ممتاز"],
        },
        {
          id: "2",
          text: "ما هي أكثر الخدمات البلدية التي تحتاج إلى تحسين؟",
          type: "checkbox",
          options: ["النظافة", "الإنارة", "الطرق", "الحدائق", "التشجير", "أخرى"],
        },
      ]),
      published: true,
    },
    {
      title: "استطلاع حول المشاريع المستقبلية للحي",
      description: "استطلاع لتحديد أولويات المشاريع التطويرية في الأحياء",
      dueDate: new Date('2024-04-30'),
      targetRegionId: khartoumRegion.id, // Target Khartoum region
      questions: JSON.stringify([
        {
          id: "1",
          text: "أي من المشاريع التالية تعتقد أنها ذات أولوية قصوى؟",
          type: "radio",
          options: ["تطوير الحدائق", "إنشاء مراكز شبابية", "تحسين الطرق", "زيادة مواقف السيارات"],
        },
        {
          id: "2",
          text: "ما هي اقتراحاتك لتحسين الخدمات في الحي؟",
          type: "text",
        },
      ]),
      published: true,
    },
  ];

  for (const survey of surveys) {
    await prisma.survey.create({
      data: survey
    });
  }

  console.log(`Created ${surveys.length} surveys`);
}

async function createVotingItems(adminId, regions) {
  console.log('Creating voting items...');
  
  // Get the first region (Khartoum) for seeding voting items
  const khartoumRegion = regions.find(r => r.name === 'الخرطوم');
  
  const votingItems = [
    {
      title: "التصويت على موقع الحديقة الجديدة",
      description: "اختر الموقع المفضل لإنشاء الحديقة الجديدة في الحي",
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-04-30'),
      options: JSON.stringify([
        { id: "1", text: "شارع النخيل" },
        { id: "2", text: "تقاطع شارع الملك فهد" },
        { id: "3", text: "بجانب المدرسة الابتدائية" },
      ]),
      targetLevel: "الحي",
      targetRegionId: khartoumRegion.id, // Target Khartoum region
      createdById: adminId,
      published: true,
    },
    {
      title: "مواعيد فعاليات الحي الشهرية",
      description: "اختر الوقت المناسب لإقامة الفعاليات الشهرية",
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-04-15'),
      options: JSON.stringify([
        { id: "1", text: "الجمعة مساءً" },
        { id: "2", text: "السبت صباحاً" },
        { id: "3", text: "السبت مساءً" },
      ]),
      targetLevel: "الحي",
      targetRegionId: khartoumRegion.id, // Target Khartoum region
      createdById: adminId,
      published: true,
    },
  ];

  for (const votingItem of votingItems) {
    await prisma.votingItem.create({
      data: votingItem
    });
  }

  console.log(`Created ${votingItems.length} voting items`);
}

async function createSubscriptionPlans() {
  console.log('Creating subscription plans...');
  const subscriptionPlans = [
    {
      title: "اشتراك سنوي - الخدمات الكاملة",
      price: "450",
      currency: "جنيه",
      period: "سنة كاملة",
      features: JSON.stringify([
        "الوصول إلى النشرة الدورية",
        "التصويت في جميع الاستطلاعات",
        "حضور الفعاليات الحصرية",
        "المشاركة في صنع القرار",
        "الوصول إلى أرشيف المستندات"
      ]),
      active: true,
    },
    {
      title: "اشتراك فصلي - الخدمات المتوسطة",
      price: "120",
      currency: "جنيه",
      period: "ثلاثة أشهر",
      features: JSON.stringify([
        "الوصول إلى النشرة الدورية",
        "التصويت في معظم الاستطلاعات",
        "حضور بعض الفعاليات الحصرية",
        "الوصول إلى معظم المستندات في الأرشيف"
      ]),
      active: true,
    },
    {
      title: "اشتراك شهري - الخدمات الأساسية",
      price: "50",
      currency: "جنيه",
      period: "شهر واحد",
      features: JSON.stringify([
        "الوصول إلى النشرة الدورية",
        "التصويت في بعض الاستطلاعات",
        "الوصول إلى بعض المستندات في الأرشيف"
      ]),
      active: true,
    },
  ];

  const createdPlans = [];
  for (const plan of subscriptionPlans) {
    const createdPlan = await prisma.subscriptionPlan.create({
      data: plan
    });
    createdPlans.push(createdPlan);
  }

  console.log(`Created ${subscriptionPlans.length} subscription plans`);
  return createdPlans;
}

async function createSubscription(userId, planId, regions) {
  console.log('Creating subscription...');
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  
  // Get the first region (Khartoum) for seeding subscription
  const khartoumRegion = regions.find(r => r.name === 'الخرطوم');

  await prisma.subscription.create({
    data: {
      userId: userId,
      planId: planId,
      startDate,
      endDate,
      status: "active",
      // Note: Subscriptions might not need hierarchy targeting like content does
    }
  });

  console.log(`Created active subscription for user ${userId}`);
}

async function createSudanAdministrativeHierarchy() {
  console.log('Creating Sudan administrative hierarchy...');
  
  // Sudan administrative hierarchy data based on current 18 states
  const sudanData = [
    {
      name: "الخرطوم",
      nameEn: "Khartoum",
      code: "KH",
      localities: [
        {
          name: "محلية الخرطوم",
          code: "KH01",
          adminUnits: [
            { name: "الخرطوم شرق", districts: ["الجريف شرق", "الموردة", "الصباحي"] },
            { name: "الخرطوم وسط", districts: ["الوسط", "الشهداء", "الثورة"] },
            { name: "الخرطوم غرب", districts: ["الريف الغربي", "الأزهري", "الصوفية"] }
          ]
        },
        {
          name: "محلية أم درمان",
          code: "KH02",
          adminUnits: [
            { name: "أم درمان شرق", districts: ["العرب", "الموجه", "الصالحة"] },
            { name: "أم درمان غرب", districts: ["الثورة", "ود البشير", "الحلة الجديدة"] },
            { name: "أم درمان شمال", districts: ["كرري", "الحلفايا", "الشجرة"] }
          ]
        },
        {
          name: "محلية بحري",
          code: "KH03",
          adminUnits: [
            { name: "بحري شرق", districts: ["الخرطوم بحري", "الكدرو", "اليرموك"] },
            { name: "بحري غرب", districts: ["شرق النيل", "الحلفايا الجديدة", "الساحة الخضراء"] }
          ]
        },
        {
          name: "محلية شرق النيل",
          code: "KH04",
          adminUnits: [
            { name: "شرق النيل الريفية", districts: ["الصبابي", "الرفاعة", "أم القرى"] }
          ]
        },
        {
          name: "محلية أم بدة",
          code: "KH05",
          adminUnits: [
            { name: "أم بدة المدينة", districts: ["أم بدة", "السوق", "المنطقة الصناعية"] },
            { name: "أم بدة الريف", districts: ["العيلفون", "المهيرة", "الصباحي"] }
          ]
        },
        {
          name: "محلية جبل أولياء",
          code: "KH06",
          adminUnits: [
            { name: "جبل أولياء", districts: ["جبل أولياء", "أبو سعد", "القلعة"] }
          ]
        }
      ]
    },
    {
      name: "شمال كردفان",
      nameEn: "North Kordofan",
      code: "NK",
      localities: [
        {
          name: "محلية الأبيض",
          code: "NK01",
          adminUnits: [
            { name: "الأبيض المدينة", districts: ["الأبيض", "السوق الكبير", "الهلالية"] },
            { name: "الأبيض الريف", districts: ["بارا", "أم روابة", "الدبة"] }
          ]
        },
        {
          name: "محلية بارا",
          code: "NK02",
          adminUnits: [
            { name: "بارا", districts: ["بارا", "كلوقي", "أبو زبد"] }
          ]
        },
        {
          name: "محلية سودري",
          code: "NK03",
          adminUnits: [
            { name: "سودري", districts: ["سودري", "أم دم حاج أحمد", "الخوي"] }
          ]
        }
      ]
    },
    {
      name: "الشمالية",
      nameEn: "Northern",
      code: "NO",
      localities: [
        {
          name: "محلية دنقلا",
          code: "NO01",
          adminUnits: [
            { name: "دنقلا", districts: ["دنقلا", "الدبة", "كرمة"] },
            { name: "الريف الشمالي", districts: ["مروي", "البركل", "أم درمان"] }
          ]
        },
        {
          name: "محلية حلفا",
          code: "NO02",
          adminUnits: [
            { name: "وادي حلفا", districts: ["وادي حلفا", "أبري", "الديوان"] }
          ]
        },
        {
          name: "محلية مروي",
          code: "NO03",
          adminUnits: [
            { name: "مروي", districts: ["مروي", "البركل", "نوري"] }
          ]
        }
      ]
    },
    {
      name: "كسلا",
      nameEn: "Kassala",
      code: "KS",
      localities: [
        {
          name: "محلية كسلا",
          code: "KS01",
          adminUnits: [
            { name: "كسلا المدينة", districts: ["كسلا", "الحتانة", "الجيرف"] },
            { name: "كسلا الريف", districts: ["حلفا الجديدة", "التليفون", "الفشقة"] }
          ]
        },
        {
          name: "محلية نهر عطبرة",
          code: "KS02",
          adminUnits: [
            { name: "عطبرة", districts: ["عطبرة", "الدامر", "البحر"] }
          ]
        }
      ]
    },
    {
      name: "النيل الأزرق",
      nameEn: "Blue Nile",
      code: "BN",
      localities: [
        {
          name: "محلية الدمازين",
          code: "BN01",
          adminUnits: [
            { name: "الدمازين", districts: ["الدمازين", "الروصيرص", "قيسان"] }
          ]
        },
        {
          name: "محلية قيسان",
          code: "BN02",
          adminUnits: [
            { name: "قيسان", districts: ["قيسان", "الكرمك", "باو"] }
          ]
        }
      ]
    },
    {
      name: "شمال دارفور",
      nameEn: "North Darfur",
      code: "ND",
      localities: [
        {
          name: "محلية الفاشر",
          code: "ND01",
          adminUnits: [
            { name: "الفاشر", districts: ["الفاشر", "الطينة", "السريف"] }
          ]
        },
        {
          name: "محلية كتم",
          code: "ND02",
          adminUnits: [
            { name: "كتم", districts: ["كتم", "طويلة", "كبكابية"] }
          ]
        },
        {
          name: "محلية مليط",
          code: "ND03",
          adminUnits: [
            { name: "مليط", districts: ["مليط", "إل صريف", "أم كدادة"] }
          ]
        }
      ]
    },
    {
      name: "جنوب دارفور",
      nameEn: "South Darfur",
      code: "SD",
      localities: [
        {
          name: "محلية نيالا",
          code: "SD01",
          adminUnits: [
            { name: "نيالا الكبرى", districts: ["نيالا", "الجنينة", "كاس"] },
            { name: "نيالا الريف", districts: ["مرشنج", "ديكا", "نتيقة"] }
          ]
        },
        {
          name: "محلية كاس",
          code: "SD02",
          adminUnits: [
            { name: "كاس", districts: ["كاس", "ديكا", "نتيقة"] }
          ]
        }
      ]
    },
    {
      name: "جنوب كردفان",
      nameEn: "South Kordofan",
      code: "SK",
      localities: [
        {
          name: "محلية كادقلي",
          code: "SK01",
          adminUnits: [
            { name: "كادقلي", districts: ["كادقلي", "الدلنج", "رشاد"] }
          ]
        },
        {
          name: "محلية أبو جبيهة",
          code: "SK02",
          adminUnits: [
            { name: "أبو جبيهة", districts: ["أبو جبيهة", "لقاوة", "أم دورين"] }
          ]
        }
      ]
    },
    {
      name: "الجزيرة",
      nameEn: "Gezira",
      code: "GZ",
      localities: [
        {
          name: "محلية ود مدني",
          code: "GZ01",
          adminUnits: [
            { name: "ود مدني الكبرى", districts: ["ود مدني", "الحصاحيصا", "الكاملين"] },
            { name: "ود مدني الريف", districts: ["القطينة", "أم القرى", "ود رملي"] }
          ]
        },
        {
          name: "محلية شرق الجزيرة",
          code: "GZ02",
          adminUnits: [
            { name: "الحصاحيصا", districts: ["الحصاحيصا", "الكاملين", "أم القرى"] }
          ]
        },
        {
          name: "محلية كنانة",
          code: "GZ03",
          adminUnits: [
            { name: "كنانة", districts: ["ربك", "كنانة", "أم سنط"] }
          ]
        }
      ]
    },
    {
      name: "النيل الأبيض",
      nameEn: "White Nile",
      code: "WN",
      localities: [
        {
          name: "محلية ربك",
          code: "WN01",
          adminUnits: [
            { name: "ربك المدينة", districts: ["ربك", "أبو حراز", "الدويم"] },
            { name: "ربك الريف", districts: ["كوستي", "الجبلين", "قطنة"] }
          ]
        },
        {
          name: "محلية كوستي",
          code: "WN02",
          adminUnits: [
            { name: "كوستي", districts: ["كوستي", "تندلتي", "أبو حجار"] }
          ]
        }
      ]
    },
    {
      name: "نهر النيل",
      nameEn: "River Nile",
      code: "RN",
      localities: [
        {
          name: "محلية الدامر",
          code: "RN01",
          adminUnits: [
            { name: "الدامر", districts: ["الدامر", "عطبرة", "شندي"] }
          ]
        },
        {
          name: "محلية شندي",
          code: "RN02",
          adminUnits: [
            { name: "شندي", districts: ["شندي", "الدجاكة", "الصالحاب"] }
          ]
        }
      ]
    },
    {
      name: "البحر الأحمر",
      nameEn: "Red Sea",
      code: "RS",
      localities: [
        {
          name: "محلية بورتسودان",
          code: "RS01",
          adminUnits: [
            { name: "بورتسودان", districts: ["بورتسودان", "السوق العربي", "الثورة"] },
            { name: "المنطقة الشمالية", districts: ["سنكات", "أقيق", "طوكر"] }
          ]
        },
        {
          name: "محلية سنكات",
          code: "RS02",
          adminUnits: [
            { name: "سنكات", districts: ["سنكات", "طوكر", "أقيق"] }
          ]
        }
      ]
    },
    {
      name: "القضارف",
      nameEn: "Al Qadarif",
      code: "QD",
      localities: [
        {
          name: "محلية القضارف",
          code: "QD01",
          adminUnits: [
            { name: "القضارف المدينة", districts: ["القضارف", "الصوق", "المدينة الجديدة"] },
            { name: "القضارف الريف", districts: ["القلابات", "الهوارة", "فاو"] }
          ]
        },
        {
          name: "محلية القلابات",
          code: "QD02",
          adminUnits: [
            { name: "القلابات", districts: ["القلابات", "فاو", "الصيام"] }
          ]
        }
      ]
    },
    {
      name: "سنار",
      nameEn: "Sennar",
      code: "SN",
      localities: [
        {
          name: "محلية سنجة",
          code: "SN01",
          adminUnits: [
            { name: "سنجة", districts: ["سنجة", "أبو حجار", "الدندر"] }
          ]
        },
        {
          name: "محلية سنار",
          code: "SN02",
          adminUnits: [
            { name: "سنار", districts: ["سنار", "المزموم", "أم بنين"] }
          ]
        }
      ]
    },
    {
      name: "غرب دارفور",
      nameEn: "West Darfur",
      code: "WD",
      localities: [
        {
          name: "محلية الجنينة",
          code: "WD01",
          adminUnits: [
            { name: "الجنينة", districts: ["الجنينة", "حبيلة", "كريندنق"] }
          ]
        },
        {
          name: "محلية فور بارانقا",
          code: "WD02",
          adminUnits: [
            { name: "فور بارانقا", districts: ["فور بارانقا", "سيربا", "بيضا"] }
          ]
        }
      ]
    },
    {
      name: "وسط دارفور",
      nameEn: "Central Darfur",
      code: "CD",
      localities: [
        {
          name: "محلية زالنجي",
          code: "CD01",
          adminUnits: [
            { name: "زالنجي", districts: ["زالنجي", "وادي صالح", "بندسي"] }
          ]
        },
        {
          name: "محلية وادي صالح",
          code: "CD02",
          adminUnits: [
            { name: "وادي صالح", districts: ["وادي صالح", "بندسي", "أزوم"] }
          ]
        }
      ]
    },
    {
      name: "شرق دارفور",
      nameEn: "East Darfur",
      code: "ED",
      localities: [
        {
          name: "محلية الضعين",
          code: "ED01",
          adminUnits: [
            { name: "الضعين", districts: ["الضعين", "عد الفرسان", "أبو كارنكا"] }
          ]
        },
        {
          name: "محلية ياسين",
          code: "ED02",
          adminUnits: [
            { name: "ياسين", districts: ["ياسين", "الفردوس", "شعيرية"] }
          ]
        }
      ]
    },
    {
      name: "غرب كردفان",
      nameEn: "West Kordofan",
      code: "WK",
      localities: [
        {
          name: "محلية الفولة",
          code: "WK01",
          adminUnits: [
            { name: "الفولة", districts: ["الفولة", "بابنوسة", "المجلد"] }
          ]
        },
        {
          name: "محلية المجلد",
          code: "WK02",
          adminUnits: [
            { name: "المجلد", districts: ["المجلد", "التندوب", "هبيلة"] }
          ]
        }
      ]
    }
  ];

  const createdRegions = [];
  
  for (const stateData of sudanData) {
    console.log(`Creating region: ${stateData.name}`);
    
    // Create the Region (State)
    const region = await prisma.region.create({
      data: {
        name: stateData.name,
        code: stateData.code,
        description: `ولاية ${stateData.name} - ${stateData.nameEn}`,
        active: true
      }
    });
    
    createdRegions.push(region);

    // Create Localities for this Region
    for (const localityData of stateData.localities) {
      console.log(`  Creating locality: ${localityData.name}`);
      
      const locality = await prisma.locality.create({
        data: {
          name: localityData.name,
          code: localityData.code,
          regionId: region.id,
          description: `محلية ${localityData.name}`,
          active: true
        }
      });

      // Create Administrative Units for this Locality
      for (const adminUnitData of localityData.adminUnits) {
        console.log(`    Creating admin unit: ${adminUnitData.name}`);
        
        const adminUnit = await prisma.adminUnit.create({
          data: {
            name: adminUnitData.name,
            localityId: locality.id,
            description: `وحدة إدارية ${adminUnitData.name}`,
            active: true
          }
        });

        // Create Districts for this Administrative Unit
        for (const districtName of adminUnitData.districts) {
          console.log(`      Creating district: ${districtName}`);
          
          await prisma.district.create({
            data: {
              name: districtName,
              adminUnitId: adminUnit.id,
              description: `حي ${districtName}`,
              active: true
            }
          });
        }
      }
    }
  }

  console.log(`Created ${createdRegions.length} regions (states) with their complete administrative hierarchy`);
  return createdRegions;
}

async function main() {
  console.log('Starting to seed the database...');
  
  try {
    // Step 1: Create Sudan administrative hierarchy
    const regions = await createSudanAdministrativeHierarchy();
    
    // Step 2: Create users
    const { admin, user } = await createUsers();
    
    // Step 3: Create bulletins
    await createBulletins(regions);
    
    // Step 4: Create archive documents
    await createArchiveDocuments();
    
    // Step 5: Create surveys
    await createSurveys(regions);
    
    // Step 6: Create voting items
    await createVotingItems(admin.id, regions);
    
    // Step 7: Create subscription plans
    const plans = await createSubscriptionPlans();
    
    // Step 8: Create subscription for user
    if (plans.length > 0) {
      await createSubscription(user.id, plans[0].id, regions);
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 