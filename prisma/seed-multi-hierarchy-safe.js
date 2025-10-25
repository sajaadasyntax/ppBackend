// Safe seed script that checks for model availability
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Starting multi-hierarchy seed...');
    
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Check if models exist
    console.log('Checking available models...');
    
    if (!prisma.nationalLevel) {
      throw new Error('NationalLevel model not found. Please run: npx prisma generate');
    }
    
    if (!prisma.expatriateRegion) {
      throw new Error('ExpatriateRegion model not found. Please run: npx prisma generate');
    }
    
    if (!prisma.sectorNationalLevel) {
      throw new Error('SectorNationalLevel model not found. Please run: npx prisma generate');
    }
    
    console.log('✅ All required models are available');

    // ===== SEED NATIONAL LEVEL =====
    console.log('Creating National Level...');
    const nationalLevel = await prisma.nationalLevel.upsert({
      where: { code: 'NATIONAL' },
      update: {},
      create: {
        name: 'المستوى القومي',
        code: 'NATIONAL',
        description: 'المستوى القومي الأعلى',
        active: true
      }
    });
    console.log('National Level created:', nationalLevel.name);

    // ===== SEED EXPATRIATE REGIONS =====
    console.log('\nCreating Expatriate Regions...');
    
    const expatriateRegions = [
      { name: 'قطاع الخليج', code: 'GCC', description: 'دول مجلس التعاون الخليجي' },
      { name: 'قطاع السعودية', code: 'KSA', description: 'المملكة العربية السعودية' },
      { name: 'قطاع العراق و الشام', code: 'LEVANT', description: 'العراق وسوريا ولبنان والأردن' },
      { name: 'قطاع تركيا', code: 'TURKEY', description: 'جمهورية تركيا' },
      { name: 'قطاع شرق اسيا', code: 'EAST_ASIA', description: 'الصين واليابان وكوريا وسنغافورة' },
      { name: 'قطاع مصر', code: 'EGYPT', description: 'جمهورية مصر العربية' },
      { name: 'شرق ووسط افريقيا', code: 'EAST_AFRICA', description: 'إثيوبيا وكينيا وتنزانيا وأوغندا' },
      { name: 'قطاع شمال أفريقيا', code: 'NORTH_AFRICA', description: 'ليبيا وتونس والجزائر والمغرب' },
      { name: 'قطاع افريقيا', code: 'AFRICA', description: 'جنوب أفريقيا ونيجيريا وغانا' },
      { name: 'قطاع أروبا', code: 'EUROPE', description: 'ألمانيا وفرنسا وبريطانيا وإيطاليا' },
      { name: 'قطاع امريكا وكندا', code: 'AMERICAS', description: 'الولايات المتحدة وكندا' },
      { name: 'قطاع استراليا', code: 'AUSTRALIA', description: 'أستراليا ونيوزيلندا' },
      { name: 'قطاع امريكا الجنوبية', code: 'SOUTH_AMERICA', description: 'البرازيل والأرجنتين وتشيلي' }
    ];

    const createdRegions = [];
    for (const region of expatriateRegions) {
      const expatriateRegion = await prisma.expatriateRegion.upsert({
        where: { name: region.name },
        update: {},
        create: {
          name: region.name,
          code: region.code,
          description: region.description,
          active: true
        }
      });
      createdRegions.push(expatriateRegion);
      console.log(`  Created: ${expatriateRegion.name}`);
    }

    console.log(`\nCreated ${createdRegions.length} expatriate regions`);

    // ===== SEED SAMPLE SECTOR DATA =====
    console.log('\nCreating sample sector data...');
    
    const sectorTypes = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];
    const sectorTypeNames = {
      'SOCIAL': 'الاجتماعي',
      'ECONOMIC': 'الاقتصادي', 
      'ORGANIZATIONAL': 'التنظيمي',
      'POLITICAL': 'السياسي'
    };

    // Create sector national levels for each type
    for (const sectorType of sectorTypes) {
      const sectorNationalLevel = await prisma.sectorNationalLevel.upsert({
        where: { code: `SECTOR-NATIONAL-${sectorType}` },
        update: {},
        create: {
          name: `المستوى القومي - ${sectorTypeNames[sectorType]}`,
          code: `SECTOR-NATIONAL-${sectorType}`,
          sectorType: sectorType,
          description: `القطاع ${sectorTypeNames[sectorType]} على المستوى القومي`,
          active: true
        }
      });
      console.log(`  Created sector national level: ${sectorNationalLevel.name}`);
    }

    // Create sector levels for one expatriate region (قطاع الخليج)
    const firstExpatRegion = createdRegions[0]; // قطاع الخليج
    for (const sectorType of sectorTypes) {
      const sectorNationalLevel = await prisma.sectorNationalLevel.upsert({
        where: { code: `SECTOR-${firstExpatRegion.code}-${sectorType}` },
        update: {},
        create: {
          name: `${firstExpatRegion.name} - ${sectorTypeNames[sectorType]}`,
          code: `SECTOR-${firstExpatRegion.code}-${sectorType}`,
          sectorType: sectorType,
          description: `القطاع ${sectorTypeNames[sectorType]} في ${firstExpatRegion.name}`,
          active: true,
          expatriateRegionId: firstExpatRegion.id
        }
      });
      console.log(`  Created sector for ${firstExpatRegion.name}: ${sectorNationalLevel.name}`);
    }

    console.log('\nMulti-hierarchy seed completed successfully!');
  } catch (error) {
    console.error('Error seeding multi-hierarchy data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error('Error seeding multi-hierarchy data:', e);
    process.exit(1);
  });
