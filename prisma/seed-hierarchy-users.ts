import { PrismaClient, AdminLevel } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

type HierarchyAdminLevel = Extract<AdminLevel, 'REGION' | 'LOCALITY' | 'ADMIN_UNIT' | 'DISTRICT' | 'USER'>;

type SeedUser = {
  mobileNumber: string;
  email: string;
  adminLevel: HierarchyAdminLevel;
  firstName: string;
  lastName: string;
};

const USERS: SeedUser[] = [
  {
    mobileNumber: '+249900000101',
    email: 'region.admin@test.com',
    adminLevel: 'REGION',
    firstName: 'مدير',
    lastName: 'الولاية',
  },
  {
    mobileNumber: '+249900000102',
    email: 'locality.admin@test.com',
    adminLevel: 'LOCALITY',
    firstName: 'مدير',
    lastName: 'المحلية',
  },
  {
    mobileNumber: '+249900000103',
    email: 'adminunit.admin@test.com',
    adminLevel: 'ADMIN_UNIT',
    firstName: 'مدير',
    lastName: 'الوحدة',
  },
  {
    mobileNumber: '+249900000104',
    email: 'district.admin@test.com',
    adminLevel: 'DISTRICT',
    firstName: 'مدير',
    lastName: 'الحي',
  },
  {
    mobileNumber: '+249900000105',
    email: 'region.member@test.com',
    adminLevel: 'USER',
    firstName: 'عضو',
    lastName: 'الولاية',
  },
];

async function main() {
  console.log('🌱 Seeding hierarchy test users...');

  const passwordHash = await bcrypt.hash('Test@123', 10);

  const region = await prisma.region.findFirst({
    include: {
      localities: {
        include: {
          adminUnits: {
            include: {
              districts: true,
            },
          },
        },
      },
    },
  });

  if (!region) {
    throw new Error('No region found. Please run prisma/seed.ts first.');
  }

  const locality = region.localities[0];
  if (!locality) {
    throw new Error(`Region ${region.name} has no localities. Please run prisma/seed.ts first.`);
  }

  const adminUnit = locality.adminUnits[0];
  if (!adminUnit) {
    throw new Error(`Locality ${locality.name} has no admin units. Please run prisma/seed.ts first.`);
  }

  const district = adminUnit.districts[0];
  if (!district) {
    throw new Error(`Admin Unit ${adminUnit.name} has no districts. Please run prisma/seed.ts first.`);
  }

  // IMPORTANT: ALL users must exist at district level
  // The adminLevel field determines their permissions, but they must have districtId
  // Parent IDs will be auto-derived from district
  const baseHierarchyRefs = {
    regionId: region.id,
    localityId: locality.id,
    adminUnitId: adminUnit.id,
    districtId: district.id,
  };

  for (const user of USERS) {
    const data = {
      email: user.email,
      mobileNumber: user.mobileNumber,
      password: passwordHash,
      role: user.adminLevel === 'USER' ? 'USER' : 'ADMIN',
      adminLevel: user.adminLevel,
      // ALL users get district-level assignment
      ...baseHierarchyRefs,
      profile: {
        create: {
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.mobileNumber,
        },
      },
    };

    await prisma.user.upsert({
      where: { mobileNumber: user.mobileNumber },
      update: {
        adminLevel: user.adminLevel,
        // Ensure all users have district assignment
        ...baseHierarchyRefs,
      },
      create: data,
    });

    console.log(`  ✅ Seeded ${user.adminLevel} user (${user.mobileNumber}) at district level`);
  }

  console.log('🎉 Done seeding hierarchy users!');
}

main()
  .catch((error) => {
    console.error('❌ Error while seeding hierarchy users', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

