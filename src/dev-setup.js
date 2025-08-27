/**
 * This script is for demonstration purposes.
 * It sets up the database with initial data.
 */

const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('./utils/auth');

const prisma = new PrismaClient();

async function setup() {
  try {
    console.log('Setting up the database with initial data...');

    // Create admin user
    const adminPassword = await hashPassword('admin123');
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        password: adminPassword,
        role: 'ADMIN',
        profile: {
          create: {
            firstName: 'Admin',
            lastName: 'User'
          }
        }
      },
      include: {
        profile: true
      }
    });
    console.log('Admin user created or updated:', admin.email);

    // Create regular user
    const userPassword = await hashPassword('user123');
    const user = await prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        password: userPassword,
        role: 'USER',
        profile: {
          create: {
            firstName: 'Regular',
            lastName: 'User'
          }
        }
      },
      include: {
        profile: true
      }
    });
    console.log('Regular user created or updated:', user.email);

    // Create sample content
    const content = await prisma.content.upsert({
      where: { id: '1' },
      update: {},
      create: {
        id: '1',
        title: 'Welcome to PP App',
        description: 'Getting started with the PP App',
        body: 'This is a sample content to demonstrate the backend API.',
        published: true
      }
    });
    console.log('Content created or updated:', content.title);

    // Create app settings
    const appNameSetting = await prisma.settings.upsert({
      where: { key: 'app_name' },
      update: { value: 'PP App' },
      create: {
        key: 'app_name',
        value: 'PP App'
      }
    });
    console.log('Setting created or updated:', appNameSetting.key);

    const themeSetting = await prisma.settings.upsert({
      where: { key: 'theme' },
      update: { value: 'light' },
      create: {
        key: 'theme',
        value: 'light'
      }
    });
    console.log('Setting created or updated:', themeSetting.key);

    const maintenanceSetting = await prisma.settings.upsert({
      where: { key: 'maintenance_mode' },
      update: { value: 'false' },
      create: {
        key: 'maintenance_mode',
        value: 'false'
      }
    });
    console.log('Setting created or updated:', maintenanceSetting.key);

    console.log('Setup completed successfully!');
    
    console.log('\n--- TEST CREDENTIALS ---');
    console.log('Admin: admin@example.com / admin123');
    console.log('User: user@example.com / user123');
    console.log('\n--- API ENDPOINTS ---');
    console.log('Auth: POST /api/auth/login');
    console.log('Users: GET /api/users (admin only)');
    console.log('Content: GET /api/content/public');
    console.log('Settings: GET /api/settings/public');
    console.log('-----------------------\n');
  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setup(); 