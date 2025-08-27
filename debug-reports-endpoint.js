const axios = require('axios');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Create a test token with a valid user ID from the database
async function createTestToken() {
  try {
    // Find an admin user
    const adminUser = await prisma.user.findFirst({
      where: {
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.log('No admin user found, trying to find any user...');
      // Find any user
      const anyUser = await prisma.user.findFirst();
      
      if (!anyUser) {
        console.log('No users found in the database!');
        return null;
      }
      
      console.log(`Using user with ID: ${anyUser.id}, email: ${anyUser.email}, role: ${anyUser.role}`);
      
      const payload = {
        id: anyUser.id,
        role: anyUser.role
      };
      
      return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-key', { expiresIn: '1h' });
    }
    
    console.log(`Using admin user with ID: ${adminUser.id}, email: ${adminUser.email}`);
    
    const payload = {
      id: adminUser.id,
      role: adminUser.role
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET || 'dev-secret-key', { expiresIn: '1h' });
  } catch (error) {
    console.error('Error creating test token:', error);
    return null;
  }
}

// Test the health endpoint first
async function testHealthEndpoint() {
  try {
    console.log('\n--- Testing Health Endpoint ---');
    const response = await axios.get('http://localhost:5000/health');
    console.log('Health endpoint response:', response.status, response.data);
    return true;
  } catch (error) {
    console.error('Health endpoint error:', error.message);
    return false;
  }
}

// Test the reports endpoint
async function testReportsEndpoint(token) {
  try {
    console.log('\n--- Testing Reports Endpoint ---');
    console.log('Using token:', token);
    
    const response = await axios.get('http://localhost:5000/api/content/reports', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Reports endpoint response status:', response.status);
    console.log('Reports endpoint response data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('Reports endpoint error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
      console.error('Headers:', error.response.headers);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Test the user reports endpoint for comparison
async function testUserReportsEndpoint(token) {
  try {
    console.log('\n--- Testing User Reports Endpoint ---');
    console.log('Using token:', token);
    
    const response = await axios.get('http://localhost:5000/api/content/reports/user', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('User reports endpoint response status:', response.status);
    console.log('User reports endpoint response data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('User reports endpoint error:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
    return false;
  }
}

// Main function
async function main() {
  try {
    // Test health endpoint first
    const healthOk = await testHealthEndpoint();
    if (!healthOk) {
      console.log('Health endpoint failed, server might not be running!');
      return;
    }
    
    // Create test token
    const token = await createTestToken();
    if (!token) {
      console.log('Failed to create test token!');
      return;
    }
    
    // Test reports endpoint
    await testReportsEndpoint(token);
    
    // Test user reports endpoint for comparison
    await testUserReportsEndpoint(token);
  } catch (error) {
    console.error('Main error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
