const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createComprehensiveUsers() {
  console.log('🌱 Creating comprehensive user seed data...');
  
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);
  const regionPassword = await bcrypt.hash('region123', 10);
  const localityPassword = await bcrypt.hash('locality123', 10);
  const adminUnitPassword = await bcrypt.hash('adminunit123', 10);
  const districtPassword = await bcrypt.hash('district123', 10);

  // 1. ROOT ADMIN (General Secretariat Level)
  const rootAdmin = await prisma.user.upsert({
    where: { email: 'root@pp.com' },
    update: {},
    create: {
      email: 'root@pp.com',
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
  console.log('✅ Root Admin created:', rootAdmin.email);

  // 2. REGION LEVEL ADMINS
  const khartoumRegion = await prisma.region.findFirst({ where: { name: 'الخرطوم' } });
  const northKordofanRegion = await prisma.region.findFirst({ where: { name: 'شمال كردفان' } });
  const northernRegion = await prisma.region.findFirst({ where: { name: 'الشمالية' } });

  // Khartoum Region Admin
  const khartoumAdmin = await prisma.user.upsert({
    where: { email: 'khartoum@pp.com' },
    update: {},
    create: {
      email: 'khartoum@pp.com',
      mobileNumber: '+249123456790',
      password: regionPassword,
      role: 'ADMIN',
      adminLevel: 'REGION',
      regionId: khartoumRegion?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'ولاية الخرطوم',
          phoneNumber: '+249123456790',
        }
      }
    },
    include: {
      profile: true,
      region: true
    }
  });
  console.log('✅ Khartoum Region Admin created:', khartoumAdmin.email);

  // North Kordofan Region Admin
  const northKordofanAdmin = await prisma.user.upsert({
    where: { email: 'northkordofan@pp.com' },
    update: {},
    create: {
      email: 'northkordofan@pp.com',
      mobileNumber: '+249123456791',
      password: regionPassword,
      role: 'ADMIN',
      adminLevel: 'REGION',
      regionId: northKordofanRegion?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'ولاية شمال كردفان',
          phoneNumber: '+249123456791',
        }
      }
    },
    include: {
      profile: true,
      region: true
    }
  });
  console.log('✅ North Kordofan Region Admin created:', northKordofanAdmin.email);

  // 3. LOCALITY LEVEL ADMINS
  const khartoumLocality = await prisma.locality.findFirst({ 
    where: { name: 'محلية الخرطوم' },
    include: { region: true }
  });
  const omdurmanLocality = await prisma.locality.findFirst({ 
    where: { name: 'محلية أم درمان' },
    include: { region: true }
  });

  // Khartoum Locality Admin
  const khartoumLocalityAdmin = await prisma.user.upsert({
    where: { email: 'khartoum.locality@pp.com' },
    update: {},
    create: {
      email: 'khartoum.locality@pp.com',
      mobileNumber: '+249123456792',
      password: localityPassword,
      role: 'ADMIN',
      adminLevel: 'LOCALITY',
      regionId: khartoumLocality?.regionId,
      localityId: khartoumLocality?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'محلية الخرطوم',
          phoneNumber: '+249123456792',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true
    }
  });
  console.log('✅ Khartoum Locality Admin created:', khartoumLocalityAdmin.email);

  // Omdurman Locality Admin
  const omdurmanLocalityAdmin = await prisma.user.upsert({
    where: { email: 'omdurman.locality@pp.com' },
    update: {},
    create: {
      email: 'omdurman.locality@pp.com',
      mobileNumber: '+249123456793',
      password: localityPassword,
      role: 'ADMIN',
      adminLevel: 'LOCALITY',
      regionId: omdurmanLocality?.regionId,
      localityId: omdurmanLocality?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'محلية أم درمان',
          phoneNumber: '+249123456793',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true
    }
  });
  console.log('✅ Omdurman Locality Admin created:', omdurmanLocalityAdmin.email);

  // 4. ADMIN UNIT LEVEL ADMINS
  const khartoumEastAdminUnit = await prisma.adminUnit.findFirst({ 
    where: { name: 'الخرطوم شرق' },
    include: { locality: { include: { region: true } } }
  });
  const khartoumCenterAdminUnit = await prisma.adminUnit.findFirst({ 
    where: { name: 'الخرطوم وسط' },
    include: { locality: { include: { region: true } } }
  });

  // Khartoum East Admin Unit Admin
  const khartoumEastAdminUnitAdmin = await prisma.user.upsert({
    where: { email: 'khartoum.east@pp.com' },
    update: {},
    create: {
      email: 'khartoum.east@pp.com',
      mobileNumber: '+249123456794',
      password: adminUnitPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN_UNIT',
      regionId: khartoumEastAdminUnit?.locality?.regionId,
      localityId: khartoumEastAdminUnit?.localityId,
      adminUnitId: khartoumEastAdminUnit?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'الخرطوم شرق',
          phoneNumber: '+249123456794',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true,
      adminUnit: true
    }
  });
  console.log('✅ Khartoum East Admin Unit Admin created:', khartoumEastAdminUnitAdmin.email);

  // Khartoum Center Admin Unit Admin
  const khartoumCenterAdminUnitAdmin = await prisma.user.upsert({
    where: { email: 'khartoum.center@pp.com' },
    update: {},
    create: {
      email: 'khartoum.center@pp.com',
      mobileNumber: '+249123456795',
      password: adminUnitPassword,
      role: 'ADMIN',
      adminLevel: 'ADMIN_UNIT',
      regionId: khartoumCenterAdminUnit?.locality?.regionId,
      localityId: khartoumCenterAdminUnit?.localityId,
      adminUnitId: khartoumCenterAdminUnit?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'الخرطوم وسط',
          phoneNumber: '+249123456795',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true,
      adminUnit: true
    }
  });
  console.log('✅ Khartoum Center Admin Unit Admin created:', khartoumCenterAdminUnitAdmin.email);

  // 5. DISTRICT LEVEL ADMINS
  const aljreefEastDistrict = await prisma.district.findFirst({ 
    where: { name: 'الجريف شرق' },
    include: { 
      adminUnit: { 
        include: { 
          locality: { include: { region: true } } 
        } 
      } 
    }
  });
  const almoradaDistrict = await prisma.district.findFirst({ 
    where: { name: 'الموردة' },
    include: { 
      adminUnit: { 
        include: { 
          locality: { include: { region: true } } 
        } 
      } 
    }
  });

  // Aljreef East District Admin
  const aljreefEastDistrictAdmin = await prisma.user.upsert({
    where: { email: 'aljreef.east@pp.com' },
    update: {},
    create: {
      email: 'aljreef.east@pp.com',
      mobileNumber: '+249123456796',
      password: districtPassword,
      role: 'ADMIN',
      adminLevel: 'DISTRICT',
      regionId: aljreefEastDistrict?.adminUnit?.locality?.regionId,
      localityId: aljreefEastDistrict?.adminUnit?.localityId,
      adminUnitId: aljreefEastDistrict?.adminUnitId,
      districtId: aljreefEastDistrict?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'الجريف شرق',
          phoneNumber: '+249123456796',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true,
      adminUnit: true,
      district: true
    }
  });
  console.log('✅ Aljreef East District Admin created:', aljreefEastDistrictAdmin.email);

  // Almorada District Admin
  const almoradaDistrictAdmin = await prisma.user.upsert({
    where: { email: 'almorada@pp.com' },
    update: {},
    create: {
      email: 'almorada@pp.com',
      mobileNumber: '+249123456797',
      password: districtPassword,
      role: 'ADMIN',
      adminLevel: 'DISTRICT',
      regionId: almoradaDistrict?.adminUnit?.locality?.regionId,
      localityId: almoradaDistrict?.adminUnit?.localityId,
      adminUnitId: almoradaDistrict?.adminUnitId,
      districtId: almoradaDistrict?.id,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'الموردة',
          phoneNumber: '+249123456797',
        }
      }
    },
    include: {
      profile: true,
      region: true,
      locality: true,
      adminUnit: true,
      district: true
    }
  });
  console.log('✅ Almorada District Admin created:', almoradaDistrictAdmin.email);

  // 6. REGULAR USERS (Different levels)
  const users = [
    {
      email: 'user1@pp.com',
      mobileNumber: '+249123456798',
      firstName: 'أحمد',
      lastName: 'محمد',
      adminLevel: 'USER',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumEastAdminUnit?.id,
      districtId: aljreefEastDistrict?.id
    },
    {
      email: 'user2@pp.com',
      mobileNumber: '+249123456799',
      firstName: 'فاطمة',
      lastName: 'علي',
      adminLevel: 'USER',
      regionId: khartoumRegion?.id,
      localityId: omdurmanLocality?.id,
      adminUnitId: khartoumCenterAdminUnit?.id,
      districtId: almoradaDistrict?.id
    },
    {
      email: 'user3@pp.com',
      mobileNumber: '+249123456800',
      firstName: 'عمر',
      lastName: 'حسن',
      adminLevel: 'USER',
      regionId: northKordofanRegion?.id
    },
    {
      email: 'user4@pp.com',
      mobileNumber: '+249123456801',
      firstName: 'مريم',
      lastName: 'أحمد',
      adminLevel: 'USER',
      regionId: northernRegion?.id
    }
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        mobileNumber: userData.mobileNumber,
        password: userPassword,
        role: 'USER',
        adminLevel: userData.adminLevel,
        regionId: userData.regionId,
        localityId: userData.localityId,
        adminUnitId: userData.adminUnitId,
        districtId: userData.districtId,
        profile: {
          create: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            phoneNumber: userData.mobileNumber,
          }
        }
      },
      include: {
        profile: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
    console.log(`✅ User created: ${user.email} (${userData.firstName} ${userData.lastName})`);
  }

  console.log('\n🎉 Comprehensive user seed completed!');
  console.log('\n📋 Login Credentials:');
  console.log('==================');
  console.log('ROOT ADMIN:');
  console.log('  Email: root@pp.com');
  console.log('  Mobile: +249123456789');
  console.log('  Password: admin123');
  console.log('');
  console.log('REGION ADMINS:');
  console.log('  Khartoum: khartoum@pp.com / +249123456790 / region123');
  console.log('  North Kordofan: northkordofan@pp.com / +249123456791 / region123');
  console.log('');
  console.log('LOCALITY ADMINS:');
  console.log('  Khartoum: khartoum.locality@pp.com / +249123456792 / locality123');
  console.log('  Omdurman: omdurman.locality@pp.com / +249123456793 / locality123');
  console.log('');
  console.log('ADMIN UNIT ADMINS:');
  console.log('  Khartoum East: khartoum.east@pp.com / +249123456794 / adminunit123');
  console.log('  Khartoum Center: khartoum.center@pp.com / +249123456795 / adminunit123');
  console.log('');
  console.log('DISTRICT ADMINS:');
  console.log('  Aljreef East: aljreef.east@pp.com / +249123456796 / district123');
  console.log('  Almorada: almorada@pp.com / +249123456797 / district123');
  console.log('');
  console.log('REGULAR USERS:');
  console.log('  User 1: user1@pp.com / +249123456798 / user123');
  console.log('  User 2: user2@pp.com / +249123456799 / user123');
  console.log('  User 3: user3@pp.com / +249123456800 / user123');
  console.log('  User 4: user4@pp.com / +249123456801 / user123');
}

async function main() {
  try {
    await createComprehensiveUsers();
  } catch (error) {
    console.error('Error creating comprehensive users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createComprehensiveUsers };
