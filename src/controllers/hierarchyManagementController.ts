import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';
import { 
  prepareHierarchyData, 
  normalizeCode,
  isUniqueConstraintError, 
  isNotFoundError,
  getConstraintErrorMessage 
} from '../utils/hierarchyValidation';

/**
 * Hierarchy Management Controller
 * Handles CRUD operations for administrative hierarchy elements
 */

// Get all regions with hierarchical access control
export const getRegions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user; // Get the admin user with hierarchy info
    let whereClause: any = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, regionId } = adminUser;
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all regions
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          whereClause.id = regionId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) whereClause.id = regionId;
      }
    }
    
    const regions = await prisma.region.findMany({
      where: whereClause,
      include: {
        localities: {
          where: { active: true },
          include: {
            adminUnits: {
              where: { active: true },
              include: {
                districts: {
                  where: { active: true }
                }
              }
            }
          }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Returning ${regions.length} regions based on user hierarchy level: ${adminUser?.adminLevel}`);
    
    res.json(regions);
  } catch (error: any) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

// Get localities by region
export const getLocalitiesByRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if user has access to this region
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== regionId) {
      console.log('Access denied to localities for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        requestedRegion: regionId
      });
      res.status(403).json({ error: 'Access denied to this region' });
      return;
    }
    
    console.log('User accessing localities for region:', regionId);
    
    const localities = await prisma.locality.findMany({
      where: { 
        regionId,
        active: true 
      },
      include: {
        adminUnits: {
          where: { active: true },
          include: {
            districts: {
              where: { active: true }
            }
          }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${localities.length} localities for region ${regionId}`);
    res.json(localities);
  } catch (error: any) {
    console.error('Error fetching localities:', error);
    res.status(500).json({ error: 'Failed to fetch localities' });
  }
};

// Get admin units by locality
export const getAdminUnitsByLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // First, get the locality to check its region
    const locality = await prisma.locality.findUnique({
      where: { id: localityId },
      select: { regionId: true }
    });
    
    if (!locality) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    
    // Check if user has access to this locality's region
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== locality.regionId &&
        adminUser.localityId !== localityId) {
      console.log('Access denied to admin units for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        userLocality: adminUser.localityId,
        requestedLocality: localityId,
        localityRegion: locality.regionId
      });
      res.status(403).json({ error: 'Access denied to this locality' });
      return;
    }
    
    console.log('User accessing admin units for locality:', localityId);
    
    const adminUnits = await prisma.adminUnit.findMany({
      where: { 
        localityId,
        active: true 
      },
      include: {
        districts: {
          where: { active: true }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${adminUnits.length} admin units for locality ${localityId}`);
    res.json(adminUnits);
  } catch (error: any) {
    console.error('Error fetching admin units:', error);
    res.status(500).json({ error: 'Failed to fetch admin units' });
  }
};

// Get districts by admin unit
export const getDistrictsByAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // First, get the admin unit to check its locality and region
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId },
      include: {
        locality: { select: { regionId: true } }
      }
    });
    
    if (!adminUnit) {
      res.status(404).json({ error: 'Admin unit not found' });
      return;
    }
    
    // Check if user has access to this admin unit's region or locality
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== adminUnit.locality.regionId &&
        adminUser.localityId !== adminUnit.localityId &&
        adminUser.adminUnitId !== adminUnitId) {
      console.log('Access denied to districts for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        userLocality: adminUser.localityId,
        userAdminUnit: adminUser.adminUnitId,
        requestedAdminUnit: adminUnitId,
        adminUnitLocality: adminUnit.localityId,
        adminUnitRegion: adminUnit.locality.regionId
      });
      res.status(403).json({ error: 'Access denied to this admin unit' });
      return;
    }
    
    console.log('User accessing districts for admin unit:', adminUnitId);
    
    const districts = await prisma.district.findMany({
      where: { 
        adminUnitId,
        active: true 
      },
      include: {
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${districts.length} districts for admin unit ${adminUnitId}`);
    res.json(districts);
  } catch (error: any) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
};

// Helper function to get or create default national level
async function getOrCreateDefaultNationalLevel() {
  let nationalLevel = await prisma.nationalLevel.findFirst({
    where: { active: true }
  });
  
  if (!nationalLevel) {
    nationalLevel = await prisma.nationalLevel.create({
      data: {
        name: 'المستوى القومي',
        code: 'NATIONAL',
        description: 'المستوى القومي الأعلى',
        active: true
      }
    });
  }
  
  return nationalLevel;
}

// Create new region
export const createRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, nationalLevelId } = req.body;
    
    // Use centralized validation
    const preparedData = prepareHierarchyData({ name, code, description });
    if (!preparedData.isValid) {
      res.status(400).json({ error: preparedData.error });
      return;
    }
    
    // Get or create default national level if not provided
    let targetNationalLevelId = nationalLevelId;
    if (!targetNationalLevelId) {
      const defaultNationalLevel = await getOrCreateDefaultNationalLevel();
      targetNationalLevelId = defaultNationalLevel.id;
    }
    
    const region = await prisma.region.create({
      data: {
        name: preparedData.name,
        code: preparedData.code,
        description: preparedData.description,
        active: true,
        nationalLevelId: targetNationalLevelId
      }
    });
    
    res.status(201).json(region);
  } catch (error: any) {
    console.error('Error creating region:', error);
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'region') });
      return;
    }
    res.status(500).json({ error: 'Failed to create region' });
  }
};

