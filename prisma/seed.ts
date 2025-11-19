import { PrismaClient, Region, ExpatriateRegion, SectorNationalLevel, SectorRegion, SectorLocality, SectorAdminUnit, SectorDistrict } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Comprehensive seed file for PP Backend
 * Ensures all hierarchy levels have proper parent-child relationships:
 * - Geographical: NationalLevel -> Region -> Locality -> AdminUnit -> District
 * - Expatriate: ExpatriateRegion -> SectorNationalLevel -> SectorRegion -> SectorLocality -> SectorAdminUnit -> SectorDistrict
 */

// ==================== USERS ====================

async function createUsers() {
  console.log('🌱 Creating users...');
  const adminPassword = await bcrypt.hash('admin123', 10);
  const userPassword = await bcrypt.hash('user123', 10);

  // Root admin
  const rootAdmin = await prisma.user.upsert({
    where: { mobileNumber: '+249123456789' },
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
    where: { mobileNumber: '+249123456790' },
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
    where: { mobileNumber: '+249987654321' },
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

  console.log('✅ Created users:', { 
    rootAdmin: rootAdmin.mobileNumber, 
    admin: admin.mobileNumber, 
    user: user.mobileNumber 
  });
  return { rootAdmin, admin, user };
}

// ==================== GEOGRAPHICAL HIERARCHY ====================

async function createGeographicalHierarchy() {
  console.log('\n🌍 Creating geographical hierarchy...');
  
  // 1. Create or update National Level (top level - no parent)
  // First, try to find existing NationalLevel by code
  let nationalLevel = await prisma.nationalLevel.findUnique({
    where: { code: 'NATIONAL' }
  });
  
  // If not found by code, check if any NationalLevel exists (might have NULL code)
  if (!nationalLevel) {
    const existingNationalLevel = await prisma.nationalLevel.findFirst();
    if (existingNationalLevel) {
      // Update existing one to have the correct code and details
      nationalLevel = await prisma.nationalLevel.update({
        where: { id: existingNationalLevel.id },
        data: {
          name: 'المستوى القومي',
          code: 'NATIONAL',
          description: 'المستوى القومي الأعلى',
          active: true
        }
      });
      console.log('✅ National Level updated:', nationalLevel.name);
    } else {
      // Create new NationalLevel
      nationalLevel = await prisma.nationalLevel.create({
        data: {
          name: 'المستوى القومي',
          code: 'NATIONAL',
          description: 'المستوى القومي الأعلى',
          active: true
        }
      });
      console.log('✅ National Level created:', nationalLevel.name);
    }
  } else {
    // Update existing one to ensure correct details
    nationalLevel = await prisma.nationalLevel.update({
      where: { id: nationalLevel.id },
      data: {
        name: 'المستوى القومي',
        description: 'المستوى القومي الأعلى',
        active: true
      }
    });
    console.log('✅ National Level found and updated:', nationalLevel.name);
  }
  
  // 2. Create Regions (MUST belong to NationalLevel)
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
            { name: "الأبيض المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الأبيض الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "دنقلا المدينة", districts: ["الوسط", "الشمال", "الجنوب"] }
          ]
        }
      ]
    }
  ];

  const createdRegions: Region[] = [];
  
  for (const stateData of sudanData) {
    console.log(`  Creating region: ${stateData.name}`);
    
    // Create Region (MUST have nationalLevelId)
    const region = await prisma.region.upsert({
      where: { code: stateData.code },
      update: {
        nationalLevelId: nationalLevel.id // Ensure parent relationship
      },
      create: {
        name: stateData.name,
        code: stateData.code,
        description: `ولاية ${stateData.name} - ${stateData.nameEn}`,
        active: true,
        nationalLevelId: nationalLevel.id // Required parent
      }
    });
    
    createdRegions.push(region);

    // 3. Create Localities (MUST belong to Region)
    for (const localityData of stateData.localities) {
      console.log(`    Creating locality: ${localityData.name}`);
      
      const locality = await prisma.locality.upsert({
        where: { code: localityData.code || `LOCALITY-${localityData.name}` },
        update: {
          regionId: region.id // Ensure parent relationship
        },
        create: {
          name: localityData.name,
          code: localityData.code,
          regionId: region.id, // Required parent
          description: `محلية ${localityData.name}`,
          active: true
        }
      });

      // 4. Create Administrative Units (MUST belong to Locality)
      for (const adminUnitData of localityData.adminUnits) {
        console.log(`      Creating admin unit: ${adminUnitData.name}`);
        
        const adminUnitCode = `${locality.code || localityData.code}-${adminUnitData.name}`;
        const adminUnit = await prisma.adminUnit.upsert({
          where: { 
            code: adminUnitCode,
          },
          update: {
            localityId: locality.id // Ensure parent relationship
          },
          create: {
            name: adminUnitData.name,
            code: adminUnitCode,
            localityId: locality.id, // Required parent
            description: `وحدة إدارية ${adminUnitData.name}`,
            active: true
          }
        });

        // 5. Create Districts (MUST belong to AdminUnit)
        for (const districtName of adminUnitData.districts) {
          console.log(`        Creating district: ${districtName}`);
          
          const districtCode = `${adminUnit.code || adminUnitCode}-${districtName}`;
          await prisma.district.upsert({
            where: {
              code: districtCode,
            },
            update: {
              adminUnitId: adminUnit.id // Ensure parent relationship
            },
            create: {
              name: districtName,
              code: districtCode,
              adminUnitId: adminUnit.id, // Required parent
              description: `حي ${districtName}`,
              active: true
            }
          });
        }
      }
    }
  }

  console.log(`✅ Created ${createdRegions.length} regions with complete geographical hierarchy`);
  return { nationalLevel, regions: createdRegions };
}

