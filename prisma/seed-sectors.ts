/**
 * Seed script to initialize sectors for existing hierarchies
 * This creates the 4 fixed sector types (SOCIAL, ECONOMIC, ORGANIZATIONAL, POLITICAL)
 * for each level of BOTH:
 * - Geographic hierarchy (Region, Locality, AdminUnit, District)
 * - Expatriate hierarchy (ExpatriateRegion → SectorNationalLevel)
 * 
 * Run with: npx ts-node prisma/seed-sectors.ts
 */

import { PrismaClient, SectorType } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

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

// Prisma 7.x uses the adapter pattern for database connections
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const FIXED_SECTOR_TYPES: SectorType[] = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];

const sectorTypeNames: Record<SectorType, string> = {
  SOCIAL: 'الاجتماعي',
  ECONOMIC: 'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL: 'السياسي'
};

function encodeSectorMetadata(sourceEntityId: string, sourceLevel: string): string {
  return `SOURCE:${sourceLevel}:${sourceEntityId}`;
}

// ==================== EXPATRIATE HIERARCHY SECTORS ====================

async function seedSectorsForExpatriateRegions() {
  console.log('\n🌍 Creating sectors for EXPATRIATE REGIONS...');
  
  const expatriateRegions = await prisma.expatriateRegion.findMany({
    select: { id: true, name: true }
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const expatriateRegion of expatriateRegions) {
    for (const sectorType of FIXED_SECTOR_TYPES) {
      // Check if sector already exists
      const existing = await prisma.sectorNationalLevel.findFirst({
        where: {
          sectorType,
          expatriateRegionId: expatriateRegion.id
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      await prisma.sectorNationalLevel.create({
        data: {
          name: `${expatriateRegion.name} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          expatriateRegionId: expatriateRegion.id
        }
      });
      created++;
    }
  }
  
  console.log(`  ✅ Created ${created} sector national levels for expatriates (skipped ${skipped} existing)`);
}

// ==================== GEOGRAPHIC HIERARCHY SECTORS ====================

async function seedSectorsForRegions() {
  console.log('\n🏛️ Creating sectors for REGIONS...');
  
  const regions = await prisma.region.findMany({
    select: { id: true, name: true }
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const region of regions) {
    for (const sectorType of FIXED_SECTOR_TYPES) {
      // Check if sector already exists
      const existing = await prisma.sectorRegion.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { name: { startsWith: `${region.name} -` } },
            { description: { contains: `region:${region.id}` } }
          ]
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      await prisma.sectorRegion.create({
        data: {
          name: `${region.name} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          description: encodeSectorMetadata(region.id, 'region')
          // No expatriateRegionId = original geographic hierarchy
        }
      });
      created++;
    }
  }
  
  console.log(`  ✅ Created ${created} sector regions (skipped ${skipped} existing)`);
}

async function seedSectorsForLocalities() {
  console.log('\n🏘️ Creating sectors for LOCALITIES...');
  
  const localities = await prisma.locality.findMany({
    select: { id: true, name: true, regionId: true, region: { select: { name: true } } }
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const locality of localities) {
    for (const sectorType of FIXED_SECTOR_TYPES) {
      // Check if sector already exists
      const existing = await prisma.sectorLocality.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { name: { startsWith: `${locality.name} -` } },
            { description: { contains: `locality:${locality.id}` } }
          ]
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Find parent sector region
      const parentSectorRegion = await prisma.sectorRegion.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { description: { contains: `region:${locality.regionId}` } },
            { name: { startsWith: `${locality.region?.name} -` } }
          ]
        },
        select: { id: true }
      });
      
      await prisma.sectorLocality.create({
        data: {
          name: `${locality.name} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          sectorRegionId: parentSectorRegion?.id || null,
          description: encodeSectorMetadata(locality.id, 'locality')
        }
      });
      created++;
    }
  }
  
  console.log(`  ✅ Created ${created} sector localities (skipped ${skipped} existing)`);
}

async function seedSectorsForAdminUnits() {
  console.log('\n🏢 Creating sectors for ADMIN UNITS...');
  
  const adminUnits = await prisma.adminUnit.findMany({
    select: { id: true, name: true, localityId: true, locality: { select: { name: true } } }
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const adminUnit of adminUnits) {
    for (const sectorType of FIXED_SECTOR_TYPES) {
      // Check if sector already exists
      const existing = await prisma.sectorAdminUnit.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { name: { startsWith: `${adminUnit.name} -` } },
            { description: { contains: `adminUnit:${adminUnit.id}` } }
          ]
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Find parent sector locality
      const parentSectorLocality = await prisma.sectorLocality.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { description: { contains: `locality:${adminUnit.localityId}` } },
            { name: { startsWith: `${adminUnit.locality?.name} -` } }
          ]
        },
        select: { id: true }
      });
      
      await prisma.sectorAdminUnit.create({
        data: {
          name: `${adminUnit.name} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          sectorLocalityId: parentSectorLocality?.id || null,
          description: encodeSectorMetadata(adminUnit.id, 'adminUnit')
        }
      });
      created++;
    }
  }
  
  console.log(`  ✅ Created ${created} sector admin units (skipped ${skipped} existing)`);
}

