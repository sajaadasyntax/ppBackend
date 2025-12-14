import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
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

/**
 * Script to assign all users (except root/admin users) to districts
 * 
 * This script:
 * 1. Fetches all users from the database
 * 2. Fetches all active districts
 * 3. Assigns each user (except ADMIN level users) to a district
 * 4. Updates the user's hierarchy chain (districtId, adminUnitId, localityId, regionId, nationalLevelId)
 * 5. Sets activeHierarchy to 'ORIGINAL' if not already set
 */

async function assignUsersToDistricts() {
  try {
    console.log('🚀 Starting user-to-district assignment...\n');

    // Get all users except ADMIN level users
    const users = await prisma.user.findMany({
      where: {
        adminLevel: {
          not: 'ADMIN'
        }
      },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        adminLevel: true,
        activeHierarchy: true,
        // Current hierarchy assignments
        nationalLevelId: true,
        regionId: true,
        localityId: true,
        adminUnitId: true,
        districtId: true,
      }
    });

    console.log(`📊 Found ${users.length} users to process (excluding ADMIN users)\n`);

    if (users.length === 0) {
      console.log('✅ No users to assign. Exiting.');
      return;
    }

    // Get all active districts with their full hierarchy chain
    const districts = await prisma.district.findMany({
      where: {
        active: true
      },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: {
                region: {
                  include: {
                    nationalLevel: true
                  }
                }
              }
            }
          }
        }
      }
    });

    console.log(`📊 Found ${districts.length} active districts\n`);

    if (districts.length === 0) {
      console.error('❌ Error: No active districts found in database.');
      console.error('   Please create districts first before running this script.');
      return;
    }

    // Track statistics
    let assigned = 0;
    let alreadyAssigned = 0;
    let errors = 0;

    // Process each user
    for (const user of users) {
      try {
        // Check if user already has a district assigned
        if (user.districtId) {
          console.log(`⏭️  User ${user.email || user.mobileNumber} already has district assigned. Skipping.`);
          alreadyAssigned++;
          continue;
        }

        // Select a district (round-robin distribution)
        const districtIndex = assigned % districts.length;
        const selectedDistrict = districts[districtIndex];

        if (!selectedDistrict.adminUnit || !selectedDistrict.adminUnit.locality || 
            !selectedDistrict.adminUnit.locality.region || 
            !selectedDistrict.adminUnit.locality.region.nationalLevel) {
          console.error(`⚠️  District ${selectedDistrict.id} has incomplete hierarchy chain. Skipping.`);
          errors++;
          continue;
        }

        const adminUnit = selectedDistrict.adminUnit;
        const locality = adminUnit.locality;
        const region = locality.region;
        const nationalLevel = region.nationalLevel;

        // Update user with district and full hierarchy chain
        await prisma.user.update({
          where: { id: user.id },
          data: {
            districtId: selectedDistrict.id,
            adminUnitId: adminUnit.id,
            localityId: locality.id,
            regionId: region.id,
            nationalLevelId: nationalLevel.id,
            activeHierarchy: user.activeHierarchy || 'ORIGINAL',
          }
        });

        console.log(`✅ Assigned user ${user.email || user.mobileNumber} to district: ${selectedDistrict.name} (${selectedDistrict.id})`);
        assigned++;
      } catch (error: any) {
        console.error(`❌ Error assigning user ${user.email || user.mobileNumber}:`, error.message);
        errors++;
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📈 Assignment Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Successfully assigned: ${assigned} users`);
    console.log(`⏭️  Already assigned: ${alreadyAssigned} users`);
    console.log(`❌ Errors: ${errors} users`);
    console.log(`📊 Total processed: ${users.length} users`);
    console.log('='.repeat(60) + '\n');

  } catch (error: any) {
    console.error('❌ Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

// Run the script
assignUsersToDistricts()
  .then(() => {
    console.log('✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
