/**
 * Migration Script: Normalize Mobile Numbers
 * This script normalizes all existing mobile numbers to E.164 format (+249XXXXXXXXX)
 * and handles duplicates before applying the unique constraint
 */

const { PrismaClient } = require('@prisma/client');
const { normalizeMobileNumber } = require('./src/utils/mobileNormalization');

const prisma = new PrismaClient();

async function normalizeMobileNumbers(dryRun = true) {
  console.log('Starting mobile number normalization...');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log('-------------------------------------------');

  try {
    // Fetch all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        role: true,
        profile: {
          select: {
            status: true
          }
        }
      }
    });

    console.log(`Found ${users.length} users to process`);

    const updates = [];
    const errors = [];
    const duplicates = new Map(); // normalized -> [user ids]

    // First pass: normalize and detect duplicates
    for (const user of users) {
      try {
        const normalized = normalizeMobileNumber(user.mobileNumber);
        
        if (!duplicates.has(normalized)) {
          duplicates.set(normalized, []);
        }
        duplicates.get(normalized).push(user);

        if (user.mobileNumber !== normalized) {
          updates.push({
            id: user.id,
            oldMobile: user.mobileNumber,
            newMobile: normalized,
            email: user.email
          });
        }
      } catch (error) {
        errors.push({
          userId: user.id,
          mobile: user.mobileNumber,
          email: user.email,
          error: error.message
        });
      }
    }

    // Report duplicates
    const duplicateGroups = Array.from(duplicates.entries())
      .filter(([_, users]) => users.length > 1);

    if (duplicateGroups.length > 0) {
      console.log('\n⚠️  DUPLICATE MOBILE NUMBERS DETECTED:');
      console.log('=====================================');
      
      for (const [mobile, userGroup] of duplicateGroups) {
        console.log(`\nMobile: ${mobile} (${userGroup.length} users)`);
        userGroup.forEach(u => {
          console.log(`  - ID: ${u.id}, Email: ${u.email || 'N/A'}, Role: ${u.role}, Status: ${u.profile?.status || 'N/A'}`);
        });
        
        if (!dryRun) {
          // Keep the first user (preferring active users), disable others
          const activeUsers = userGroup.filter(u => u.profile?.status === 'active');
          const userToKeep = activeUsers.length > 0 ? activeUsers[0] : userGroup[0];
          
          const usersToDisable = userGroup.filter(u => u.id !== userToKeep.id);
          
          console.log(`  → Keeping user: ${userToKeep.id}`);
          
          for (const userToDisable of usersToDisable) {
            console.log(`  → Disabling user: ${userToDisable.id}`);
            
            // Update profile to disabled
            await prisma.profile.upsert({
              where: { userId: userToDisable.id },
              update: { status: 'disabled' },
              create: {
                userId: userToDisable.id,
                status: 'disabled'
              }
            });
            
            // Append timestamp to mobile to make it unique temporarily
            await prisma.user.update({
              where: { id: userToDisable.id },
              data: {
                mobileNumber: `${normalizeMobileNumber(userToDisable.mobileNumber)}_disabled_${Date.now()}`
              }
            });
          }
        }
      }
    }

    // Report errors
    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      console.log('==========');
      errors.forEach(err => {
        console.log(`User ${err.userId} (${err.email}): ${err.mobile} - ${err.error}`);
      });
    }

    // Report updates
    if (updates.length > 0) {
      console.log(`\n📝 UPDATES NEEDED: ${updates.length}`);
      console.log('==================================');
      updates.forEach(update => {
        console.log(`${update.oldMobile} → ${update.newMobile} (User: ${update.email || update.id})`);
      });

      if (!dryRun) {
        console.log('\nApplying updates...');
        for (const update of updates) {
          await prisma.user.update({
            where: { id: update.id },
            data: { mobileNumber: update.newMobile }
          });
        }
        console.log('✅ Updates applied successfully');
      }
    } else {
      console.log('\n✅ All mobile numbers are already normalized');
    }

    console.log('\n-------------------------------------------');
    console.log('Summary:');
    console.log(`  Total users: ${users.length}`);
    console.log(`  Updates needed: ${updates.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log(`  Duplicate groups: ${duplicateGroups.length}`);
    
    if (dryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.');
      console.log('Run with --live flag to apply changes.');
    }

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
const args = process.argv.slice(2);
const dryRun = !args.includes('--live');

normalizeMobileNumbers(dryRun)
  .then(() => {
    console.log('\n✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

