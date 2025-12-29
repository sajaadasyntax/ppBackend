import { PrismaClient, Region, ExpatriateRegion, SectorNationalLevel, SectorRegion, SectorLocality, SectorAdminUnit, SectorDistrict } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { createSectorsForLevel } from '../src/utils/sectorCreation';

// Load environment variables - ts-node needs explicit dotenv loading
const envPath = resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL is not set in environment variables.');
  console.error(`   Looking for .env file at: ${envPath}`);
  console.error('   Please ensure .env file exists in the project root with DATABASE_URL set.');
  process.exit(1);
}

// Prisma 7.x requires adapter pattern for PostgreSQL
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ 
  adapter,
  log: ['warn', 'error'],
  errorFormat: 'pretty'
});

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
  // Comprehensive list of all 18 Sudanese states (ولايات)
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
            { name: "الخرطوم شرق", districts: ["الجريف شرق", "الموردة", "الصباحي", "الرياض"] },
            { name: "الخرطوم وسط", districts: ["الوسط", "الشهداء", "الثورة", "الخرطوم القديمة"] },
            { name: "الخرطوم غرب", districts: ["الريف الغربي", "الأزهري", "الصوفية", "المنشية"] }
          ]
        },
        {
          name: "محلية أم درمان",
          code: "KH02",
          adminUnits: [
            { name: "أم درمان شرق", districts: ["العرب", "الموجه", "الصالحة", "العباسية"] },
            { name: "أم درمان غرب", districts: ["الثورة", "ود البشير", "الحلة الجديدة", "الفتيحاب"] },
            { name: "أم درمان شمال", districts: ["كرري", "الحلفايا", "الشجرة", "الطابية"] }
          ]
        },
        {
          name: "محلية بحري",
          code: "KH03",
          adminUnits: [
            { name: "بحري شرق", districts: ["الخرطوم بحري", "الكدرو", "اليرموك", "السوق"] },
            { name: "بحري غرب", districts: ["شرق النيل", "الحلفايا الجديدة", "الساحة الخضراء", "المنطقة الصناعية"] }
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
            { name: "الأبيض المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "الأبيض الريف", districts: ["الريف الشمالي", "الريف الجنوبي", "الريف الشرقي"] }
          ]
        },
        {
          name: "محلية بارا",
          code: "NK02",
          adminUnits: [
            { name: "بارا المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "بارا الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
          name: "محلية كادوقلي",
          code: "SK01",
          adminUnits: [
            { name: "كادوقلي المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "كادوقلي الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية الدلنج",
          code: "SK02",
          adminUnits: [
            { name: "الدلنج المدينة", districts: ["الوسط", "الشمال", "الجنوب"] }
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
            { name: "الفولة المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الفولة الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "دنقلا المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "دنقلا الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية مروي",
          code: "NO02",
          adminUnits: [
            { name: "مروي المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "مروي الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "الدامر المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الدامر الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية عطبرة",
          code: "RN02",
          adminUnits: [
            { name: "عطبرة المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "عطبرة الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "بورتسودان المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الميناء"] },
            { name: "بورتسودان الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية سواكن",
          code: "RS02",
          adminUnits: [
            { name: "سواكن المدينة", districts: ["الوسط", "الشمال", "الجنوب"] }
          ]
        }
      ]
    },
    {
      name: "كسلا",
      nameEn: "Kassala",
      code: "KA",
      localities: [
        {
          name: "محلية كسلا",
          code: "KA01",
          adminUnits: [
            { name: "كسلا المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "كسلا الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية القضارف",
          code: "KA02",
          adminUnits: [
            { name: "القضارف المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "القضارف الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        }
      ]
    },
    {
      name: "القضارف",
      nameEn: "Gedaref",
      code: "GD",
      localities: [
        {
          name: "محلية القضارف",
          code: "GD01",
          adminUnits: [
            { name: "القضارف المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "القضارف الريف", districts: ["الريف الشمالي", "الريف الجنوبي", "الريف الشرقي"] }
          ]
        },
        {
          name: "محلية الفاو",
          code: "GD02",
          adminUnits: [
            { name: "الفاو المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الفاو الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "ود مدني المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق", "الغرب"] },
            { name: "ود مدني الريف", districts: ["الريف الشمالي", "الريف الجنوبي", "الريف الشرقي"] }
          ]
        },
        {
          name: "محلية الحصاحيصا",
          code: "GZ02",
          adminUnits: [
            { name: "الحصاحيصا المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الحصاحيصا الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية المناقل",
          code: "GZ03",
          adminUnits: [
            { name: "المناقل المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "المناقل الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
          name: "محلية سنار",
          code: "SN01",
          adminUnits: [
            { name: "سنار المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "سنار الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية سنجة",
          code: "SN02",
          adminUnits: [
            { name: "سنجة المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "سنجة الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "الدمازين المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الدمازين الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية الروصيرص",
          code: "BN02",
          adminUnits: [
            { name: "الروصيرص المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الروصيرص الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
          name: "محلية كوستي",
          code: "WN01",
          adminUnits: [
            { name: "كوستي المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "كوستي الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية ربك",
          code: "WN02",
          adminUnits: [
            { name: "ربك المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "ربك الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "الفاشر المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق", "الغرب"] },
            { name: "الفاشر الريف", districts: ["الريف الشمالي", "الريف الجنوبي", "الريف الشرقي"] }
          ]
        },
        {
          name: "محلية كبكابية",
          code: "ND02",
          adminUnits: [
            { name: "كبكابية المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "كبكابية الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "نيالا المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق", "الغرب"] },
            { name: "نيالا الريف", districts: ["الريف الشمالي", "الريف الجنوبي", "الريف الشرقي"] }
          ]
        },
        {
          name: "محلية كاس",
          code: "SD02",
          adminUnits: [
            { name: "كاس المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "كاس الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "الجنينة المدينة", districts: ["الوسط", "الشمال", "الجنوب", "الشرق"] },
            { name: "الجنينة الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية زالنجي",
          code: "WD02",
          adminUnits: [
            { name: "زالنجي المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "زالنجي الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "زالنجي المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "زالنجي الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية أم كدادة",
          code: "CD02",
          adminUnits: [
            { name: "أم كدادة المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "أم كدادة الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية الفردوس",
          code: "CD03",
          adminUnits: [
            { name: "الفردوس المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الفردوس الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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
            { name: "الضعين المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "الضعين الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
          ]
        },
        {
          name: "محلية عد الفرسان",
          code: "ED02",
          adminUnits: [
            { name: "عد الفرسان المدينة", districts: ["الوسط", "الشمال", "الجنوب"] },
            { name: "عد الفرسان الريف", districts: ["الريف الشمالي", "الريف الجنوبي"] }
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

    // Create sectors for the region automatically
    await createSectorsForLevel('region', region.id, region.name, prisma);

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

      // Create sectors for the locality automatically
      await createSectorsForLevel('locality', locality.id, locality.name, prisma);

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

        // Create sectors for the admin unit automatically
        await createSectorsForLevel('adminUnit', adminUnit.id, adminUnit.name, prisma);

        // 5. Create Districts (MUST belong to AdminUnit)
        for (const districtName of adminUnitData.districts) {
          console.log(`        Creating district: ${districtName}`);
          
          const districtCode = `${adminUnit.code || adminUnitCode}-${districtName}`;
          const district = await prisma.district.upsert({
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

          // Create sectors for the district automatically
          await createSectorsForLevel('district', district.id, district.name, prisma);
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

// ==================== FIX ORPHANED REGIONS ====================

async function fixOrphanedRegions() {
  console.log('\n🔧 Fixing orphaned regions (regions without national level parent)...');
  
  // Get or create default national level
  let nationalLevel = await prisma.nationalLevel.findFirst({
    where: { active: true }
  });
  
  if (!nationalLevel) {
    nationalLevel = await prisma.nationalLevel.create({
      data: {
        name: 'المستوى القومي',
        code: 'NATIONAL',
        description: 'المستوى القومي الأعلى',
        active: true
      }
    });
  }
  
  // Find all regions without a national level parent using raw query (to bypass strict typing)
  const orphanedRegions = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id" FROM "Region" WHERE "nationalLevelId" IS NULL
  `;
  
  if (orphanedRegions.length > 0) {
    console.log(`  Found ${orphanedRegions.length} orphaned regions, fixing...`);
    
    // Update all orphaned regions to have the default national level
    await prisma.$executeRaw`
      UPDATE "Region"
      SET "nationalLevelId" = ${nationalLevel.id}
      WHERE "nationalLevelId" IS NULL
    `;
    
    console.log(`  ✅ Fixed ${orphanedRegions.length} orphaned regions`);
  } else {
    console.log('  ✅ No orphaned regions found');
  }
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
    
    // Step 4: Fix any orphaned regions (regions without national level parent)
    await fixOrphanedRegions();
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Users: 3');
    console.log('  - National Level: 1');
    console.log('  - Regions (ولايات): 18');
    console.log('  - Localities: Multiple per region');
    console.log('  - Admin Units: Multiple per locality');
    console.log('  - Districts: Multiple per admin unit');
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
