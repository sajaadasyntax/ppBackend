import { PrismaClient, AdminLevel, ActiveHierarchy } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Prisma automatically loads .env file from project root (same as seed.ts and seed-hierarchy-users.ts)
const prisma = new PrismaClient();

/**
 * Comprehensive test users and admins seed script
 * 
 * This script creates:
 * 1. Regular users (adminLevel: USER) across different hierarchies
 * 2. Admin users at different hierarchy levels (REGION, LOCALITY, ADMIN_UNIT, DISTRICT, etc.)
 * 3. Ensures every admin is a user first (they have a User record with appropriate role)
 * 
 * All users are distributed across:
 * - ORIGINAL hierarchy (geographical: Region -> Locality -> AdminUnit -> District)
 * - EXPATRIATE hierarchy (ExpatriateRegion)
 * - SECTOR hierarchy (SectorRegion, SectorLocality, etc.)
 */

const DEFAULT_PASSWORD = 'Test@123';

interface TestUser {
  mobileNumber: string;
  email: string;
  firstName: string;
  lastName: string;
  adminLevel: AdminLevel;
  role: string;
  // ORIGINAL hierarchy
  regionId?: string;
  localityId?: string;
  adminUnitId?: string;
  districtId?: string;
  nationalLevelId?: string;
  // EXPATRIATE hierarchy
  expatriateRegionId?: string;
  // SECTOR hierarchy
  sectorRegionId?: string;
  sectorLocalityId?: string;
  sectorAdminUnitId?: string;
  sectorDistrictId?: string;
  sectorNationalLevelId?: string;
  activeHierarchy?: ActiveHierarchy;
}

// ==================== HELPER FUNCTIONS ====================

async function getOrCreateHierarchyEntities() {
  console.log('📋 Gathering hierarchy entities...');

  // Get ORIGINAL hierarchy entities
  const nationalLevel = await prisma.nationalLevel.findFirst({ where: { active: true } });
  if (!nationalLevel) {
    throw new Error('No national level found. Please run seed.ts first.');
  }

  const regions = await prisma.region.findMany({ 
    where: { active: true },
    take: 5,
    include: {
      localities: {
        where: { active: true },
        take: 2,
        include: {
          adminUnits: {
            where: { active: true },
            take: 2,
            include: {
              districts: {
                where: { active: true },
                take: 2
              }
            }
          }
        }
      }
    }
  });

  if (regions.length === 0) {
    throw new Error('No regions found. Please run seed.ts first.');
  }

  // Get EXPATRIATE hierarchy entities
  const expatriateRegions = await prisma.expatriateRegion.findMany({ 
    where: { active: true },
    take: 3
  });

  // Get SECTOR hierarchy entities
  const sectorRegions = await prisma.sectorRegion.findMany({ 
    where: { active: true },
    take: 3,
    include: {
      sectorLocalities: {
        where: { active: true },
        take: 2,
        include: {
          sectorAdminUnits: {
            where: { active: true },
            take: 2,
            include: {
              sectorDistricts: {
                where: { active: true },
                take: 2
              }
            }
          }
        }
      }
    }
  });

  const sectorNationalLevels = await prisma.sectorNationalLevel.findMany({ 
    where: { active: true },
    take: 3
  });

  console.log(`✅ Found ${regions.length} regions, ${expatriateRegions.length} expatriate regions, ${sectorRegions.length} sector regions`);

  return {
    nationalLevel,
    regions,
    expatriateRegions,
    sectorRegions,
    sectorNationalLevels
  };
}

// ==================== CREATE TEST USERS ====================

