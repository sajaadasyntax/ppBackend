const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');

/**
 * Migration script to add hierarchical user structure to the database
 * This script should be run after applying the schema changes via Prisma migration
 */
async function migrate() {
  console.log('Starting hierarchical user structure migration...');
  
  try {
    // Step 1: Create a general secretariat user if it doesn't exist
    console.log('Creating general secretariat user...');
    const generalSecretariatEmail = 'general-secretariat@example.com';
    const existingGS = await prisma.user.findUnique({
      where: { email: generalSecretariatEmail }
    });
    
    if (!existingGS) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: generalSecretariatEmail,
          password: hashedPassword,
          role: 'GENERAL_SECRETARIAT',
          adminLevel: 'GENERAL_SECRETARIAT',
          profile: {
            create: {
              firstName: 'الأمانة',
              lastName: 'العامة',
              status: 'active'
            }
          }
        }
      });
      console.log('General secretariat user created successfully');
    } else {
      // Update existing user to have the correct role and adminLevel
      await prisma.user.update({
        where: { email: generalSecretariatEmail },
        data: {
          role: 'GENERAL_SECRETARIAT',
          adminLevel: 'GENERAL_SECRETARIAT'
        }
      });
      console.log('General secretariat user updated successfully');
    }
    
    // Step 2: Create some example regions
    console.log('Creating example regions...');
    const regions = [
      { name: 'ولاية الخرطوم', code: 'KRT' },
      { name: 'ولاية الجزيرة', code: 'JZR' },
      { name: 'ولاية النيل الأبيض', code: 'WNL' }
    ];
    
    const createdRegions = [];
    for (const region of regions) {
      const existingRegion = await prisma.region.findFirst({
        where: { name: region.name }
      });
      
      if (!existingRegion) {
        const createdRegion = await prisma.region.create({
          data: region
        });
        createdRegions.push(createdRegion);
        console.log(`Region "${region.name}" created with ID: ${createdRegion.id}`);
      } else {
        createdRegions.push(existingRegion);
        console.log(`Region "${region.name}" already exists with ID: ${existingRegion.id}`);
      }
    }
    
    // Step 3: Create example localities for the first region
    console.log('Creating example localities...');
    const localities = [
      { name: 'محلية الخرطوم', code: 'KRT-01', regionId: createdRegions[0].id },
      { name: 'محلية بحري', code: 'KRT-02', regionId: createdRegions[0].id },
      { name: 'محلية أم درمان', code: 'KRT-03', regionId: createdRegions[0].id }
    ];
    
    const createdLocalities = [];
    for (const locality of localities) {
      const existingLocality = await prisma.locality.findFirst({
        where: { 
          name: locality.name,
          regionId: locality.regionId
        }
      });
      
      if (!existingLocality) {
        const createdLocality = await prisma.locality.create({
          data: locality
        });
        createdLocalities.push(createdLocality);
        console.log(`Locality "${locality.name}" created with ID: ${createdLocality.id}`);
      } else {
        createdLocalities.push(existingLocality);
        console.log(`Locality "${locality.name}" already exists with ID: ${existingLocality.id}`);
      }
    }
    
    // Step 4: Create example administrative units for the first locality
    console.log('Creating example administrative units...');
    const adminUnits = [
      { name: 'وحدة الخرطوم الشرقية', code: 'KRT-01-01', localityId: createdLocalities[0].id },
      { name: 'وحدة الخرطوم الغربية', code: 'KRT-01-02', localityId: createdLocalities[0].id },
      { name: 'وحدة الخرطوم الوسطى', code: 'KRT-01-03', localityId: createdLocalities[0].id }
    ];
    
    const createdAdminUnits = [];
    for (const adminUnit of adminUnits) {
      const existingAdminUnit = await prisma.adminUnit.findFirst({
        where: { 
          name: adminUnit.name,
          localityId: adminUnit.localityId
        }
      });
      
      if (!existingAdminUnit) {
        const createdAdminUnit = await prisma.adminUnit.create({
          data: adminUnit
        });
        createdAdminUnits.push(createdAdminUnit);
        console.log(`Administrative unit "${adminUnit.name}" created with ID: ${createdAdminUnit.id}`);
      } else {
        createdAdminUnits.push(existingAdminUnit);
        console.log(`Administrative unit "${adminUnit.name}" already exists with ID: ${existingAdminUnit.id}`);
      }
    }
    
    // Step 5: Create example districts for the first administrative unit
    console.log('Creating example districts...');
    const districts = [
      { name: 'حي الرياض', code: 'KRT-01-01-01', adminUnitId: createdAdminUnits[0].id },
      { name: 'حي الصحافة', code: 'KRT-01-01-02', adminUnitId: createdAdminUnits[0].id },
      { name: 'حي المعمورة', code: 'KRT-01-01-03', adminUnitId: createdAdminUnits[0].id }
    ];
    
    const createdDistricts = [];
    for (const district of districts) {
      const existingDistrict = await prisma.district.findFirst({
        where: { 
          name: district.name,
          adminUnitId: district.adminUnitId
        }
      });
      
      if (!existingDistrict) {
        const createdDistrict = await prisma.district.create({
          data: district
        });
        createdDistricts.push(createdDistrict);
        console.log(`District "${district.name}" created with ID: ${createdDistrict.id}`);
      } else {
        createdDistricts.push(existingDistrict);
        console.log(`District "${district.name}" already exists with ID: ${existingDistrict.id}`);
      }
    }
    
    // Step 6: Create admin users for each level
    console.log('Creating admin users for each level...');
    
    // Region admin
    const regionAdminEmail = 'region-admin@example.com';
    const existingRegionAdmin = await prisma.user.findUnique({
      where: { email: regionAdminEmail }
    });
    
    if (!existingRegionAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: regionAdminEmail,
          password: hashedPassword,
          role: 'REGION_ADMIN',
          adminLevel: 'REGION',
          regionId: createdRegions[0].id,
          profile: {
            create: {
              firstName: 'مدير',
              lastName: 'الولاية',
              status: 'active'
            }
          }
        }
      });
      console.log('Region admin created successfully');
    } else {
      await prisma.user.update({
        where: { email: regionAdminEmail },
        data: {
          role: 'REGION_ADMIN',
          adminLevel: 'REGION',
          regionId: createdRegions[0].id
        }
      });
      console.log('Region admin updated successfully');
    }
    
    // Locality admin
    const localityAdminEmail = 'locality-admin@example.com';
    const existingLocalityAdmin = await prisma.user.findUnique({
      where: { email: localityAdminEmail }
    });
    
    if (!existingLocalityAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: localityAdminEmail,
          password: hashedPassword,
          role: 'LOCALITY_ADMIN',
          adminLevel: 'LOCALITY',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          profile: {
            create: {
              firstName: 'مدير',
              lastName: 'المحلية',
              status: 'active'
            }
          }
        }
      });
      console.log('Locality admin created successfully');
    } else {
      await prisma.user.update({
        where: { email: localityAdminEmail },
        data: {
          role: 'LOCALITY_ADMIN',
          adminLevel: 'LOCALITY',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id
        }
      });
      console.log('Locality admin updated successfully');
    }
    
    // Admin unit admin
    const adminUnitAdminEmail = 'adminunit-admin@example.com';
    const existingAdminUnitAdmin = await prisma.user.findUnique({
      where: { email: adminUnitAdminEmail }
    });
    
    if (!existingAdminUnitAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: adminUnitAdminEmail,
          password: hashedPassword,
          role: 'ADMIN_UNIT_ADMIN',
          adminLevel: 'ADMIN_UNIT',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          adminUnitId: createdAdminUnits[0].id,
          profile: {
            create: {
              firstName: 'مدير',
              lastName: 'الوحدة الادارية',
              status: 'active'
            }
          }
        }
      });
      console.log('Administrative unit admin created successfully');
    } else {
      await prisma.user.update({
        where: { email: adminUnitAdminEmail },
        data: {
          role: 'ADMIN_UNIT_ADMIN',
          adminLevel: 'ADMIN_UNIT',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          adminUnitId: createdAdminUnits[0].id
        }
      });
      console.log('Administrative unit admin updated successfully');
    }
    
    // District admin
    const districtAdminEmail = 'district-admin@example.com';
    const existingDistrictAdmin = await prisma.user.findUnique({
      where: { email: districtAdminEmail }
    });
    
    if (!existingDistrictAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: districtAdminEmail,
          password: hashedPassword,
          role: 'DISTRICT_ADMIN',
          adminLevel: 'DISTRICT',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          adminUnitId: createdAdminUnits[0].id,
          districtId: createdDistricts[0].id,
          profile: {
            create: {
              firstName: 'مدير',
              lastName: 'الحي',
              status: 'active'
            }
          }
        }
      });
      console.log('District admin created successfully');
    } else {
      await prisma.user.update({
        where: { email: districtAdminEmail },
        data: {
          role: 'DISTRICT_ADMIN',
          adminLevel: 'DISTRICT',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          adminUnitId: createdAdminUnits[0].id,
          districtId: createdDistricts[0].id
        }
      });
      console.log('District admin updated successfully');
    }
    
    // Step 7: Update existing regular users to have district associations
    console.log('Updating existing regular users...');
    const regularUsers = await prisma.user.findMany({
      where: {
        role: 'USER',
        districtId: null
      },
      take: 10 // Only update a few users for example purposes
    });
    
    for (const [index, user] of regularUsers.entries()) {
      // Distribute users across the created districts
      const districtIndex = index % createdDistricts.length;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          adminLevel: 'USER',
          regionId: createdRegions[0].id,
          localityId: createdLocalities[0].id,
          adminUnitId: createdAdminUnits[0].id,
          districtId: createdDistricts[districtIndex].id
        }
      });
      console.log(`Updated user ${user.email} to be associated with district ${createdDistricts[districtIndex].name}`);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute migration
migrate()
  .then(() => {
    console.log('Hierarchy structure migration completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration script error:', error);
    process.exit(1);
  });
