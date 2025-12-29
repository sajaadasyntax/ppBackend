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
  // This will fail if Prisma client is broken, but that's OK - we'll catch it
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  // Try a simple query
  prisma.$queryRaw`SELECT 1 as test`.then(() => {
    console.log('✅ Database connection successful');
    prisma.$disconnect();
    console.log('\n✅ All checks passed!');
  }).catch((error) => {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n⚠️  This might be a database connection issue, not a Prisma client issue.');
    prisma.$disconnect();
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to load Prisma client:', error.message);
  console.error('\n⚠️  Prisma client is broken. Regenerating...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit', cwd: __dirname });
    console.log('✅ Prisma client regenerated. Please restart your application.');
  } catch (genError) {
    console.error('❌ Failed to regenerate Prisma client');
    process.exit(1);
  }
}