async function createTestUsers() {
  console.log('\n👥 Creating test users and admins...');

  // Generate password hash for all users
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const hierarchy = await getOrCreateHierarchyEntities();
  const testUsers: TestUser[] = [];

  // ========== ORIGINAL HIERARCHY USERS ==========
  
  // 1. Root Admin (ADMIN level - can manage everything)
  testUsers.push({
    mobileNumber: '+249111111111',
    email: 'root.admin@test.com',
    firstName: 'المدير',
    lastName: 'العام',
    adminLevel: AdminLevel.ADMIN,
    role: 'ADMIN',
    activeHierarchy: ActiveHierarchy.ORIGINAL
  });

  // 2. General Secretariat Admin
  testUsers.push({
    mobileNumber: '+249111111112',
    email: 'general.secretariat@test.com',
    firstName: 'الأمين',
    lastName: 'العام',
    adminLevel: AdminLevel.GENERAL_SECRETARIAT,
    role: 'ADMIN',
    activeHierarchy: ActiveHierarchy.ORIGINAL
  });

  // 3. National Level Admin
  if (hierarchy.nationalLevel) {
    testUsers.push({
      mobileNumber: '+249111111113',
      email: 'national.level@test.com',
      firstName: 'مدير',
      lastName: 'المستوى القومي',
      adminLevel: AdminLevel.NATIONAL_LEVEL,
      role: 'ADMIN',
      nationalLevelId: hierarchy.nationalLevel.id,
      activeHierarchy: ActiveHierarchy.ORIGINAL
    });
  }

  // 4. Region Admins (one per region)
  hierarchy.regions.forEach((region, index) => {
    // Region Admin
    testUsers.push({
      mobileNumber: `+249222222${String(index + 1).padStart(3, '0')}`,
      email: `region.admin.${index + 1}@test.com`,
      firstName: `مدير`,
      lastName: region.name,
      adminLevel: AdminLevel.REGION,
      role: 'ADMIN',
      regionId: region.id,
      activeHierarchy: ActiveHierarchy.ORIGINAL
    });

    // Region Regular User
    testUsers.push({
      mobileNumber: `+249333333${String(index + 1).padStart(3, '0')}`,
      email: `region.user.${index + 1}@test.com`,
      firstName: `عضو`,
      lastName: region.name,
      adminLevel: AdminLevel.USER,
      role: 'USER',
      regionId: region.id,
      activeHierarchy: ActiveHierarchy.ORIGINAL
    });

    // Locality Admins and Users
    region.localities.forEach((locality, locIndex) => {
      // Locality Admin
      testUsers.push({
        mobileNumber: `+249444444${String(index * 10 + locIndex + 1).padStart(3, '0')}`,
        email: `locality.admin.${index}.${locIndex}@test.com`,
        firstName: `مدير`,
        lastName: locality.name,
        adminLevel: AdminLevel.LOCALITY,
        role: 'ADMIN',
        regionId: region.id,
        localityId: locality.id,
        activeHierarchy: ActiveHierarchy.ORIGINAL
      });

      // Locality Regular User
      testUsers.push({
        mobileNumber: `+249555555${String(index * 10 + locIndex + 1).padStart(3, '0')}`,
        email: `locality.user.${index}.${locIndex}@test.com`,
        firstName: `عضو`,
        lastName: locality.name,
        adminLevel: AdminLevel.USER,
        role: 'USER',
        regionId: region.id,
        localityId: locality.id,
        activeHierarchy: ActiveHierarchy.ORIGINAL
      });

      // Admin Unit Admins and Users
      locality.adminUnits.forEach((adminUnit, auIndex) => {
        // Admin Unit Admin
        testUsers.push({
          mobileNumber: `+249666666${String(index * 100 + locIndex * 10 + auIndex + 1).padStart(3, '0')}`,
          email: `adminunit.admin.${index}.${locIndex}.${auIndex}@test.com`,
          firstName: `مدير`,
          lastName: adminUnit.name,
          adminLevel: AdminLevel.ADMIN_UNIT,
          role: 'ADMIN',
          regionId: region.id,
          localityId: locality.id,
          adminUnitId: adminUnit.id,
          activeHierarchy: ActiveHierarchy.ORIGINAL
        });

        // Admin Unit Regular User
        testUsers.push({
          mobileNumber: `+249777777${String(index * 100 + locIndex * 10 + auIndex + 1).padStart(3, '0')}`,
          email: `adminunit.user.${index}.${locIndex}.${auIndex}@test.com`,
          firstName: `عضو`,
          lastName: adminUnit.name,
          adminLevel: AdminLevel.USER,
          role: 'USER',
          regionId: region.id,
          localityId: locality.id,
          adminUnitId: adminUnit.id,
          activeHierarchy: ActiveHierarchy.ORIGINAL
        });

        // District Admins and Users
        adminUnit.districts.forEach((district, distIndex) => {
          // District Admin
          testUsers.push({
            mobileNumber: `+249888888${String(index * 1000 + locIndex * 100 + auIndex * 10 + distIndex + 1).padStart(3, '0')}`,
            email: `district.admin.${index}.${locIndex}.${auIndex}.${distIndex}@test.com`,
            firstName: `مدير`,
            lastName: district.name,
            adminLevel: AdminLevel.DISTRICT,
            role: 'ADMIN',
            regionId: region.id,
            localityId: locality.id,
            adminUnitId: adminUnit.id,
            districtId: district.id,
            activeHierarchy: ActiveHierarchy.ORIGINAL
          });

          // District Regular User
          testUsers.push({
            mobileNumber: `+249999999${String(index * 1000 + locIndex * 100 + auIndex * 10 + distIndex + 1).padStart(3, '0')}`,
            email: `district.user.${index}.${locIndex}.${auIndex}.${distIndex}@test.com`,
            firstName: `عضو`,
            lastName: district.name,
            adminLevel: AdminLevel.USER,
            role: 'USER',
            regionId: region.id,
            localityId: locality.id,
            adminUnitId: adminUnit.id,
            districtId: district.id,
            activeHierarchy: ActiveHierarchy.ORIGINAL
          });
        });
      });
    });
  });

  // ========== EXPATRIATE HIERARCHY USERS ==========

  hierarchy.expatriateRegions.forEach((expatRegion, index) => {
    // Expatriate General Admin
    testUsers.push({
      mobileNumber: `+249211111${String(index + 1).padStart(3, '0')}`,
      email: `expat.general.${index + 1}@test.com`,
      firstName: `الأمين العام`,
      lastName: expatRegion.name,
      adminLevel: AdminLevel.EXPATRIATE_GENERAL,
      role: 'ADMIN',
      expatriateRegionId: expatRegion.id,
      activeHierarchy: ActiveHierarchy.EXPATRIATE
    });

    // Expatriate Region Admin
    testUsers.push({
      mobileNumber: `+249212222${String(index + 1).padStart(3, '0')}`,
      email: `expat.region.${index + 1}@test.com`,
      firstName: `مدير`,
      lastName: expatRegion.name,
      adminLevel: AdminLevel.EXPATRIATE_REGION,
      role: 'ADMIN',
      expatriateRegionId: expatRegion.id,
      activeHierarchy: ActiveHierarchy.EXPATRIATE
    });

    // Expatriate Regular User
    testUsers.push({
      mobileNumber: `+249213333${String(index + 1).padStart(3, '0')}`,
      email: `expat.user.${index + 1}@test.com`,
      firstName: `مغترب`,
      lastName: expatRegion.name,
      adminLevel: AdminLevel.USER,
      role: 'USER',
      expatriateRegionId: expatRegion.id,
      activeHierarchy: ActiveHierarchy.EXPATRIATE
    });
  });

  // ========== SECTOR HIERARCHY USERS ==========

  hierarchy.sectorRegions.forEach((sectorRegion, index) => {
    // Sector Region Admin
    testUsers.push({
      mobileNumber: `+249311111${String(index + 1).padStart(3, '0')}`,
      email: `sector.region.${index + 1}@test.com`,
      firstName: `مدير`,
      lastName: sectorRegion.name,
      adminLevel: AdminLevel.REGION, // Using REGION level for sector regions
      role: 'ADMIN',
      sectorRegionId: sectorRegion.id,
      activeHierarchy: ActiveHierarchy.SECTOR
    });

    // Sector Region Regular User
    testUsers.push({
      mobileNumber: `+249312222${String(index + 1).padStart(3, '0')}`,
      email: `sector.user.${index + 1}@test.com`,
      firstName: `عضو`,
      lastName: sectorRegion.name,
      adminLevel: AdminLevel.USER,
      role: 'USER',
      sectorRegionId: sectorRegion.id,
      activeHierarchy: ActiveHierarchy.SECTOR
    });

    // Sector Locality Admins and Users
    sectorRegion.sectorLocalities.forEach((sectorLocality, locIndex) => {
      // Sector Locality Admin
      testUsers.push({
        mobileNumber: `+249313333${String(index * 10 + locIndex + 1).padStart(3, '0')}`,
        email: `sector.locality.${index}.${locIndex}@test.com`,
        firstName: `مدير`,
        lastName: sectorLocality.name,
        adminLevel: AdminLevel.LOCALITY,
        role: 'ADMIN',
        sectorRegionId: sectorRegion.id,
        sectorLocalityId: sectorLocality.id,
        activeHierarchy: ActiveHierarchy.SECTOR
      });

      // Sector Locality Regular User
      testUsers.push({
        mobileNumber: `+249314444${String(index * 10 + locIndex + 1).padStart(3, '0')}`,
        email: `sector.locality.user.${index}.${locIndex}@test.com`,
        firstName: `عضو`,
        lastName: sectorLocality.name,
        adminLevel: AdminLevel.USER,
        role: 'USER',
        sectorRegionId: sectorRegion.id,
        sectorLocalityId: sectorLocality.id,
        activeHierarchy: ActiveHierarchy.SECTOR
      });

      // Sector Admin Unit Admins and Users
      sectorLocality.sectorAdminUnits.forEach((sectorAdminUnit, auIndex) => {
        // Sector Admin Unit Admin
        testUsers.push({
          mobileNumber: `+249315555${String(index * 100 + locIndex * 10 + auIndex + 1).padStart(3, '0')}`,
          email: `sector.adminunit.${index}.${locIndex}.${auIndex}@test.com`,
          firstName: `مدير`,
          lastName: sectorAdminUnit.name,
          adminLevel: AdminLevel.ADMIN_UNIT,
          role: 'ADMIN',
          sectorRegionId: sectorRegion.id,
          sectorLocalityId: sectorLocality.id,
          sectorAdminUnitId: sectorAdminUnit.id,
          activeHierarchy: ActiveHierarchy.SECTOR
        });

        // Sector Admin Unit Regular User
        testUsers.push({
          mobileNumber: `+249316666${String(index * 100 + locIndex * 10 + auIndex + 1).padStart(3, '0')}`,
          email: `sector.adminunit.user.${index}.${locIndex}.${auIndex}@test.com`,
          firstName: `عضو`,
          lastName: sectorAdminUnit.name,
          adminLevel: AdminLevel.USER,
          role: 'USER',
          sectorRegionId: sectorRegion.id,
          sectorLocalityId: sectorLocality.id,
          sectorAdminUnitId: sectorAdminUnit.id,
          activeHierarchy: ActiveHierarchy.SECTOR
        });

        // Sector District Admins and Users
        sectorAdminUnit.sectorDistricts.forEach((sectorDistrict, distIndex) => {
          // Sector District Admin
          testUsers.push({
            mobileNumber: `+249317777${String(index * 1000 + locIndex * 100 + auIndex * 10 + distIndex + 1).padStart(3, '0')}`,
            email: `sector.district.${index}.${locIndex}.${auIndex}.${distIndex}@test.com`,
            firstName: `مدير`,
            lastName: sectorDistrict.name,
            adminLevel: AdminLevel.DISTRICT,
            role: 'ADMIN',
            sectorRegionId: sectorRegion.id,
            sectorLocalityId: sectorLocality.id,
            sectorAdminUnitId: sectorAdminUnit.id,
            sectorDistrictId: sectorDistrict.id,
            activeHierarchy: ActiveHierarchy.SECTOR
          });

          // Sector District Regular User
          testUsers.push({
            mobileNumber: `+249318888${String(index * 1000 + locIndex * 100 + auIndex * 10 + distIndex + 1).padStart(3, '0')}`,
            email: `sector.district.user.${index}.${locIndex}.${auIndex}.${distIndex}@test.com`,
            firstName: `عضو`,
            lastName: sectorDistrict.name,
            adminLevel: AdminLevel.USER,
            role: 'USER',
            sectorRegionId: sectorRegion.id,
            sectorLocalityId: sectorLocality.id,
            sectorAdminUnitId: sectorAdminUnit.id,
            sectorDistrictId: sectorDistrict.id,
            activeHierarchy: ActiveHierarchy.SECTOR
          });
        });
      });
    });
  });

  // ========== CREATE USERS IN DATABASE ==========

  console.log(`\n📝 Creating ${testUsers.length} test users...`);

  let createdCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  for (const userData of testUsers) {
    try {
      // Check for existing user by mobile number or email
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { mobileNumber: userData.mobileNumber },
            { email: userData.email }
          ]
        }
      });

      const userPayload: any = {
        email: userData.email,
        mobileNumber: userData.mobileNumber,
        password: passwordHash,
        role: userData.role,
        adminLevel: userData.adminLevel,
        activeHierarchy: userData.activeHierarchy || ActiveHierarchy.ORIGINAL,
        // ORIGINAL hierarchy fields
        ...(userData.nationalLevelId && { nationalLevelId: userData.nationalLevelId }),
        ...(userData.regionId && { regionId: userData.regionId }),
        ...(userData.localityId && { localityId: userData.localityId }),
        ...(userData.adminUnitId && { adminUnitId: userData.adminUnitId }),
        ...(userData.districtId && { districtId: userData.districtId }),
        // EXPATRIATE hierarchy fields
        ...(userData.expatriateRegionId && { expatriateRegionId: userData.expatriateRegionId }),
        // SECTOR hierarchy fields
        ...(userData.sectorNationalLevelId && { sectorNationalLevelId: userData.sectorNationalLevelId }),
        ...(userData.sectorRegionId && { sectorRegionId: userData.sectorRegionId }),
        ...(userData.sectorLocalityId && { sectorLocalityId: userData.sectorLocalityId }),
        ...(userData.sectorAdminUnitId && { sectorAdminUnitId: userData.sectorAdminUnitId }),
        ...(userData.sectorDistrictId && { sectorDistrictId: userData.sectorDistrictId }),
        profile: {
          upsert: {
            create: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              phoneNumber: userData.mobileNumber,
            },
            update: {
              firstName: userData.firstName,
              lastName: userData.lastName,
              phoneNumber: userData.mobileNumber,
            }
          }
        }
      };

      if (existingUser) {
        // Update existing user - ensure they have the correct admin level and hierarchy
        await prisma.user.update({
          where: { id: existingUser.id },
          data: userPayload
        });
        updatedCount++;
        console.log(`  🔄 Updated: ${userData.email} (${userData.adminLevel})`);
      } else {
        // Create new user - IMPORTANT: All admins are created as User records first
        await prisma.user.create({
          data: userPayload
        });
        createdCount++;
        console.log(`  ✅ Created: ${userData.email} (${userData.adminLevel}) - ${userData.role === 'ADMIN' ? 'Admin' : 'User'}`);
      }
    } catch (error: any) {
      errorCount++;
      console.error(`  ❌ Error creating user ${userData.email}:`, error.message);
      // Continue with next user instead of failing completely
    }
  }

  console.log(`\n✅ User creation complete!`);
  console.log(`   Created: ${createdCount} users`);
  console.log(`   Updated: ${updatedCount} users`);
  if (errorCount > 0) {
    console.log(`   Errors: ${errorCount} users`);
  }
  console.log(`   Total processed: ${testUsers.length} users`);

  return testUsers;
}