// Create new locality
export const createLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, regionId } = req.body;
    
    // Use centralized validation
    const preparedData = prepareHierarchyData({ name, code, description });
    if (!preparedData.isValid) {
      res.status(400).json({ error: preparedData.error });
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
      res.status(400).json({ error: 'Region not found' });
      return;
    }
    
    const locality = await prisma.locality.create({
      data: {
        name: preparedData.name,
        code: preparedData.code,
        description: preparedData.description,
        regionId,
        active: true
      },
      include: {
        region: true
      }
    });
    
    res.status(201).json(locality);
  } catch (error: any) {
    console.error('Error creating locality:', error);
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'locality') });
      return;
    }
    res.status(500).json({ error: 'Failed to create locality' });
  }
};

// Create new admin unit
export const createAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, localityId } = req.body;
    
    // Use centralized validation
    const preparedData = prepareHierarchyData({ name, code, description });
    if (!preparedData.isValid) {
      res.status(400).json({ error: preparedData.error });
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
      res.status(400).json({ error: 'Locality not found' });
      return;
    }
    
    const adminUnit = await prisma.adminUnit.create({
      data: {
        name: preparedData.name,
        code: preparedData.code,
        description: preparedData.description,
        localityId,
        active: true
      },
      include: {
        locality: {
          include: { region: true }
        }
      }
    });
    
    res.status(201).json(adminUnit);
  } catch (error: any) {
    console.error('Error creating admin unit:', error);
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'admin unit') });
      return;
    }
    res.status(500).json({ error: 'Failed to create admin unit' });
  }
};

// Create new district
export const createDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { name, code, description, adminUnitId } = req.body;
    
    // Use centralized validation
    const preparedData = prepareHierarchyData({ name, code, description });
    if (!preparedData.isValid) {
      res.status(400).json({ error: preparedData.error });
      return;
    }
    
    if (!adminUnitId) {
      res.status(400).json({ error: 'Admin unit ID is required' });
      return;
    }
    
    // Verify admin unit exists
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId }
    });
    if (!adminUnit) {
      res.status(400).json({ error: 'Admin unit not found' });
      return;
    }
    
    const district = await prisma.district.create({
      data: {
        name: preparedData.name,
        code: preparedData.code,
        description: preparedData.description,
        adminUnitId,
        active: true
      },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: { region: true }
            }
          }
        }
      }
    });
    
    res.status(201).json(district);
  } catch (error: any) {
    console.error('Error creating district:', error);
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'district') });
      return;
    }
    res.status(500).json({ error: 'Failed to create district' });
  }
};

// Update region
export const updateRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, active, updatedAt: clientUpdatedAt } = req.body;
    
    // Optimistic locking: check if record has been modified since client fetched it
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      if (isNaN(clientTime.getTime())) {
        res.status(400).json({ 
          error: 'Invalid updatedAt format. Please provide a valid ISO date string.',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      
      const currentRegion = await prisma.region.findUnique({
        where: { id },
        select: { updatedAt: true }
      });
      if (currentRegion) {
        const timeDiff = Math.abs(currentRegion.updatedAt.getTime() - clientTime.getTime());
        if (timeDiff >= 1000) {
          res.status(409).json({ 
            error: 'This region has been modified by another user. Please refresh and try again.',
            code: 'OPTIMISTIC_LOCK_CONFLICT'
          });
          return;
        }
      }
    }
    
    // Normalize code before saving
    const normalizedCode = normalizeCode(code);
    
    const region = await prisma.region.update({
      where: { id },
      data: {
        name: name?.trim(),
        code: normalizedCode,
        description: description?.trim() || undefined,
        active
      }
    });
    
    res.json(region);
  } catch (error: any) {
    console.error('Error updating region:', error);
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'region') });
      return;
    }
    res.status(500).json({ error: 'Failed to update region' });
  }
};