async function seedSectorsForDistricts() {
  console.log('\n🏠 Creating sectors for DISTRICTS...');
  
  const districts = await prisma.district.findMany({
    select: { id: true, name: true, adminUnitId: true, adminUnit: { select: { name: true } } }
  });
  
  let created = 0;
  let skipped = 0;
  
  for (const district of districts) {
    for (const sectorType of FIXED_SECTOR_TYPES) {
      // Check if sector already exists
      const existing = await prisma.sectorDistrict.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { name: { startsWith: `${district.name} -` } },
            { description: { contains: `district:${district.id}` } }
          ]
        }
      });
      
      if (existing) {
        skipped++;
        continue;
      }
      
      // Find parent sector admin unit
      const parentSectorAdminUnit = await prisma.sectorAdminUnit.findFirst({
        where: {
          sectorType,
          expatriateRegionId: null,
          OR: [
            { description: { contains: `adminUnit:${district.adminUnitId}` } },
            { name: { startsWith: `${district.adminUnit?.name} -` } }
          ]
        },
        select: { id: true }
      });
      
      await prisma.sectorDistrict.create({
        data: {
          name: `${district.name} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          sectorAdminUnitId: parentSectorAdminUnit?.id || null,
          description: encodeSectorMetadata(district.id, 'district')
        }
      });
      created++;
    }
  }
  
  console.log(`  ✅ Created ${created} sector districts (skipped ${skipped} existing)`);
}

async function showSummary() {
  console.log('\n📊 SECTOR SUMMARY:');
  
  // Geographic hierarchy counts
  const regionsCount = await prisma.region.count();
  const localitiesCount = await prisma.locality.count();
  const adminUnitsCount = await prisma.adminUnit.count();
  const districtsCount = await prisma.district.count();
  
  const sectorRegionsCount = await prisma.sectorRegion.count({ where: { expatriateRegionId: null } });
  const sectorLocalitiesCount = await prisma.sectorLocality.count({ where: { expatriateRegionId: null } });
  const sectorAdminUnitsCount = await prisma.sectorAdminUnit.count({ where: { expatriateRegionId: null } });
  const sectorDistrictsCount = await prisma.sectorDistrict.count({ where: { expatriateRegionId: null } });
  
  console.log('\n  📍 GEOGRAPHIC HIERARCHY:');
  console.log(`    - Regions: ${regionsCount} → Sector Regions: ${sectorRegionsCount} (expected: ${regionsCount * 4})`);
  console.log(`    - Localities: ${localitiesCount} → Sector Localities: ${sectorLocalitiesCount} (expected: ${localitiesCount * 4})`);
  console.log(`    - Admin Units: ${adminUnitsCount} → Sector Admin Units: ${sectorAdminUnitsCount} (expected: ${adminUnitsCount * 4})`);
  console.log(`    - Districts: ${districtsCount} → Sector Districts: ${sectorDistrictsCount} (expected: ${districtsCount * 4})`);
  
  // Expatriate hierarchy counts
  const expatriateRegionsCount = await prisma.expatriateRegion.count();
  const sectorNationalLevelsCount = await prisma.sectorNationalLevel.count();
  const expSectorRegionsCount = await prisma.sectorRegion.count({ where: { expatriateRegionId: { not: null } } });
  
  console.log('\n  🌍 EXPATRIATE HIERARCHY:');
  console.log(`    - Expatriate Regions: ${expatriateRegionsCount} → Sector National Levels: ${sectorNationalLevelsCount} (expected: ${expatriateRegionsCount * 4})`);
  console.log(`    - Sector Regions (Expatriate): ${expSectorRegionsCount}`);
}

async function main() {
  console.log('🚀 Starting sector initialization for BOTH hierarchies...\n');
  console.log('='.repeat(60));
  
  try {
    // Show current counts
    console.log('\n📈 BEFORE:');
    await showSummary();
    
    // ==================== EXPATRIATE HIERARCHY ====================
    console.log('\n' + '='.repeat(60));
    console.log('🌍 EXPATRIATE HIERARCHY SECTORS');
    console.log('='.repeat(60));
    await seedSectorsForExpatriateRegions();
    
    // ==================== GEOGRAPHIC HIERARCHY ====================
    console.log('\n' + '='.repeat(60));
    console.log('📍 GEOGRAPHIC HIERARCHY SECTORS');
    console.log('='.repeat(60));
    // Create sectors for each level (order matters - parents first)
    await seedSectorsForRegions();
    await seedSectorsForLocalities();
    await seedSectorsForAdminUnits();
    await seedSectorsForDistricts();
    
    // Show final counts
    console.log('\n📈 AFTER:');
    await showSummary();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sector initialization complete!');
    console.log('\nYou can now manage sector members in the admin panel:');
    console.log('  - /dashboard/sectors (for both geographic and expatriate)');
    console.log('  - /dashboard/hierarchy/sectors (for geographic only)');
    
  } catch (error) {
    console.error('❌ Error during sector initialization:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

