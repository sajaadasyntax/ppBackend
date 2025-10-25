// Test script to check available Prisma models
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testModels() {
  try {
    console.log('Testing Prisma client models...');
    
    // Check if NationalLevel model exists
    console.log('Checking NationalLevel model...');
    if (prisma.nationalLevel) {
      console.log('✅ NationalLevel model exists');
      const count = await prisma.nationalLevel.count();
      console.log(`NationalLevel count: ${count}`);
    } else {
      console.log('❌ NationalLevel model not found');
    }
    
    // Check if ExpatriateRegion model exists
    console.log('Checking ExpatriateRegion model...');
    if (prisma.expatriateRegion) {
      console.log('✅ ExpatriateRegion model exists');
      const count = await prisma.expatriateRegion.count();
      console.log(`ExpatriateRegion count: ${count}`);
    } else {
      console.log('❌ ExpatriateRegion model not found');
    }
    
    // Check if SectorNationalLevel model exists
    console.log('Checking SectorNationalLevel model...');
    if (prisma.sectorNationalLevel) {
      console.log('✅ SectorNationalLevel model exists');
      const count = await prisma.sectorNationalLevel.count();
      console.log(`SectorNationalLevel count: ${count}`);
    } else {
      console.log('❌ SectorNationalLevel model not found');
    }
    
    // List all available models
    console.log('\nAvailable models:');
    const models = Object.keys(prisma).filter(key => 
      typeof prisma[key] === 'object' && 
      prisma[key] !== null && 
      typeof prisma[key].findMany === 'function'
    );
    models.forEach(model => console.log(`- ${model}`));
    
  } catch (error) {
    console.error('Error testing models:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testModels();
