import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import userService from '../services/userService';
import { AuthenticatedRequest } from '../types';
import { Prisma, SectorType } from '@prisma/client';

// Fixed 4 sector types
const FIXED_SECTOR_TYPES: SectorType[] = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];

const sectorTypeNames: Record<SectorType, string> = {
  SOCIAL: 'الاجتماعي',
  ECONOMIC: 'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL: 'السياسي'
};

// Admin levels that have full access
const FULL_ACCESS_LEVELS = ['ADMIN', 'GENERAL_SECRETARIAT'];

// Helper function to check if admin has full access
function hasFullAccess(adminLevel: string | undefined): boolean {
  return adminLevel ? FULL_ACCESS_LEVELS.includes(adminLevel) : false;
}

// Helper function to check if admin can modify a region
async function canModifyRegion(adminUser: any, regionId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  // NATIONAL_LEVEL admin can modify regions under their national level
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      select: { nationalLevelId: true }
    });
    return region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  // REGION admin can only modify their own region
  if (adminUser.adminLevel === 'REGION') {
    return adminUser.regionId === regionId;
  }
  
  return false;
}

// Helper function to check if admin can modify a locality
async function canModifyLocality(adminUser: any, localityId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  const locality = await prisma.locality.findUnique({
    where: { id: localityId },
    select: { regionId: true }
  });
  
  if (!locality) return false;
  
  // NATIONAL_LEVEL admin can modify localities under their national level
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    const region = await prisma.region.findUnique({
      where: { id: locality.regionId },
      select: { nationalLevelId: true }
    });
    return region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  // REGION admin can modify localities in their region
  if (adminUser.adminLevel === 'REGION') {
    return locality.regionId === adminUser.regionId;
  }
  
  // LOCALITY admin can only modify their own locality
  if (adminUser.adminLevel === 'LOCALITY') {
    return localityId === adminUser.localityId;
  }
  
  return false;
}

// Helper function to check if admin can modify an admin unit
async function canModifyAdminUnit(adminUser: any, adminUnitId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  const adminUnit = await prisma.adminUnit.findUnique({
    where: { id: adminUnitId },
    select: { localityId: true, locality: { select: { regionId: true, region: { select: { nationalLevelId: true } } } } }
  });
  
  if (!adminUnit) return false;
  
  // NATIONAL_LEVEL admin can modify admin units under their national level
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    return adminUnit.locality?.region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  // REGION admin can modify admin units in their region
  if (adminUser.adminLevel === 'REGION') {
    return adminUnit.locality?.regionId === adminUser.regionId;
  }
  
  // LOCALITY admin can modify admin units in their locality
  if (adminUser.adminLevel === 'LOCALITY') {
    return adminUnit.localityId === adminUser.localityId;
  }
  
  // ADMIN_UNIT admin can only modify their own admin unit
  if (adminUser.adminLevel === 'ADMIN_UNIT') {
    return adminUnitId === adminUser.adminUnitId;
  }
  
  return false;
}

// Helper function to check if admin can modify a district
async function canModifyDistrict(adminUser: any, districtId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    select: { 
      adminUnitId: true, 
      adminUnit: { 
        select: { 
          localityId: true,
          locality: { 
            select: { 
              regionId: true,
              region: { select: { nationalLevelId: true } }
            } 
          } 
        } 
      } 
    }
  });
  
  if (!district) return false;
  
  // NATIONAL_LEVEL admin can modify districts under their national level
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    return district.adminUnit?.locality?.region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  // REGION admin can modify districts in their region
  if (adminUser.adminLevel === 'REGION') {
    return district.adminUnit?.locality?.regionId === adminUser.regionId;
  }
  
  // LOCALITY admin can modify districts in their locality
  if (adminUser.adminLevel === 'LOCALITY') {
    return district.adminUnit?.localityId === adminUser.localityId;
  }
  
  // ADMIN_UNIT admin can modify districts in their admin unit
  if (adminUser.adminLevel === 'ADMIN_UNIT') {
    return district.adminUnitId === adminUser.adminUnitId;
  }
  
  // DISTRICT admin can only modify their own district
  if (adminUser.adminLevel === 'DISTRICT') {
    return districtId === adminUser.districtId;
  }
  
  return false;
}