// ==================== EXPATRIATE HIERARCHY ====================

async function createExpatriateHierarchy() {
  console.log('\n🌎 Creating expatriate hierarchy...');
  
  // 1. Create Expatriate Regions (top level - no parent)
  const expatriateRegionNames = [
    'قطاع الخليج',
    'قطاع السعودية',
    'قطاع العراق و الشام',
    'قطاع تركيا',
    'قطاع شرق اسيا',
    'قطاع مصر',
    'شرق ووسط افريقيا',
    'قطاع شمال أفريقيا',
    'قطاع افريقيا',
    'قطاع أروبا',
    'قطاع امريكا وكندا',
    'قطاع استراليا',
    'قطاع امريكا الجنوبية'
  ];

  const expatriateRegions: ExpatriateRegion[] = [];
  for (let i = 0; i < expatriateRegionNames.length; i++) {
    const name = expatriateRegionNames[i];
    const code = `EXPAT-${i + 1}`;
    
    const region = await prisma.expatriateRegion.upsert({
      where: { name },
      update: {},
      create: {
        name,
        code,
        description: `منطقة المغتربين: ${name}`,
        active: true
      }
    });
    
    expatriateRegions.push(region);
    console.log(`  ✅ Created expatriate region: ${region.name}`);
  }
  console.log(`✅ Created ${expatriateRegions.length} expatriate regions`);

  // 2. Create Sector National Levels (MUST belong to ExpatriateRegion)
  const sectorTypes = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'] as const;
  const sectorTypeNames = {
    SOCIAL: 'الاجتماعي',
    ECONOMIC: 'الاقتصادي',
    ORGANIZATIONAL: 'التنظيمي',
    POLITICAL: 'السياسي'
  };

  const sectorNationalLevels: SectorNationalLevel[] = [];
  
  // Create sector national levels for each expatriate region
  for (const expatriateRegion of expatriateRegions) {
    for (const sectorType of sectorTypes) {
      const code = `SECTOR-${expatriateRegion.code}-${sectorType}`;
      const sectorNationalLevel = await prisma.sectorNationalLevel.upsert({
        where: { code },
        update: {
          expatriateRegionId: expatriateRegion.id // Ensure parent relationship
        },
        create: {
          name: `${expatriateRegion.name} - ${sectorTypeNames[sectorType]}`,
          code,
          sectorType,
          description: `القطاع ${sectorTypeNames[sectorType]} في ${expatriateRegion.name}`,
          active: true,
          expatriateRegionId: expatriateRegion.id // Required parent
        }
      });
      sectorNationalLevels.push(sectorNationalLevel);
    }
  }
  console.log(`✅ Created ${sectorNationalLevels.length} sector national levels`);

  // 3. Create Sector Regions (MUST belong to SectorNationalLevel OR ExpatriateRegion)
  // For this seed, we'll create them under SectorNationalLevel
  const sectorRegions: SectorRegion[] = [];
  for (const sectorNationalLevel of sectorNationalLevels.slice(0, 4)) { // Sample: first 4
    const sectorRegion = await prisma.sectorRegion.upsert({
      where: {
        code: `${sectorNationalLevel.code}-REGION-1`
      },
      update: {
        sectorNationalLevelId: sectorNationalLevel.id // Ensure parent relationship
      },
      create: {
        name: `منطقة ${sectorNationalLevel.name}`,
        code: `${sectorNationalLevel.code}-REGION-1`,
        sectorType: sectorNationalLevel.sectorType,
        description: `منطقة قطاعية في ${sectorNationalLevel.name}`,
        active: true,
        sectorNationalLevelId: sectorNationalLevel.id, // Parent relationship
        expatriateRegionId: sectorNationalLevel.expatriateRegionId // Also link to expatriate region
      }
    });
    sectorRegions.push(sectorRegion);
  }
  console.log(`✅ Created ${sectorRegions.length} sector regions`);

  // 4. Create Sector Localities (MUST belong to SectorRegion OR ExpatriateRegion)
  const sectorLocalities: SectorLocality[] = [];
  for (const sectorRegion of sectorRegions.slice(0, 2)) { // Sample: first 2
    const sectorLocality = await prisma.sectorLocality.upsert({
      where: {
        code: `${sectorRegion.code}-LOCALITY-1`
      },
      update: {
        sectorRegionId: sectorRegion.id // Ensure parent relationship
      },
      create: {
        name: `محلية ${sectorRegion.name}`,
        code: `${sectorRegion.code}-LOCALITY-1`,
        sectorType: sectorRegion.sectorType,
        description: `محلية قطاعية في ${sectorRegion.name}`,
        active: true,
        sectorRegionId: sectorRegion.id, // Parent relationship
        expatriateRegionId: sectorRegion.expatriateRegionId // Also link to expatriate region
      }
    });
    sectorLocalities.push(sectorLocality);
  }
  console.log(`✅ Created ${sectorLocalities.length} sector localities`);

  // 5. Create Sector Admin Units (MUST belong to SectorLocality OR ExpatriateRegion)
  const sectorAdminUnits: SectorAdminUnit[] = [];
  for (const sectorLocality of sectorLocalities.slice(0, 1)) { // Sample: first 1
    const sectorAdminUnit = await prisma.sectorAdminUnit.upsert({
      where: {
        code: `${sectorLocality.code}-ADMINUNIT-1`
      },
      update: {
        sectorLocalityId: sectorLocality.id // Ensure parent relationship
      },
      create: {
        name: `وحدة إدارية ${sectorLocality.name}`,
        code: `${sectorLocality.code}-ADMINUNIT-1`,
        sectorType: sectorLocality.sectorType,
        description: `وحدة إدارية قطاعية في ${sectorLocality.name}`,
        active: true,
        sectorLocalityId: sectorLocality.id, // Parent relationship
        expatriateRegionId: sectorLocality.expatriateRegionId // Also link to expatriate region
      }
    });
    sectorAdminUnits.push(sectorAdminUnit);
  }
  console.log(`✅ Created ${sectorAdminUnits.length} sector admin units`);

  // 6. Create Sector Districts (MUST belong to SectorAdminUnit OR ExpatriateRegion)
  const sectorDistricts: SectorDistrict[] = [];
  for (const sectorAdminUnit of sectorAdminUnits) {
    const sectorDistrict = await prisma.sectorDistrict.upsert({
      where: {
        code: `${sectorAdminUnit.code}-DISTRICT-1`
      },
      update: {
        sectorAdminUnitId: sectorAdminUnit.id // Ensure parent relationship
      },
      create: {
        name: `حي ${sectorAdminUnit.name}`,
        code: `${sectorAdminUnit.code}-DISTRICT-1`,
        sectorType: sectorAdminUnit.sectorType,
        description: `حي قطاعي في ${sectorAdminUnit.name}`,
        active: true,
        sectorAdminUnitId: sectorAdminUnit.id, // Parent relationship
        expatriateRegionId: sectorAdminUnit.expatriateRegionId // Also link to expatriate region
      }
    });
    sectorDistricts.push(sectorDistrict);
  }
  console.log(`✅ Created ${sectorDistricts.length} sector districts`);

  return {
    expatriateRegions,
    sectorNationalLevels,
    sectorRegions,
    sectorLocalities,
    sectorAdminUnits,
    sectorDistricts
  };
}

// ==================== MAIN SEED FUNCTION ====================

async function main() {
  console.log('🚀 Starting comprehensive database seed...');
  
  try {
    // Step 1: Create users
    await createUsers();
    
    // Step 2: Create geographical hierarchy (with proper parent relationships)
    await createGeographicalHierarchy();
    
    // Step 3: Create expatriate hierarchy (with proper parent relationships)
    await createExpatriateHierarchy();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Users: 3');
    console.log('  - Geographical hierarchy: Complete');
    console.log('  - Expatriate hierarchy: Complete');
    console.log('\n✨ All hierarchy levels have proper parent-child relationships!');
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
