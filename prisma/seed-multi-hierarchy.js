const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting multi-hierarchy seed...');

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

  const expatriateRegions = [];
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
    console.log(`  Created: ${region.name}`);
  }
  console.log(`\nCreated ${expatriateRegions.length} expatriate regions`);

  // ===== SEED SAMPLE SECTOR DATA =====
  console.log('\nCreating sample sector data...');
  
  // Create sector types for each sector
  const sectorTypes = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];
  const sectorTypeNames = {
    SOCIAL: 'الاجتماعي',
    ECONOMIC: 'الاقتصادي',
    ORGANIZATIONAL: 'التنظيمي',
    POLITICAL: 'السياسي'
  };

  // Create a sample sector national level for each type
  for (const sectorType of sectorTypes) {
    const sectorNationalLevel = await prisma.sectorNationalLevel.upsert({
      where: { code: `SECTOR-NAT-${sectorType}` },
      update: {},
      create: {
        name: `المستوى القومي - ${sectorTypeNames[sectorType]}`,
        code: `SECTOR-NAT-${sectorType}`,
        sectorType: sectorType,
        description: `القطاع ${sectorTypeNames[sectorType]} على المستوى القومي`,
        active: true
      }
    });
    console.log(`  Created sector national level: ${sectorNationalLevel.name}`);
  }

  // Create sample sector data linked to first expatriate region
  // (just as an example - more can be created via admin panel)
  const firstExpatRegion = expatriateRegions[0];
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
}

main()
  .catch((e) => {
    console.error('Error seeding multi-hierarchy data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