// Helper function to check if admin can create a region under a specific national level
async function canCreateRegionInNationalLevel(adminUser: any, nationalLevelId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  // NATIONAL_LEVEL admin can only create regions under their own national level
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    return adminUser.nationalLevelId === nationalLevelId;
  }
  
  // Other admin levels cannot create regions
  return false;
}

// Helper function to check if admin can create in a region
async function canCreateInRegion(adminUser: any, regionId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  // Check if the admin's region matches or is a parent of the target region
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    const region = await prisma.region.findUnique({
      where: { id: regionId },
      select: { nationalLevelId: true }
    });
    return region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  if (adminUser.adminLevel === 'REGION') {
    return regionId === adminUser.regionId;
  }
  
  return false;
}

// Helper function to check if admin can create in a locality
async function canCreateInLocality(adminUser: any, localityId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  const locality = await prisma.locality.findUnique({
    where: { id: localityId },
    select: { regionId: true, region: { select: { nationalLevelId: true } } }
  });
  
  if (!locality) return false;
  
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    return locality.region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  if (adminUser.adminLevel === 'REGION') {
    return locality.regionId === adminUser.regionId;
  }
  
  if (adminUser.adminLevel === 'LOCALITY') {
    return localityId === adminUser.localityId;
  }
  
  return false;
}

// Helper function to check if admin can create in an admin unit
async function canCreateInAdminUnit(adminUser: any, adminUnitId: string): Promise<boolean> {
  if (!adminUser) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  const adminUnit = await prisma.adminUnit.findUnique({
    where: { id: adminUnitId },
    select: { localityId: true, locality: { select: { regionId: true, region: { select: { nationalLevelId: true } } } } }
  });
  
  if (!adminUnit) return false;
  
  if (adminUser.adminLevel === 'NATIONAL_LEVEL' && adminUser.nationalLevelId) {
    return adminUnit.locality?.region?.nationalLevelId === adminUser.nationalLevelId;
  }
  
  if (adminUser.adminLevel === 'REGION') {
    return adminUnit.locality?.regionId === adminUser.regionId;
  }
  
  if (adminUser.adminLevel === 'LOCALITY') {
    return adminUnit.localityId === adminUser.localityId;
  }
  
  if (adminUser.adminLevel === 'ADMIN_UNIT') {
    return adminUnitId === adminUser.adminUnitId;
  }
  
  return false;
}

// Helper function to validate that a user can be assigned as admin within hierarchy scope
async function canAssignAsAdmin(adminUser: any, targetUserId: string): Promise<boolean> {
  if (!adminUser || !targetUserId) return false;
  if (hasFullAccess(adminUser.adminLevel)) return true;
  
  // Get the target user's hierarchy information
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      regionId: true,
      localityId: true,
      adminUnitId: true,
      districtId: true,
      region: { select: { nationalLevelId: true } }
    }
  });
  
  if (!targetUser) return false;
  
  // Check if target user is within the assigning admin's hierarchy scope
  switch (adminUser.adminLevel) {
    case 'NATIONAL_LEVEL':
      // Can assign users within their national level
      return targetUser.region?.nationalLevelId === adminUser.nationalLevelId;
      
    case 'REGION':
      // Can assign users within their region
      return targetUser.regionId === adminUser.regionId;
      
    case 'LOCALITY':
      // Can assign users within their locality
      return targetUser.localityId === adminUser.localityId;
      
    case 'ADMIN_UNIT':
      // Can assign users within their admin unit
      return targetUser.adminUnitId === adminUser.adminUnitId;
      
    case 'DISTRICT':
      // Can assign users within their district
      return targetUser.districtId === adminUser.districtId;
      
    default:
      return false;
  }
}

