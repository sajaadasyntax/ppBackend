import { Response, NextFunction } from 'express';
import sectorHierarchyService from '../services/sectorHierarchyService';
import { AuthenticatedRequest } from '../types';

// ===== SECTOR NATIONAL LEVEL =====

export const getAllSectorNationalLevels = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { expatriateRegionId, originalOnly, expatriateOnly } = req.query;
    const isOriginalOnly = originalOnly === 'true';
    const isExpatriateOnly = expatriateOnly === 'true';
    
    // Convert expatriateRegionId to string or null
    const expatriateRegionIdValue = expatriateRegionId && typeof expatriateRegionId === 'string' && expatriateRegionId.trim() !== '' 
      ? expatriateRegionId.trim() 
      : null;
    
    const levels = await sectorHierarchyService.getAllSectorNationalLevels(expatriateRegionIdValue, isOriginalOnly, isExpatriateOnly);
    res.json({ success: true, data: levels });
  } catch (error: any) {
    console.error('Error in getAllSectorNationalLevels:', error);
    next ? next(error) : res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getSectorNationalLevelById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const level = await sectorHierarchyService.getSectorNationalLevelById(id);
    
    if (!level) {
      res.status(404).json({ error: 'Sector national level not found' });
      return;
    }
    
    res.json(level);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSectorNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const level = await sectorHierarchyService.createSectorNationalLevel(req.body);
    res.status(201).json(level);
  } catch (error: any) {
    if (error.message && (error.message.includes('required') || error.message.includes('Invalid'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A sector national level with this code already exists' });
      return;
    }
    if (error.code === 'P2003') {
      res.status(400).json({ error: 'Invalid expatriate region ID' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSectorNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const level = await sectorHierarchyService.updateSectorNationalLevel(id, req.body);
    res.json(level);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSectorNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorNationalLevel(id);
    res.json({ message: 'Sector national level deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== SECTOR REGION =====

export const getAllSectorRegions = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorNationalLevelId, expatriateRegionId, originalOnly, expatriateOnly } = req.query;
    const isOriginalOnly = originalOnly === 'true';
    const isExpatriateOnly = expatriateOnly === 'true';
    const regions = await sectorHierarchyService.getAllSectorRegions(
      sectorNationalLevelId as string,
      expatriateRegionId as string,
      isOriginalOnly,
      isExpatriateOnly
    );
    res.json({ success: true, data: regions });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSectorRegionById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await sectorHierarchyService.getSectorRegionById(id);
    
    if (!region) {
      res.status(404).json({ error: 'Sector region not found' });
      return;
    }
    
    res.json(region);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSectorRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const region = await sectorHierarchyService.createSectorRegion(req.body);
    res.status(201).json(region);
  } catch (error: any) {
    if (error.message && (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('conflicts'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A sector region with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSectorRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await sectorHierarchyService.updateSectorRegion(id, req.body);
    res.json(region);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSectorRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorRegion(id);
    res.json({ message: 'Sector region deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== SECTOR LOCALITY =====

export const getAllSectorLocalities = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorRegionId, expatriateRegionId, originalOnly, expatriateOnly } = req.query;
    const isOriginalOnly = originalOnly === 'true';
    const isExpatriateOnly = expatriateOnly === 'true';
    const localities = await sectorHierarchyService.getAllSectorLocalities(
      sectorRegionId as string,
      expatriateRegionId as string,
      isOriginalOnly,
      isExpatriateOnly
    );
    res.json({ success: true, data: localities });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSectorLocalityById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locality = await sectorHierarchyService.getSectorLocalityById(id);
    
    if (!locality) {
      res.status(404).json({ error: 'Sector locality not found' });
      return;
    }
    
    res.json(locality);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSectorLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const locality = await sectorHierarchyService.createSectorLocality(req.body);
    res.status(201).json(locality);
  } catch (error: any) {
    if (error.message && (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('conflicts'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A sector locality with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSectorLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locality = await sectorHierarchyService.updateSectorLocality(id, req.body);
    res.json(locality);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSectorLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorLocality(id);
    res.json({ message: 'Sector locality deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== SECTOR ADMIN UNIT =====

export const getAllSectorAdminUnits = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorLocalityId, expatriateRegionId, originalOnly, expatriateOnly } = req.query;
    const isOriginalOnly = originalOnly === 'true';
    const isExpatriateOnly = expatriateOnly === 'true';
    const adminUnits = await sectorHierarchyService.getAllSectorAdminUnits(
      sectorLocalityId as string,
      expatriateRegionId as string,
      isOriginalOnly,
      isExpatriateOnly
    );
    res.json({ success: true, data: adminUnits });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSectorAdminUnitById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUnit = await sectorHierarchyService.getSectorAdminUnitById(id);
    
    if (!adminUnit) {
      res.status(404).json({ error: 'Sector admin unit not found' });
      return;
    }
    
    res.json(adminUnit);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSectorAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const adminUnit = await sectorHierarchyService.createSectorAdminUnit(req.body);
    res.status(201).json(adminUnit);
  } catch (error: any) {
    if (error.message && (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('conflicts'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A sector admin unit with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSectorAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUnit = await sectorHierarchyService.updateSectorAdminUnit(id, req.body);
    res.json(adminUnit);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSectorAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorAdminUnit(id);
    res.json({ message: 'Sector admin unit deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== SECTOR DISTRICT =====

export const getAllSectorDistricts = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorAdminUnitId, expatriateRegionId, originalOnly, expatriateOnly } = req.query;
    const isOriginalOnly = originalOnly === 'true';
    const isExpatriateOnly = expatriateOnly === 'true';
    const districts = await sectorHierarchyService.getAllSectorDistricts(
      sectorAdminUnitId as string,
      expatriateRegionId as string,
      isOriginalOnly,
      isExpatriateOnly
    );
    res.json({ success: true, data: districts });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSectorDistrictById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const district = await sectorHierarchyService.getSectorDistrictById(id);
    
    if (!district) {
      res.status(404).json({ error: 'Sector district not found' });
      return;
    }
    
    res.json(district);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSectorDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const district = await sectorHierarchyService.createSectorDistrict(req.body);
    res.status(201).json(district);
  } catch (error: any) {
    if (error.message && (error.message.includes('required') || error.message.includes('Invalid') || error.message.includes('conflicts'))) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'A sector district with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateSectorDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const district = await sectorHierarchyService.updateSectorDistrict(id, req.body);
    res.json(district);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteSectorDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorDistrict(id);
    res.json({ message: 'Sector district deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== FULL HIERARCHY =====

export const getFullSectorHierarchy = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { expatriateRegionId } = req.query;
    const hierarchy = await sectorHierarchyService.getFullSectorHierarchy(expatriateRegionId as string);
    res.json(hierarchy);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ===== SECTOR MEMBERS MANAGEMENT =====

type SectorLevelType = 'national' | 'region' | 'locality' | 'adminUnit' | 'district';

const validLevels: SectorLevelType[] = ['national', 'region', 'locality', 'adminUnit', 'district'];

export const getSectorMembers = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorId, level } = req.params;
    
    if (!validLevels.includes(level as SectorLevelType)) {
      res.status(400).json({ error: 'Invalid sector level' });
      return;
    }
    
    const members = await sectorHierarchyService.getSectorMembers(sectorId, level as SectorLevelType);
    res.json({ success: true, data: members });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAvailableUsersForSector = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorId, level } = req.params;
    
    if (!validLevels.includes(level as SectorLevelType)) {
      res.status(400).json({ error: 'Invalid sector level' });
      return;
    }
    
    // Pass the requesting admin user to filter by geographic scope
    const adminUser = req.user;
    const users = await sectorHierarchyService.getAvailableUsersForSector(sectorId, level as SectorLevelType, adminUser);
    res.json({ success: true, data: users });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const addUserToSector = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorId, level } = req.params;
    const { userId } = req.body;
    
    if (!validLevels.includes(level as SectorLevelType)) {
      res.status(400).json({ error: 'Invalid sector level' });
      return;
    }
    
    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }
    
    const result = await sectorHierarchyService.addUserToSector(userId, sectorId, level as SectorLevelType);
    res.json({ success: true, data: result, message: 'User added to sector successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeUserFromSector = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { sectorId, level, userId } = req.params;
    
    if (!validLevels.includes(level as SectorLevelType)) {
      res.status(400).json({ error: 'Invalid sector level' });
      return;
    }
    
    const result = await sectorHierarchyService.removeUserFromSector(userId, sectorId, level as SectorLevelType);
    res.json({ success: true, data: result, message: 'User removed from sector successfully' });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    if (error.message === 'User does not belong to the specified sector') {
      res.status(400).json({ error: 'User does not belong to the specified sector' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

