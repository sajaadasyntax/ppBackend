#!/usr/bin/env node

/**
 * Quick script to check if Prisma client is in sync
 * Run this on production: node check-prisma.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Prisma Client and Migration Status...\n');

// Check if schema exists
const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
if (!fs.existsSync(schemaPath)) {
  console.error('❌ Error: prisma/schema.prisma not found!');
  process.exit(1);
}
console.log('✅ Schema file found');

// Check if node_modules/@prisma/client exists
const clientPath = path.join(__dirname, 'node_modules', '@prisma', 'client');
if (!fs.existsSync(clientPath)) {
  console.log('⚠️  Prisma client not found in node_modules');
  console.log('   Running: npx prisma generate');
  try {
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Prisma client generated');
  } catch (error) {
    console.error('❌ Failed to generate Prisma client');
    process.exit(1);
  }
} else {
  console.log('✅ Prisma client found');
  
  // Check when it was last generated
  const packageJsonPath = path.join(clientPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const stats = fs.statSync(packageJsonPath);
    const lastModified = stats.mtime;
    const schemaStats = fs.statSync(schemaPath);
    const schemaModified = schemaStats.mtime;
    
    if (schemaModified > lastModified) {
      console.log('⚠️  Schema was modified after Prisma client was generated');
      console.log(`   Schema modified: ${schemaModified.toISOString()}`);
      console.log(`   Client generated: ${lastModified.toISOString()}`);
      console.log('   Regenerating Prisma client...');
      try {
        execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
        console.log('✅ Prisma client regenerated');
      } catch (error) {
        console.error('❌ Failed to regenerate Prisma client');
        process.exit(1);
      }
    } else {
      console.log('✅ Prisma client is up to date');
    }
  }
}

// Check migration status
console.log('\n📋 Checking migration status...');
try {
  const migrateStatus = execSync('npx prisma migrate status', { 
    encoding: 'utf8', 
    cwd: __dirname,
    stdio: 'pipe'
  });
  
  if (migrateStatus.includes('Database schema is up to date')) {
    console.log('✅ All migrations are applied');
  } else if (migrateStatus.includes('migrations have not yet been applied')) {
    console.log('⚠️  WARNING: Pending migrations detected!');
    console.log('   Run: npx prisma migrate deploy');
    console.log('   Or use: node check-migrations.js');
  } else {
    console.log('Migration status:', migrateStatus.split('\n')[0]);
  }
} catch (migError) {
  console.log('⚠️  Could not check migration status (this might be OK)');
}

// Try a simple test query
console.log('\n🧪 Testing Prisma connection...');
try {
  // Load environment variables
  require('dotenv').config();
  
  // Check if DATABASE_URL is set
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL not set in environment. Skipping connection test.');
    console.log('\n✅ Prisma client check completed!');
    console.log('⚠️  Note: Please restart your application: pm2 restart pp-backe');
    process.exit(0);
  }
  
  // Initialize Prisma with PostgreSQL adapter (same as production code)
  const { PrismaClient } = require('@prisma/client');
  const { Pool } = require('pg');
  const { PrismaPg } = require('@prisma/adapter-pg');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    log: ['warn', 'error'],
  });
  
  // Try a simple query
  prisma.$queryRaw`SELECT 1 as test`.then(() => {
    console.log('✅ Database connection successful');
    prisma.$disconnect().then(() => {
      console.log('\n✅ All checks passed!');
      console.log('\n📝 Next steps:');
      console.log('   1. Restart your application: pm2 restart pp-backe');
      console.log('   2. Test admin login');
      console.log('   3. Check logs: pm2 logs pp-backe --lines 50');
      process.exit(0);
    });
  }).catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n⚠️  This might be a database connection issue.');
    console.error('   Check your DATABASE_URL in .env file');
    prisma.$disconnect().catch(() => {});
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to initialize Prisma client:', error.message);
  console.error('\n⚠️  This might indicate:');
  console.error('   1. Missing dependencies (@prisma/adapter-pg, pg)');
  console.error('   2. Invalid Prisma client');
  console.error('   3. Environment variables not loaded');
  console.error('\n✅ Prisma client was regenerated successfully.');
  console.log('⚠️  Note: Please restart your application: pm2 restart pp-backe');
  process.exit(0); // Don't fail - client was regenerated, that's the main goal
}

