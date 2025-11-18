import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as userService from '../services/userService';
import prisma from '../utils/prisma';

// Create admin account with hierarchical validation
export const createAdminAccount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const creatorAdmin = req.user!; // Get the creator admin from auth middleware
    const adminData = req.body;

    // Validate required fields
    const { mobileNumber, password, adminLevel } = adminData;
    if (!mobileNumber || !password || !adminLevel) {
      res.status(400).json({ 
        error: 'Missing required fields: mobileNumber, password, adminLevel' 
      });
      return;
    }

    // Create the admin account
    const newAdmin = await userService.createAdminAccount(creatorAdmin, adminData);

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = newAdmin as any;

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: adminWithoutPassword
    });

  } catch (error: any) {
    console.error('Error creating admin account:', error);
    
    if (error.message && error.message.includes('permission')) {
      res.status(403).json({ error: error.message });
      return;
    }
    
    if (error.message && error.message.includes('Invalid')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available admin levels that the creator can create
export const getAvailableAdminLevels = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const creatorAdmin = req.user!;
    const creatorLevel = creatorAdmin.adminLevel;

    const hierarchy: Record<string, number> = {
      'GENERAL_SECRETARIAT': 5,
      'REGION': 4,
      'LOCALITY': 3,
      'ADMIN_UNIT': 2,
      'DISTRICT': 1
    };

    const creatorRank = hierarchy[creatorLevel] || 0;
    const availableLevels: Array<{ level: string; rank: number; label: string }> = [];

    // Add levels that the creator can create (below their level)
    Object.entries(hierarchy).forEach(([level, rank]) => {
      if (rank < creatorRank) {
        availableLevels.push({
          level,
          rank,
          label: getAdminLevelLabel(level)
        });
      }
    });

    res.json({
      success: true,
      availableLevels: availableLevels.sort((a, b) => b.rank - a.rank) // Sort by rank descending
    });

  } catch (error) {
    console.error('Error getting available admin levels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchy options for admin creation based on creator's level
export const getHierarchyOptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const creatorAdmin = req.user!;
    const { adminLevel } = req.query;

    if (!adminLevel) {
      res.status(400).json({ error: 'adminLevel query parameter is required' });
      return;
    }

    const options = await getHierarchyOptionsForLevel(creatorAdmin, adminLevel as string);

    res.json({
      success: true,
      hierarchyOptions: options
    });

  } catch (error) {
    console.error('Error getting hierarchy options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get admin level label
function getAdminLevelLabel(level: string): string {
  const labels: Record<string, string> = {
    'GENERAL_SECRETARIAT': 'الأمانة العامة',
    'REGION': 'الولاية',
    'LOCALITY': 'المحلية',
    'ADMIN_UNIT': 'الوحدة الإدارية',
    'DISTRICT': 'الحي'
  };
  return labels[level] || level;
}

// Helper function to get hierarchy options based on creator's level and target admin level
async function getHierarchyOptionsForLevel(creatorAdmin: any, targetAdminLevel: string): Promise<any> {
  const { adminLevel: creatorLevel, regionId, localityId, adminUnitId, districtId } = creatorAdmin;

  const options: any = {};

  switch (creatorLevel) {
    case 'GENERAL_SECRETARIAT':
      // Can assign to any hierarchy level
      if (['REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const regions = await prisma.region.findMany({
          where: { active: true },
          select: { id: true, name: true }
        });
        options.regions = regions;
      }

      if (['LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const localities = await prisma.locality.findMany({
          where: { active: true },
          include: { region: { select: { id: true, name: true } } }
        });
        options.localities = localities;
      }

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { active: true },
          include: { 
            locality: { 
              include: { region: { select: { id: true, name: true } } }
            }
          }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { active: true },
          include: { 
            adminUnit: { 
              include: { 
                locality: { 
                  include: { region: { select: { id: true, name: true } } }
                }
              }
            }
          }
        });
        options.districts = districts;
      }
      break;

    case 'REGION':
      // Can only assign within their region
      options.region = { id: regionId, name: (creatorAdmin as any).region?.name };

      if (['LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const localities = await prisma.locality.findMany({
          where: { regionId, active: true },
          select: { id: true, name: true }
        });
        options.localities = localities;
      }

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { 
            locality: { regionId },
            active: true 
          },
          include: { locality: { select: { id: true, name: true } } }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { 
            adminUnit: { 
              locality: { regionId }
            },
            active: true 
          },
          include: { 
            adminUnit: { 
              include: { locality: { select: { id: true, name: true } } }
            }
          }
        });
        options.districts = districts;
      }
      break;

    case 'LOCALITY':
      // Can only assign within their locality
      options.region = { id: regionId, name: (creatorAdmin as any).region?.name };
      options.locality = { id: localityId, name: (creatorAdmin as any).locality?.name };

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { localityId, active: true },
          select: { id: true, name: true }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { 
            adminUnit: { localityId },
            active: true 
          },
          include: { adminUnit: { select: { id: true, name: true } } }
        });
        options.districts = districts;
      }
      break;

    case 'ADMIN_UNIT':
      // Can only assign within their admin unit
      options.region = { id: regionId, name: (creatorAdmin as any).region?.name };
      options.locality = { id: localityId, name: (creatorAdmin as any).locality?.name };
      options.adminUnit = { id: adminUnitId, name: (creatorAdmin as any).adminUnit?.name };

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { adminUnitId, active: true },
          select: { id: true, name: true }
        });
        options.districts = districts;
      }
      break;

    case 'DISTRICT':
      // Can only assign within their district
      options.region = { id: regionId, name: (creatorAdmin as any).region?.name };
      options.locality = { id: localityId, name: (creatorAdmin as any).locality?.name };
      options.adminUnit = { id: adminUnitId, name: (creatorAdmin as any).adminUnit?.name };
      options.district = { id: districtId, name: (creatorAdmin as any).district?.name };
      break;

    default:
      throw new Error('Invalid creator admin level');
  }

  return options;
}