// Helper function to auto-create 4 sectors for a new geographic level
// NOTE: For the original (geographic) hierarchy we only need the 4 sectors per level,
// but we need to link them to their parent sectors in the hierarchy.
async function createSectorsForLevel(
  level: 'region' | 'locality' | 'adminUnit' | 'district',
  entityId: string,
  entityName: string
): Promise<void> {
  try {
    switch (level) {
      case 'region': {
        // Regions don't have parent sectors in the geographic hierarchy
        for (const sectorType of FIXED_SECTOR_TYPES) {
          await prisma.sectorRegion.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'locality': {
        // Find the parent region to get its sectors
        const locality = await prisma.locality.findUnique({
          where: { id: entityId },
          select: { regionId: true, name: true, region: { select: { name: true } } }
        });

        if (!locality || !locality.regionId) {
          console.error(`⚠️ Locality ${entityId} not found or missing regionId`);
          break;
        }

        // Find the parent region's sectors for each sector type
        // Sector names are formatted as "Region Name - Sector Type"
        for (const sectorType of FIXED_SECTOR_TYPES) {
          const regionName = locality.region?.name || '';
          const sectorRegion = await prisma.sectorRegion.findFirst({
            where: {
              sectorType,
              expatriateRegionId: null, // Original hierarchy
              name: { startsWith: `${regionName} -` }
            }
          });

          await prisma.sectorLocality.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorRegionId: sectorRegion?.id || null,
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'adminUnit': {
        // Find the parent locality to get its sectors
        const adminUnit = await prisma.adminUnit.findUnique({
          where: { id: entityId },
          select: { localityId: true, name: true, locality: { select: { name: true } } }
        });

        if (!adminUnit || !adminUnit.localityId) {
          console.error(`⚠️ Admin unit ${entityId} not found or missing localityId`);
          break;
        }

        // Find the parent locality's sectors for each sector type
        // Sector names are formatted as "Locality Name - Sector Type"
        for (const sectorType of FIXED_SECTOR_TYPES) {
          const localityName = adminUnit.locality?.name || '';
          const sectorLocality = await prisma.sectorLocality.findFirst({
            where: {
              sectorType,
              expatriateRegionId: null, // Original hierarchy
              name: { startsWith: `${localityName} -` }
            }
          });

          await prisma.sectorAdminUnit.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorLocalityId: sectorLocality?.id || null,
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'district': {
        // Find the parent admin unit to get its sectors
        const district = await prisma.district.findUnique({
          where: { id: entityId },
          select: { adminUnitId: true, name: true, adminUnit: { select: { name: true } } }
        });

        if (!district || !district.adminUnitId) {
          console.error(`⚠️ District ${entityId} not found or missing adminUnitId`);
          break;
        }

        // Find the parent admin unit's sectors for each sector type
        // Sector names are formatted as "Admin Unit Name - Sector Type"
        for (const sectorType of FIXED_SECTOR_TYPES) {
          const adminUnitName = district.adminUnit?.name || '';
          const sectorAdminUnit = await prisma.sectorAdminUnit.findFirst({
            where: {
              sectorType,
              expatriateRegionId: null, // Original hierarchy
              name: { startsWith: `${adminUnitName} -` }
            }
          });

          await prisma.sectorDistrict.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorAdminUnitId: sectorAdminUnit?.id || null,
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }
    }

    console.log(`✅ Created 4 sectors for ${level}: ${entityName}`);
  } catch (error) {
    console.error(`⚠️ Error creating sectors for ${level}:`, error);
    // Don't throw - sector creation failure shouldn't block hierarchy creation
  }
}

// Get all regions
export const getRegions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    console.log('🔍 getRegions called from hierarchyController');
    
    const adminUser = req.user;
    
    console.log('👤 User in request:', JSON.stringify({
      id: adminUser?.id,
      email: adminUser?.email,
      adminLevel: adminUser?.adminLevel,
      regionId: adminUser?.regionId,
      region: (adminUser as any)?.region?.name
    }, null, 2));
    
    let whereClause: Prisma.RegionWhereInput = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, nationalLevelId, regionId } = adminUser;
      
      console.log('🔒 Applying access control:', { adminLevel, nationalLevelId, regionId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // Admin and General Secretariat can see all regions
          console.log('👑 Admin/General Secretariat user - showing all regions');
          break;
          
        case 'NATIONAL_LEVEL':
          // National level admin can see all regions under their national level
          console.log('🌍 National level user - filtering to nationalLevelId:', nationalLevelId);
          if (nationalLevelId) {
            whereClause.nationalLevelId = nationalLevelId;
          } else {
            console.log('⚠️ National level user has no nationalLevelId assigned - returning empty for security');
            whereClause.id = 'none'; // Impossible condition
          }
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          console.log('🏢 Region/lower level user - filtering to regionId:', regionId);
          if (regionId) {
            whereClause.id = regionId;
          } else {
            console.log('⚠️ Region/lower level user has no regionId assigned - returning empty for security');
            whereClause.id = 'none'; // Impossible condition
          }
          break;
          
        default:
          // For other roles (USER, etc.), restrict to their specific region
          // If no regionId is assigned, return empty results for security
          if (regionId) {
            console.log('👤 Regular user with regionId:', regionId);
            whereClause.id = regionId;
          } else {
            console.log('⚠️ User has no regionId assigned - returning empty for security');
            // Set impossible condition to return no results
            whereClause.id = 'none';
          }
      }
    } else {
      console.log('⚠️ No user information in request! Authentication may have failed.');
      // For security, return no results if no user info
      whereClause.id = 'none';
    }
    
    console.log('🔍 Finding regions with whereClause:', whereClause);
    
    const regions = await prisma.region.findMany({
      where: whereClause,
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
            localities: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Found ${regions.length} regions based on filters`);
    if (regions.length > 0) {
      console.log('📋 Region names:', regions.map(r => r.name).join(', '));
    }
    
    res.json(regions);
  } catch (error: any) {
    console.error('❌ Error getting regions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single region by ID
export const getRegionById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        localities: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!region) {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    
    res.json(region);
  } catch (error: any) {
    console.error('Error getting region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new region
export const createRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, adminId, nationalLevelId } = req.body;
    
    // Validate required fields
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!nationalLevelId) {
      res.status(400).json({ error: 'National level ID is required' });
      return;
    }

    // Verify admin has permission to create regions under this national level
    if (!await canCreateRegionInNationalLevel(req.user, nationalLevelId)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to create regions under this national level' });
      return;
    }

    // Verify national level exists
    const nationalLevel = await prisma.nationalLevel.findUnique({
      where: { id: nationalLevelId }
    });

    if (!nationalLevel) {
      res.status(400).json({ error: 'Invalid national level ID' });
      return;
    }

    const normalizedCode = typeof code === 'string' && code.trim().length > 0
      ? code.trim().toUpperCase()
      : undefined;

    const normalizedDescription = typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : undefined;
    
    const region = await prisma.region.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        description: normalizedDescription,
        nationalLevelId,
        adminId: adminId || undefined
      }
    });
    
    // Auto-create 4 sectors for this region
    await createSectorsForLevel('region', region.id, trimmedName);
    
    res.status(201).json(region);
  } catch (error: any) {
    console.error('Error creating region:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A region with this code already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update region
export const updateRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, adminId, active, nationalLevelId } = req.body;
    
    // Verify admin has permission to modify this region
    if (!await canModifyRegion(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this region' });
      return;
    }
    
    // If assigning an admin, verify the user is within the admin's hierarchy scope
    if (adminId && !await canAssignAsAdmin(req.user, adminId)) {
      res.status(403).json({ error: 'Forbidden - You can only assign users within your hierarchy scope as admins' });
      return;
    }
    
    // If nationalLevelId is being updated, verify it exists
    if (nationalLevelId !== undefined) {
      const nationalLevel = await prisma.nationalLevel.findUnique({
        where: { id: nationalLevelId }
      });

      if (!nationalLevel) {
        res.status(400).json({ error: 'Invalid national level ID' });
        return;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (description !== undefined) updateData.description = description;
    if (adminId !== undefined) updateData.adminId = adminId;
    if (active !== undefined) updateData.active = active;
    if (nationalLevelId !== undefined) updateData.nationalLevelId = nationalLevelId;
    
    const region = await prisma.region.update({
      where: { id },
      data: updateData
    });
    
    res.json(region);
  } catch (error: any) {
    console.error('Error updating region:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid national level ID' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update region active status
export const updateRegionStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Verify admin has permission to modify this region
    if (!await canModifyRegion(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this region' });
      return;
    }

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Active status must be a boolean value' });
      return;
    }

    const region = await prisma.region.update({
      where: { id },
      data: { active }
    });

    res.json(region);
  } catch (error: any) {
    console.error('Error updating region status:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete region
export const deleteRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify admin has permission to modify this region
    if (!await canModifyRegion(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to delete this region' });
      return;
    }
    
    await prisma.region.delete({
      where: { id }
    });
    
    res.json({ message: 'Region deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting region:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot delete region with associated localities or users' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get localities by region
export const getLocalitiesByRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    const localities = await prisma.locality.findMany({
      where: { regionId },
      include: {
        region: {
          select: {
            id: true,
            name: true,
            nationalLevelId: true
          }
        },
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
            adminUnits: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(localities);
  } catch (error: any) {
    console.error('Error getting localities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single locality by ID
export const getLocalityById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locality = await prisma.locality.findUnique({
      where: { id },
      include: {
        region: true,
        adminUnits: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!locality) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    
    res.json(locality);
  } catch (error: any) {
    console.error('Error getting locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new locality
export const createLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, adminId } = req.body;
    const regionId = req.params.regionId || req.body.regionId;
    
    // Validate required fields
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!regionId) {
      res.status(400).json({ error: 'Region ID is required' });
      return;
    }

    // Verify admin has permission to create in this region
    if (!await canCreateInRegion(req.user, regionId)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to create localities in this region' });
      return;
    }

    // Verify region exists
    const region = await prisma.region.findUnique({
      where: { id: regionId }
    });

    if (!region) {
      res.status(400).json({ error: 'Invalid region ID' });
      return;
    }

    const normalizedCode = typeof code === 'string' && code.trim().length > 0
      ? code.trim().toUpperCase()
      : undefined;

    const normalizedDescription = typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : undefined;
    
    const locality = await prisma.locality.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        description: normalizedDescription,
        regionId,
        adminId: adminId || undefined
      }
    });
    
    // Auto-create 4 sectors for this locality
    await createSectorsForLevel('locality', locality.id, trimmedName);
    
    res.status(201).json(locality);
  } catch (error: any) {
    console.error('Error creating locality:', error);
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid region ID' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A locality with this code already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update locality
export const updateLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, regionId, adminId, active } = req.body;
    
    // Verify admin has permission to modify this locality
    if (!await canModifyLocality(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this locality' });
      return;
    }
    
    // If assigning an admin, verify the user is within the admin's hierarchy scope
    if (adminId && !await canAssignAsAdmin(req.user, adminId)) {
      res.status(403).json({ error: 'Forbidden - You can only assign users within your hierarchy scope as admins' });
      return;
    }
    
    const locality = await prisma.locality.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        regionId: regionId !== undefined ? regionId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(locality);
  } catch (error: any) {
    console.error('Error updating locality:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid region ID' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update locality active status
export const updateLocalityStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Verify admin has permission to modify this locality
    if (!await canModifyLocality(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this locality' });
      return;
    }

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Active status must be a boolean value' });
      return;
    }

    const locality = await prisma.locality.update({
      where: { id },
      data: { active },
      include: { region: true }
    });

    res.json(locality);
  } catch (error: any) {
    console.error('Error updating locality status:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete locality
export const deleteLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify admin has permission to modify this locality
    if (!await canModifyLocality(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to delete this locality' });
      return;
    }
    
    await prisma.locality.delete({
      where: { id }
    });
    
    res.json({ message: 'Locality deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting locality:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot delete locality with associated admin units or users' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin units by locality
export const getAdminUnitsByLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    const adminUnits = await prisma.adminUnit.findMany({
      where: { localityId },
      include: {
        locality: {
          select: {
            id: true,
            name: true,
            regionId: true,
            region: {
              select: {
                id: true,
                name: true,
                nationalLevelId: true
              }
            }
          }
        },
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
            districts: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(adminUnits);
  } catch (error: any) {
    console.error('Error getting admin units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single admin unit by ID
export const getAdminUnitById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id },
      include: {
        locality: {
          include: {
            region: true
          }
        },
        districts: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!adminUnit) {
      res.status(404).json({ error: 'Administrative unit not found' });
      return;
    }
    
    res.json(adminUnit);
  } catch (error: any) {
    console.error('Error getting administrative unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new admin unit
export const createAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, adminId } = req.body;
    const localityId = req.params.localityId || req.body.localityId;
    
    // Validate required fields
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!localityId) {
      res.status(400).json({ error: 'Locality ID is required' });
      return;
    }

    // Verify admin has permission to create in this locality
    if (!await canCreateInLocality(req.user, localityId)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to create admin units in this locality' });
      return;
    }

    // Verify locality exists
    const locality = await prisma.locality.findUnique({
      where: { id: localityId }
    });

    if (!locality) {
      res.status(400).json({ error: 'Invalid locality ID' });
      return;
    }

    const normalizedCode = typeof code === 'string' && code.trim().length > 0
      ? code.trim().toUpperCase()
      : undefined;

    const normalizedDescription = typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : undefined;
    
    const adminUnit = await prisma.adminUnit.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        description: normalizedDescription,
        localityId,
        adminId: adminId || undefined
      }
    });
    
    // Auto-create 4 sectors for this admin unit
    await createSectorsForLevel('adminUnit', adminUnit.id, trimmedName);
    
    res.status(201).json(adminUnit);
  } catch (error: any) {
    console.error('Error creating administrative unit:', error);
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid locality ID' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An administrative unit with this code already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update admin unit
export const updateAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, localityId, adminId, active } = req.body;
    
    // Verify admin has permission to modify this admin unit
    if (!await canModifyAdminUnit(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this administrative unit' });
      return;
    }
    
    // If assigning an admin, verify the user is within the admin's hierarchy scope
    if (adminId && !await canAssignAsAdmin(req.user, adminId)) {
      res.status(403).json({ error: 'Forbidden - You can only assign users within your hierarchy scope as admins' });
      return;
    }
    
    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        localityId: localityId !== undefined ? localityId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(adminUnit);
  } catch (error: any) {
    console.error('Error updating administrative unit:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Administrative unit not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid locality ID' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update admin unit active status
export const updateAdminUnitStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Verify admin has permission to modify this admin unit
    if (!await canModifyAdminUnit(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this administrative unit' });
      return;
    }

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Active status must be a boolean value' });
      return;
    }

    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: { active },
      include: {
        locality: {
          include: { region: true }
        }
      }
    });

    res.json(adminUnit);
  } catch (error: any) {
    console.error('Error updating admin unit status:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Administrative unit not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete admin unit
export const deleteAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify admin has permission to modify this admin unit
    if (!await canModifyAdminUnit(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to delete this administrative unit' });
      return;
    }
    
    await prisma.adminUnit.delete({
      where: { id }
    });
    
    res.json({ message: 'Administrative unit deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting administrative unit:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Administrative unit not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot delete administrative unit with associated districts or users' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get districts by admin unit
export const getDistrictsByAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    const districts = await prisma.district.findMany({
      where: { adminUnitId },
      include: {
        adminUnit: {
          select: {
            id: true,
            name: true,
            localityId: true,
            locality: {
              select: {
                id: true,
                name: true,
                regionId: true,
                region: {
                  select: {
                    id: true,
                    name: true,
                    nationalLevelId: true
                  }
                }
              }
            }
          }
        },
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
        users: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            adminLevel: true,
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
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(districts);
  } catch (error: any) {
    console.error('Error getting districts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single district by ID
export const getDistrictById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: {
                region: true
              }
            }
          }
        },
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!district) {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    
    res.json(district);
  } catch (error: any) {
    console.error('Error getting district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new district
export const createDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, adminId } = req.body;
    const adminUnitId = req.params.adminUnitId || req.body.adminUnitId;
    
    // Validate required fields
    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    if (!adminUnitId) {
      res.status(400).json({ error: 'Administrative unit ID is required' });
      return;
    }

    // Verify admin has permission to create in this admin unit
    if (!await canCreateInAdminUnit(req.user, adminUnitId)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to create districts in this administrative unit' });
      return;
    }

    // Verify admin unit exists
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId }
    });

    if (!adminUnit) {
      res.status(400).json({ error: 'Invalid administrative unit ID' });
      return;
    }

    const normalizedCode = typeof code === 'string' && code.trim().length > 0
      ? code.trim().toUpperCase()
      : undefined;

    const normalizedDescription = typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : undefined;
    
    const district = await prisma.district.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        description: normalizedDescription,
        adminUnitId,
        adminId: adminId || undefined
      }
    });
    
    // Auto-create 4 sectors for this district
    await createSectorsForLevel('district', district.id, trimmedName);
    
    res.status(201).json(district);
  } catch (error: any) {
    console.error('Error creating district:', error);
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid administrative unit ID' });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A district with this code already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update district
export const updateDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, adminUnitId, adminId, active } = req.body;
    
    // Verify admin has permission to modify this district
    if (!await canModifyDistrict(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this district' });
      return;
    }
    
    // If assigning an admin, verify the user is within the admin's hierarchy scope
    if (adminId && !await canAssignAsAdmin(req.user, adminId)) {
      res.status(403).json({ error: 'Forbidden - You can only assign users within your hierarchy scope as admins' });
      return;
    }
    
    const district = await prisma.district.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        adminUnitId: adminUnitId !== undefined ? adminUnitId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(district);
  } catch (error: any) {
    console.error('Error updating district:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid administrative unit ID' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update district active status
export const updateDistrictStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { active } = req.body;

    // Verify admin has permission to modify this district
    if (!await canModifyDistrict(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to modify this district' });
      return;
    }

    if (typeof active !== 'boolean') {
      res.status(400).json({ error: 'Active status must be a boolean value' });
      return;
    }

    const district = await prisma.district.update({
      where: { id },
      data: { active },
      include: {
        adminUnit: {
          include: {
            locality: { include: { region: true } }
          }
        }
      }
    });

    res.json(district);
  } catch (error: any) {
    console.error('Error updating district status:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete district
export const deleteDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Verify admin has permission to modify this district
    if (!await canModifyDistrict(req.user, id)) {
      res.status(403).json({ error: 'Forbidden - You do not have permission to delete this district' });
      return;
    }
    
    await prisma.district.delete({
      where: { id }
    });
    
    res.json({ message: 'District deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting district:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Cannot delete district with associated users' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get full hierarchy
export const getFullHierarchy = async (_req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        localities: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: {
            adminUnits: {
              where: { active: true },
              orderBy: { name: 'asc' },
              include: {
                districts: {
                  where: { active: true },
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        }
      }
    });
    
    res.json(regions);
  } catch (error: any) {
    console.error('Error getting full hierarchy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by hierarchy level and ID
export const getUsersByHierarchyLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { level, id, page, limit } = req.query;
    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 10;
    
    let filter: any = {};
    
    // Build filter based on hierarchy level
    switch(level) {
      case 'region':
        filter.regionId = id;
        break;
      case 'locality':
        filter.localityId = id;
        break;
      case 'adminUnit':
        filter.adminUnitId = id;
        break;
      case 'district':
        filter.districtId = id;
        break;
      default:
        res.status(400).json({ error: 'Invalid hierarchy level' });
        return;
    }
    
    const result = await userService.getUsersByHierarchy(filter, pageNum, limitNum);
    res.json(result);
  } catch (error: any) {
    console.error('Error getting users by hierarchy level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== NATIONAL LEVEL FUNCTIONS =====

// Get all national levels
export const getNationalLevels = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    const includeParam = typeof req.query.include === 'string'
      ? req.query.include.split(',').map((s) => s.trim())
      : [];
    const includeRegions = includeParam.includes('regions');
    const includeUsers = includeParam.includes('users') || includeParam.includes('admins');
    
    let whereClause: Prisma.NationalLevelWhereInput = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, nationalLevelId } = adminUser;
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // Admin and General Secretariat can see all national levels
          break;
          
        case 'NATIONAL_LEVEL':
          // National level admin can only see their own national level
          if (nationalLevelId) {
            whereClause.id = nationalLevelId;
          } else {
            console.log('⚠️ National level user has no nationalLevelId assigned - returning empty for security');
            whereClause.id = 'none'; // Impossible condition
          }
          break;
          
        default:
          // For other roles, restrict to their specific level if they have one
          if (nationalLevelId) {
            whereClause.id = nationalLevelId;
          }
      }
    }
    
    const includeConfig: Prisma.NationalLevelInclude = {
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
        select: { regions: true, users: true }
      }
    };

    if (includeRegions) {
      includeConfig.regions = {
        select: {
          id: true,
          name: true,
          code: true,
          active: true,
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
              localities: true,
              users: true
            }
          }
        },
        orderBy: { name: 'asc' }
      };
    }

    if (includeUsers) {
      includeConfig.users = {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
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
        },
        orderBy: { createdAt: 'desc' },
      };
    }

    const nationalLevels = await prisma.nationalLevel.findMany({
      where: whereClause,
      include: includeConfig,
      orderBy: { name: 'asc' }
    });
    
    res.json(nationalLevels);
  } catch (error: any) {
    console.error('Error getting national levels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get national level by ID
export const getNationalLevelById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const nationalLevel = await prisma.nationalLevel.findUnique({
      where: { id },
      include: {
        regions: {
          where: { active: true },
          orderBy: { name: 'asc' }
        },
        users: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            adminLevel: true,
            profile: true
          }
        }
      }
    });
    
    if (!nationalLevel) {
      res.status(404).json({ error: 'National level not found' });
      return;
    }
    
    res.json(nationalLevel);
  } catch (error: any) {
    console.error('Error getting national level by ID:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new national level
export const createNationalLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, active } = req.body;

    const trimmedName = typeof name === 'string' ? name.trim() : '';
    if (!trimmedName) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const normalizedCode = typeof code === 'string' && code.trim().length > 0
      ? code.trim().toUpperCase()
      : undefined;

    const normalizedDescription = typeof description === 'string' && description.trim().length > 0
      ? description.trim()
      : undefined;

    const nationalLevel = await prisma.nationalLevel.create({
      data: {
        name: trimmedName,
        code: normalizedCode,
        description: normalizedDescription,
        active: typeof active === 'boolean' ? active : true
      }
    });
    
    res.status(201).json(nationalLevel);
  } catch (error: any) {
    console.error('Error creating national level:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A national level with this code already exists' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update national level
export const updateNationalLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, active } = req.body;
    
    const nationalLevel = await prisma.nationalLevel.update({
      where: { id },
      data: {
        name,
        code,
        description,
        active
      }
    });
    
    res.json(nationalLevel);
  } catch (error: any) {
    console.error('Error updating national level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete national level
export const deleteNationalLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    await prisma.nationalLevel.delete({
      where: { id }
    });
    
    res.json({ message: 'National level deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting national level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

