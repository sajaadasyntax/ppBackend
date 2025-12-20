import prisma from '../utils/prisma';
import { SectorType, AdminLevel } from '@prisma/client';

// Fixed 4 sector types
const FIXED_SECTOR_TYPES: SectorType[] = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];

const sectorTypeNames: Record<SectorType, string> = {
  SOCIAL: 'الاجتماعي',
  ECONOMIC: 'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL: 'السياسي'
};

// Helper function to auto-create 4 sectors for a new expatriate region
async function createSectorsForExpatriateRegion(expatriateRegionId: string, regionName: string): Promise<void> {
  try {
    // Create 4 SectorNationalLevel entries for this expatriate region
    for (const sectorType of FIXED_SECTOR_TYPES) {
      await prisma.sectorNationalLevel.create({
        data: {
          name: `${regionName} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          expatriateRegionId
        }
      });
    }
    
    console.log(`✅ Created 4 sectors for expatriate region: ${regionName}`);
  } catch (error) {
    console.error(`⚠️ Error creating sectors for expatriate region:`, error);
    // Don't throw - sector creation failure shouldn't block region creation
  }
}

/**
 * Get all expatriate regions
 */
export async function getAllExpatriateRegions(): Promise<any[]> {
  return await prisma.expatriateRegion.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          memberDetails: {
            select: {
              fullName: true
            }
          }
        }
      },
      _count: {
        select: { 
          users: true,
          sectorNationalLevels: true
        }
      }
    }
  });
}

/**
 * Get expatriate region by ID
 */
export async function getExpatriateRegionById(id: string): Promise<any> {
  return await prisma.expatriateRegion.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      },
      sectorNationalLevels: true,
      sectorRegions: true,
      sectorLocalities: true,
      sectorAdminUnits: true,
      sectorDistricts: true
    }
  });
}

/**
 * Create new expatriate region
 */
export async function createExpatriateRegion(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  const region = await prisma.expatriateRegion.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      description: normalizedDescription,
      active: data.active !== undefined ? data.active : true
    }
  });
  
  // Auto-create 4 sectors for this expatriate region
  await createSectorsForExpatriateRegion(region.id, trimmedName);
  
  return region;
}

/**
 * Update expatriate region
 */
export async function updateExpatriateRegion(id: string, data: any): Promise<any> {
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;
  
  return await prisma.expatriateRegion.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: {
            select: {
              firstName: true,
              lastName: true
            }
          },
          memberDetails: {
            select: {
              fullName: true
            }
          }
        }
      },
      _count: {
        select: {
          users: true,
          sectorNationalLevels: true
        }
      }
    }
  });
}

/**
 * Delete expatriate region
 */
export async function deleteExpatriateRegion(id: string): Promise<any> {
  return await prisma.expatriateRegion.delete({
    where: { id }
  });
}

/**
 * Get users in an expatriate region
 */
export async function getUsersByExpatriateRegion(expatriateRegionId: string): Promise<any[]> {
  return await prisma.user.findMany({
    where: { expatriateRegionId },
    include: {
      profile: true,
      expatriateRegion: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Assign user to expatriate region
 */
export async function assignUserToExpatriateRegion(userId: string, expatriateRegionId: string): Promise<any> {
  return await prisma.user.update({
    where: { id: userId },
    data: { expatriateRegionId }
  });
}

/**
 * Create user for expatriate region
 */
export async function createUserForExpatriateRegion(expatriateRegionId: string, userData: {
  mobileNumber: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  adminLevel?: string;
}): Promise<any> {
  // Validate mobile number
  if (!userData.mobileNumber) {
    throw new Error('Mobile number is required');
  }
  
  if (!userData.password) {
    throw new Error('Password is required');
  }
  
  // Check if user already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mobileNumber: userData.mobileNumber },
        ...(userData.email ? [{ email: userData.email }] : [])
      ]
    }
  });
  
  if (existingUser) {
    throw new Error('A user with this mobile number or email already exists');
  }
  
  // Verify expatriate region exists
  const region = await prisma.expatriateRegion.findUnique({
    where: { id: expatriateRegionId }
  });
  
  if (!region) {
    throw new Error('Expatriate region not found');
  }
  
  // Hash password
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  // Determine the full name
  const fullName = userData.fullName || 
    (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : 
     userData.firstName || userData.lastName || userData.mobileNumber);
  
  // Create user with expatriate region assignment
  const user = await prisma.user.create({
    data: {
      mobileNumber: userData.mobileNumber,
      password: hashedPassword,
      email: userData.email || null,
      role: 'USER',
      adminLevel: (userData.adminLevel || 'USER') as AdminLevel,
      expatriateRegionId,
      profile: {
        create: {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: userData.mobileNumber
        }
      },
      memberDetails: {
        create: {
          fullName,
          mobile: userData.mobileNumber
        }
      }
    },
    include: {
      profile: true,
      memberDetails: true,
      expatriateRegion: true
    }
  });
  
  return user;
}

export default {
  getAllExpatriateRegions,
  getExpatriateRegionById,
  createExpatriateRegion,
  updateExpatriateRegion,
  deleteExpatriateRegion,
  getUsersByExpatriateRegion,
  assignUserToExpatriateRegion,
  createUserForExpatriateRegion
};