// Update locality
export const updateLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, active, regionId, updatedAt: clientUpdatedAt } = req.body;
    
    // Optimistic locking: check if record has been modified since client fetched it
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      if (isNaN(clientTime.getTime())) {
        res.status(400).json({ 
          error: 'Invalid updatedAt format. Please provide a valid ISO date string.',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      
      const currentLocality = await prisma.locality.findUnique({
        where: { id },
        select: { updatedAt: true }
      });
      if (currentLocality) {
        const timeDiff = Math.abs(currentLocality.updatedAt.getTime() - clientTime.getTime());
        if (timeDiff >= 1000) {
          res.status(409).json({ 
            error: 'This locality has been modified by another user. Please refresh and try again.',
            code: 'OPTIMISTIC_LOCK_CONFLICT'
          });
          return;
        }
      }
    }
    
    // Normalize code before saving
    const normalizedCode = normalizeCode(code);
    
    const locality = await prisma.locality.update({
      where: { id },
      data: {
        name: name?.trim(),
        code: normalizedCode,
        description: description?.trim() || undefined,
        active,
        regionId
      },
      include: {
        region: true
      }
    });
    
    res.json(locality);
  } catch (error: any) {
    console.error('Error updating locality:', error);
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'locality') });
      return;
    }
    res.status(500).json({ error: 'Failed to update locality' });
  }
};

// Update admin unit
export const updateAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, active, localityId, updatedAt: clientUpdatedAt } = req.body;
    
    // Optimistic locking: check if record has been modified since client fetched it
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      if (isNaN(clientTime.getTime())) {
        res.status(400).json({ 
          error: 'Invalid updatedAt format. Please provide a valid ISO date string.',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      
      const currentAdminUnit = await prisma.adminUnit.findUnique({
        where: { id },
        select: { updatedAt: true }
      });
      if (currentAdminUnit) {
        const timeDiff = Math.abs(currentAdminUnit.updatedAt.getTime() - clientTime.getTime());
        if (timeDiff >= 1000) {
          res.status(409).json({ 
            error: 'This admin unit has been modified by another user. Please refresh and try again.',
            code: 'OPTIMISTIC_LOCK_CONFLICT'
          });
          return;
        }
      }
    }
    
    // Normalize code before saving
    const normalizedCode = normalizeCode(code);
    
    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: {
        name: name?.trim(),
        code: normalizedCode,
        description: description?.trim() || undefined,
        active,
        localityId
      },
      include: {
        locality: {
          include: { region: true }
        }
      }
    });
    
    res.json(adminUnit);
  } catch (error: any) {
    console.error('Error updating admin unit:', error);
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Admin unit not found' });
      return;
    }
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'admin unit') });
      return;
    }
    res.status(500).json({ error: 'Failed to update admin unit' });
  }
};

// Update district
export const updateDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, active, adminUnitId, updatedAt: clientUpdatedAt } = req.body;
    
    // Optimistic locking: check if record has been modified since client fetched it
    if (clientUpdatedAt) {
      const clientTime = new Date(clientUpdatedAt);
      if (isNaN(clientTime.getTime())) {
        res.status(400).json({ 
          error: 'Invalid updatedAt format. Please provide a valid ISO date string.',
          code: 'INVALID_DATE_FORMAT'
        });
        return;
      }
      
      const currentDistrict = await prisma.district.findUnique({
        where: { id },
        select: { updatedAt: true }
      });
      if (currentDistrict) {
        const timeDiff = Math.abs(currentDistrict.updatedAt.getTime() - clientTime.getTime());
        if (timeDiff >= 1000) {
          res.status(409).json({ 
            error: 'This district has been modified by another user. Please refresh and try again.',
            code: 'OPTIMISTIC_LOCK_CONFLICT'
          });
          return;
        }
      }
    }
    
    // Normalize code before saving
    const normalizedCode = normalizeCode(code);
    
    const district = await prisma.district.update({
      where: { id },
      data: {
        name: name?.trim(),
        code: normalizedCode,
        description: description?.trim() || undefined,
        active,
        adminUnitId
      },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: { region: true }
            }
          }
        }
      }
    });
    
    res.json(district);
  } catch (error: any) {
    console.error('Error updating district:', error);
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    if (isUniqueConstraintError(error)) {
      res.status(400).json({ error: getConstraintErrorMessage(error, 'district') });
      return;
    }
    res.status(500).json({ error: 'Failed to update district' });
  }
};

// Delete (deactivate) region
export const deleteRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Use transaction to atomically check for children and update
    // This prevents race conditions where children could be added between check and update
    const region = await prisma.$transaction(async (tx) => {
      // Check if region has localities within the transaction
      const localitiesCount = await tx.locality.count({
        where: { regionId: id, active: true }
      });
      
      if (localitiesCount > 0) {
        throw new Error('ACTIVE_CHILDREN:Cannot delete region with active localities. Please deactivate all localities first.');
      }
      
      return tx.region.update({
        where: { id },
        data: { active: false }
      });
    });
    
    res.json({ message: 'Region deactivated successfully', region });
  } catch (error: any) {
    console.error('Error deleting region:', error);
    if (error.message?.startsWith('ACTIVE_CHILDREN:')) {
      res.status(400).json({ error: error.message.replace('ACTIVE_CHILDREN:', '') });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete region' });
  }
};

