import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import userService from '../services/userService';
import { AuthenticatedRequest } from '../types';
import { Prisma } from '@prisma/client';

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
          whereClause.nationalLevelId = nationalLevelId || undefined;
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          console.log('🏢 Region/lower level user - filtering to regionId:', regionId);
          whereClause.id = regionId || undefined;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) {
            console.log('👤 Regular user with regionId:', regionId);
            whereClause.id = regionId;
          } else {
            console.log('⚠️ User has no regionId assigned!');
          }
      }
    } else {
      console.log('⚠️ No user information in request! Authentication may have failed.');
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
          whereClause.id = nationalLevelId || undefined;
          break;
          
        default:
          // For other roles, restrict to their specific level if they have one
          if (nationalLevelId) {
            whereClause.id = nationalLevelId;
          }
      }
    }
    
    const nationalLevels = await prisma.nationalLevel.findMany({
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
          select: { regions: true, users: true }
        }
      },
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

