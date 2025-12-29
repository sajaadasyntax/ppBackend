#!/usr/bin/env node

/**
 * Check Prisma migration status and apply if needed
 * Run this on production: node check-migrations.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('🔍 Checking Prisma Migration Status...\n');

  const migrationsDir = path.join(__dirname, 'prisma', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.error('❌ Error: prisma/migrations directory not found!');
    process.exit(1);
  }

  // Get list of migration directories
  const migrations = fs.readdirSync(migrationsDir)
    .filter(item => {
      const itemPath = path.join(migrationsDir, item);
      return fs.statSync(itemPath).isDirectory() && item.match(/^\d{14}_/);
    })
    .sort();

  console.log(`Found ${migrations.length} migration(s) in codebase:`);
  migrations.forEach(m => console.log(`  - ${m}`));
  console.log('');

  // Check migration status
  console.log('Checking database migration status...');
  try {
    const statusOutput = execSync('npx prisma migrate status', {
      encoding: 'utf8',
      cwd: __dirname,
      stdio: 'pipe'
    });
    
    console.log(statusOutput);
    
    if (statusOutput.includes('Database schema is up to date')) {
      console.log('✅ All migrations are applied!\n');
    } else if (statusOutput.includes('migrations have not yet been applied')) {
      console.log('⚠️  Pending migrations detected!\n');
      
      const answer = await question('Do you want to apply pending migrations? (yes/no): ');
      if (answer.toLowerCase() === 'yes') {
        console.log('\nApplying migrations...');
        try {
          execSync('npx prisma migrate deploy', {
            stdio: 'inherit',
            cwd: __dirname
          });
          console.log('\n✅ Migrations applied successfully!');
        } catch (error) {
          console.error('\n❌ Failed to apply migrations:', error.message);
          process.exit(1);
        }
      } else {
        console.log('Migration cancelled.');
        process.exit(0);
      }
    }
  } catch (error) {
    console.error('❌ Error checking migration status:', error.message);
    console.error('\nThis might indicate:');
    console.error('  1. Database connection issue');
    console.error('  2. Prisma client is out of sync');
    console.error('  3. Migration table doesn\'t exist');
    console.error('\nTrying to apply migrations anyway...\n');
    
    const answer = await question('Do you want to try applying migrations? (yes/no): ');
    if (answer.toLowerCase() === 'yes') {
      try {
        execSync('npx prisma migrate deploy', {
          stdio: 'inherit',
          cwd: __dirname
        });
        console.log('\n✅ Migrations applied!');
      } catch (migError) {
        console.error('\n❌ Migration failed:', migError.message);
        process.exit(1);
      }
    }
  }

  // Regenerate Prisma client
  console.log('\n🔄 Regenerating Prisma client...');
  try {
    execSync('npx prisma generate', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('✅ Prisma client regenerated');
  } catch (error) {
    console.error('❌ Failed to generate Prisma client:', error.message);
    process.exit(1);
  }

  console.log('\n✅ All checks completed!');
  console.log('\nNext steps:');
  console.log('  1. Restart your application: pm2 restart pp-backe');
  console.log('  2. Test admin login');
  console.log('  3. Check logs: pm2 logs pp-backe --lines 50\n');

  rl.close();
}

main().catch(error => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});

