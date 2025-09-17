const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestUsers() {
  console.log('🌱 Creating test users with unique mobile numbers...');
  
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Get hierarchy data
  const khartoumRegion = await prisma.region.findFirst({ where: { name: 'الخرطوم' } });
  const northKordofanRegion = await prisma.region.findFirst({ where: { name: 'شمال كردفان' } });
  const khartoumLocality = await prisma.locality.findFirst({ where: { name: 'محلية الخرطوم' } });
  const omdurmanLocality = await prisma.locality.findFirst({ where: { name: 'محلية أم درمان' } });
  const khartoumEastAdminUnit = await prisma.adminUnit.findFirst({ where: { name: 'الخرطوم شرق' } });
  const khartoumCenterAdminUnit = await prisma.adminUnit.findFirst({ where: { name: 'الخرطوم وسط' } });
  const aljreefEastDistrict = await prisma.district.findFirst({ where: { name: 'الجريف شرق' } });
  const almoradaDistrict = await prisma.district.findFirst({ where: { name: 'الموردة' } });

  // Create users with unique mobile numbers starting from 900000000
  const users = [
    // ROOT ADMIN
    {
      email: 'root@pp.com',
      mobileNumber: '+249900000001',
      firstName: 'المدير',
      lastName: 'العام',
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      password: adminPassword
    },
    // REGION ADMINS
    {
      email: 'khartoum@pp.com',
      mobileNumber: '+249900000002',
      firstName: 'مدير',
      lastName: 'ولاية الخرطوم',
      role: 'ADMIN',
      adminLevel: 'REGION',
      regionId: khartoumRegion?.id,
      password: adminPassword
    },
    {
      email: 'northkordofan@pp.com',
      mobileNumber: '+249900000003',
      firstName: 'مدير',
      lastName: 'ولاية شمال كردفان',
      role: 'ADMIN',
      adminLevel: 'REGION',
      regionId: northKordofanRegion?.id,
      password: adminPassword
    },
    // LOCALITY ADMINS
    {
      email: 'khartoum.locality@pp.com',
      mobileNumber: '+249900000004',
      firstName: 'مدير',
      lastName: 'محلية الخرطوم',
      role: 'ADMIN',
      adminLevel: 'LOCALITY',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      password: adminPassword
    },
    {
      email: 'omdurman.locality@pp.com',
      mobileNumber: '+249900000005',
      firstName: 'مدير',
      lastName: 'محلية أم درمان',
      role: 'ADMIN',
      adminLevel: 'LOCALITY',
      regionId: khartoumRegion?.id,
      localityId: omdurmanLocality?.id,
      password: adminPassword
    },
    // ADMIN UNIT ADMINS
    {
      email: 'khartoum.east@pp.com',
      mobileNumber: '+249900000006',
      firstName: 'مدير',
      lastName: 'الخرطوم شرق',
      role: 'ADMIN',
      adminLevel: 'ADMIN_UNIT',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumEastAdminUnit?.id,
      password: adminPassword
    },
    {
      email: 'khartoum.center@pp.com',
      mobileNumber: '+249900000007',
      firstName: 'مدير',
      lastName: 'الخرطوم وسط',
      role: 'ADMIN',
      adminLevel: 'ADMIN_UNIT',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumCenterAdminUnit?.id,
      password: adminPassword
    },
    // DISTRICT ADMINS
    {
      email: 'aljreef.east@pp.com',
      mobileNumber: '+249900000008',
      firstName: 'مدير',
      lastName: 'الجريف شرق',
      role: 'ADMIN',
      adminLevel: 'DISTRICT',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumEastAdminUnit?.id,
      districtId: aljreefEastDistrict?.id,
      password: adminPassword
    },
    {
      email: 'almorada@pp.com',
      mobileNumber: '+249900000009',
      firstName: 'مدير',
      lastName: 'الموردة',
      role: 'ADMIN',
      adminLevel: 'DISTRICT',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumEastAdminUnit?.id,
      districtId: almoradaDistrict?.id,
      password: adminPassword
    },
    // REGULAR USERS
    {
      email: 'user1@pp.com',
      mobileNumber: '+249900000010',
      firstName: 'أحمد',
      lastName: 'محمد',
      role: 'USER',
      adminLevel: 'USER',
      regionId: khartoumRegion?.id,
      localityId: khartoumLocality?.id,
      adminUnitId: khartoumEastAdminUnit?.id,
      districtId: aljreefEastDistrict?.id,
      password: userPassword
    },
    {
      email: 'user2@pp.com',
      mobileNumber: '+249900000011',
      firstName: 'فاطمة',
      lastName: 'علي',
      role: 'USER',
      adminLevel: 'USER',
      regionId: khartoumRegion?.id,
      localityId: omdurmanLocality?.id,
      adminUnitId: khartoumCenterAdminUnit?.id,
      districtId: almoradaDistrict?.id,
      password: userPassword
    },
    {
      email: 'user3@pp.com',
      mobileNumber: '+249900000012',
      firstName: 'عمر',
      lastName: 'حسن',
      role: 'USER',
      adminLevel: 'USER',
      regionId: northKordofanRegion?.id,
      password: userPassword
    },
    {
      email: 'user4@pp.com',
      mobileNumber: '+249900000013',
      firstName: 'مريم',
      lastName: 'أحمد',
      role: 'USER',
      adminLevel: 'USER',
      regionId: khartoumRegion?.id,
      password: userPassword
    }
  ];

  for (const userData of users) {
    try {
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {},
        create: {
          email: userData.email,
          mobileNumber: userData.mobileNumber,
          password: userData.password,
          role: userData.role,
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
      console.log(`✅ ${userData.role} created: ${user.email} (${userData.firstName} ${userData.lastName}) - ${userData.mobileNumber}`);
    } catch (error) {
      console.log(`⚠️  User ${userData.email} already exists or error: ${error.message}`);
    }
  }

  console.log('\n🎉 Test users creation completed!');
  console.log('\n📋 Login Credentials:');
  console.log('==================');
  console.log('ROOT ADMIN:');
  console.log('  Email: root@pp.com');
  console.log('  Mobile: +249900000001');
  console.log('  Password: admin123');
  console.log('');
  console.log('REGION ADMINS:');
  console.log('  Khartoum: khartoum@pp.com / +249900000002 / admin123');
  console.log('  North Kordofan: northkordofan@pp.com / +249900000003 / admin123');
  console.log('');
  console.log('LOCALITY ADMINS:');
  console.log('  Khartoum: khartoum.locality@pp.com / +249900000004 / admin123');
  console.log('  Omdurman: omdurman.locality@pp.com / +249900000005 / admin123');
  console.log('');
  console.log('ADMIN UNIT ADMINS:');
  console.log('  Khartoum East: khartoum.east@pp.com / +249900000006 / admin123');
  console.log('  Khartoum Center: khartoum.center@pp.com / +249900000007 / admin123');
  console.log('');
  console.log('DISTRICT ADMINS:');
  console.log('  Aljreef East: aljreef.east@pp.com / +249900000008 / admin123');
  console.log('  Almorada: almorada@pp.com / +249900000009 / admin123');
  console.log('');
  console.log('REGULAR USERS:');
  console.log('  User 1: user1@pp.com / +249900000010 / user123');
  console.log('  User 2: user2@pp.com / +249900000011 / user123');
  console.log('  User 3: user3@pp.com / +249900000012 / user123');
  console.log('  User 4: user4@pp.com / +249900000013 / user123');
}

async function main() {
  try {
    await createTestUsers();
  } catch (error) {
    console.error('Error creating test users:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { createTestUsers };