// Delete (deactivate) locality
export const deleteLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Use transaction to atomically check for children and update
    // This prevents race conditions where children could be added between check and update
    const locality = await prisma.$transaction(async (tx) => {
      // Check if locality has admin units within the transaction
      const adminUnitsCount = await tx.adminUnit.count({
        where: { localityId: id, active: true }
      });
      
      if (adminUnitsCount > 0) {
        throw new Error('ACTIVE_CHILDREN:Cannot delete locality with active admin units. Please deactivate all admin units first.');
      }
      
      return tx.locality.update({
        where: { id },
        data: { active: false }
      });
    });
    
    res.json({ message: 'Locality deactivated successfully', locality });
  } catch (error: any) {
    console.error('Error deleting locality:', error);
    if (error.message?.startsWith('ACTIVE_CHILDREN:')) {
      res.status(400).json({ error: error.message.replace('ACTIVE_CHILDREN:', '') });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete locality' });
  }
};

// Delete (deactivate) admin unit
export const deleteAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Use transaction to atomically check for children and update
    // This prevents race conditions where children could be added between check and update
    const adminUnit = await prisma.$transaction(async (tx) => {
      // Check if admin unit has districts within the transaction
      const districtsCount = await tx.district.count({
        where: { adminUnitId: id, active: true }
      });
      
      if (districtsCount > 0) {
        throw new Error('ACTIVE_CHILDREN:Cannot delete admin unit with active districts. Please deactivate all districts first.');
      }
      
      return tx.adminUnit.update({
        where: { id },
        data: { active: false }
      });
    });
    
    res.json({ message: 'Admin unit deactivated successfully', adminUnit });
  } catch (error: any) {
    console.error('Error deleting admin unit:', error);
    if (error.message?.startsWith('ACTIVE_CHILDREN:')) {
      res.status(400).json({ error: error.message.replace('ACTIVE_CHILDREN:', '') });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Admin unit not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete admin unit' });
  }
};

// Delete (deactivate) district
export const deleteDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Use transaction to atomically check for users and update
    // This prevents race conditions where users could be assigned between check and update
    const district = await prisma.$transaction(async (tx) => {
      // Check if district has users within the transaction
      const usersCount = await tx.user.count({
        where: { districtId: id }
      });
      
      if (usersCount > 0) {
        throw new Error('ACTIVE_CHILDREN:Cannot delete district with assigned users. Please reassign users first.');
      }
      
      return tx.district.update({
        where: { id },
        data: { active: false }
      });
    });
    
    res.json({ message: 'District deactivated successfully', district });
  } catch (error: any) {
    console.error('Error deleting district:', error);
    if (error.message?.startsWith('ACTIVE_CHILDREN:')) {
      res.status(400).json({ error: error.message.replace('ACTIVE_CHILDREN:', '') });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'District not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete district' });
  }
};

// Get hierarchy statistics
export const getHierarchyStats = async (_req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const stats = {
      counts: {
        regions: await prisma.region.count({ where: { active: true } }),
        localities: await prisma.locality.count({ where: { active: true } }),
        adminUnits: await prisma.adminUnit.count({ where: { active: true } }),
        districts: await prisma.district.count({ where: { active: true } }),
        users: await prisma.user.count()
      },
      totalUsers: await prisma.user.count(),
      usersWithHierarchy: await prisma.user.count({
        where: {
          OR: [
            { regionId: { not: null } },
            { localityId: { not: null } },
            { adminUnitId: { not: null } },
            { districtId: { not: null } }
          ]
        }
      })
    };
    
    res.json(stats);
  } catch (error: any) {
    console.error('Error fetching hierarchy stats:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy statistics' });
  }
};

// Get full hierarchy tree
export const getHierarchyTree = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user; // Get the admin user with hierarchy info
    let whereClause: any = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, regionId } = adminUser;
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // Admin and General Secretariat can see all regions
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          whereClause.id = regionId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) whereClause.id = regionId;
      }
    }
    
    const tree = await prisma.region.findMany({
      where: whereClause,
      include: {
        localities: {
          where: { active: true },
          include: {
            adminUnits: {
              where: { active: true },
              include: {
                districts: {
                  where: { active: true },
                  include: {
                    _count: {
                      select: { users: true }
                    }
                  }
                },
                _count: {
                  select: { districts: true, users: true }
                }
              }
            },
            _count: {
              select: { adminUnits: true, users: true }
            }
          }
        },
        _count: {
          select: { localities: true, users: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(tree);
  } catch (error: any) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy tree' });
  }
};