// ==================== ASSIGN ADMINS TO HIERARCHY ENTITIES ====================

async function assignAdminsToHierarchy() {
  console.log('\n🔗 Assigning admins to hierarchy entities...');

  // Assign region admins
  const regionAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.REGION,
      regionId: { not: null }
    },
    include: { region: true }
  });

  for (const admin of regionAdmins) {
    if (admin.regionId) {
      await prisma.region.update({
        where: { id: admin.regionId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of region ${admin.region?.name}`);
    }
  }

  // Assign locality admins
  const localityAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.LOCALITY,
      localityId: { not: null }
    },
    include: { locality: true }
  });

  for (const admin of localityAdmins) {
    if (admin.localityId) {
      await prisma.locality.update({
        where: { id: admin.localityId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of locality ${admin.locality?.name}`);
    }
  }

  // Assign admin unit admins
  const adminUnitAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.ADMIN_UNIT,
      adminUnitId: { not: null }
    },
    include: { adminUnit: true }
  });

  for (const admin of adminUnitAdmins) {
    if (admin.adminUnitId) {
      await prisma.adminUnit.update({
        where: { id: admin.adminUnitId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of admin unit ${admin.adminUnit?.name}`);
    }
  }

  // Assign district admins
  const districtAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.DISTRICT,
      districtId: { not: null }
    },
    include: { district: true }
  });

  for (const admin of districtAdmins) {
    if (admin.districtId) {
      await prisma.district.update({
        where: { id: admin.districtId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of district ${admin.district?.name}`);
    }
  }

  // Assign expatriate region admins
  const expatriateAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: { in: [AdminLevel.EXPATRIATE_GENERAL, AdminLevel.EXPATRIATE_REGION] },
      expatriateRegionId: { not: null }
    },
    include: { expatriateRegion: true }
  });

  for (const admin of expatriateAdmins) {
    if (admin.expatriateRegionId) {
      await prisma.expatriateRegion.update({
        where: { id: admin.expatriateRegionId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of expatriate region ${admin.expatriateRegion?.name}`);
    }
  }

  // Assign sector admins
  const sectorRegionAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.REGION,
      sectorRegionId: { not: null }
    }
  });

  for (const admin of sectorRegionAdmins) {
    if (admin.sectorRegionId) {
      await prisma.sectorRegion.update({
        where: { id: admin.sectorRegionId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of sector region`);
    }
  }

  const sectorLocalityAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.LOCALITY,
      sectorLocalityId: { not: null }
    }
  });

  for (const admin of sectorLocalityAdmins) {
    if (admin.sectorLocalityId) {
      await prisma.sectorLocality.update({
        where: { id: admin.sectorLocalityId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of sector locality`);
    }
  }

  const sectorAdminUnitAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.ADMIN_UNIT,
      sectorAdminUnitId: { not: null }
    }
  });

  for (const admin of sectorAdminUnitAdmins) {
    if (admin.sectorAdminUnitId) {
      await prisma.sectorAdminUnit.update({
        where: { id: admin.sectorAdminUnitId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of sector admin unit`);
    }
  }

  const sectorDistrictAdmins = await prisma.user.findMany({
    where: { 
      adminLevel: AdminLevel.DISTRICT,
      sectorDistrictId: { not: null }
    }
  });

  for (const admin of sectorDistrictAdmins) {
    if (admin.sectorDistrictId) {
      await prisma.sectorDistrict.update({
        where: { id: admin.sectorDistrictId },
        data: { adminId: admin.id }
      });
      console.log(`  ✅ Assigned ${admin.email} as admin of sector district`);
    }
  }

  console.log('\n✅ Admin assignment complete!');
}

// ==================== MAIN FUNCTION ====================

async function main() {
  console.log('🚀 Starting test users and admins seed script...');
  console.log('📌 Note: All users have password: ' + DEFAULT_PASSWORD);
  console.log('📌 All admins are created as users first (they have User records)\n');

  try {
    // Step 1: Create all test users (both regular users and admins)
    await createTestUsers();

    // Step 2: Assign admins to their respective hierarchy entities
    await assignAdminsToHierarchy();

    // Step 3: Print summary
    console.log('\n📊 Summary:');
    const userCounts = await prisma.user.groupBy({
      by: ['adminLevel'],
      _count: true
    });

    const hierarchyCounts = await prisma.user.groupBy({
      by: ['activeHierarchy'],
      _count: true
    });

    console.log('\n👥 Users by Admin Level:');
    userCounts.forEach(({ adminLevel, _count }) => {
      console.log(`   ${adminLevel}: ${_count} users`);
    });

    console.log('\n🌍 Users by Active Hierarchy:');
    hierarchyCounts.forEach(({ activeHierarchy, _count }) => {
      console.log(`   ${activeHierarchy || 'ORIGINAL'}: ${_count} users`);
    });

    const totalUsers = await prisma.user.count();
    const totalAdmins = await prisma.user.count({
      where: {
        adminLevel: { not: AdminLevel.USER }
      }
    });
    const totalRegularUsers = await prisma.user.count({
      where: {
        adminLevel: AdminLevel.USER
      }
    });

    console.log(`\n📈 Total Statistics:`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Regular Users: ${totalRegularUsers}`);
    console.log(`   Admins: ${totalAdmins}`);
    console.log(`\n✅ All admins are users first (they have User records with role='ADMIN' or appropriate adminLevel)`);
    
    // Show sample credentials
    console.log(`\n🔑 Sample Test Credentials:`);
    console.log(`   Password for all users: ${DEFAULT_PASSWORD}`);
    const sampleUsers = await prisma.user.findMany({
      take: 5,
      include: { profile: true },
      orderBy: { createdAt: 'desc' }
    });
    sampleUsers.forEach(user => {
      console.log(`   - ${user.email} / ${user.mobileNumber} (${user.adminLevel})`);
    });
    
    console.log(`\n✨ Test users seed completed successfully!`);

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
