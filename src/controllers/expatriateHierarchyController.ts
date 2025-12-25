import { Response, NextFunction } from 'express';
import expatriateHierarchyService from '../services/expatriateHierarchyService';
import { AuthenticatedRequest } from '../types';

// ==================== EXPATRIATE NATIONAL LEVEL ====================

export const getAllExpatriateNationalLevels = async (_req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const nationalLevels = await expatriateHierarchyService.getAllExpatriateNationalLevels();
    res.json(nationalLevels);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateNationalLevelById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const nationalLevel = await expatriateHierarchyService.getExpatriateNationalLevelById(id);
    if (!nationalLevel) {
      res.status(404).json({ error: 'Expatriate national level not found' });
      return;
    }
    res.json(nationalLevel);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpatriateNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const nationalLevel = await expatriateHierarchyService.createExpatriateNationalLevel(req.body);
    res.status(201).json(nationalLevel);
  } catch (error: any) {
    if (error.message === 'Name is required') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An expatriate national level with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExpatriateNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const nationalLevel = await expatriateHierarchyService.updateExpatriateNationalLevel(id, req.body);
    res.json(nationalLevel);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpatriateNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateNationalLevel(id);
    res.json({ message: 'Expatriate national level deactivated successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== EXPATRIATE REGION ====================

export const getAllExpatriateRegions = async (_req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const regions = await expatriateHierarchyService.getAllExpatriateRegions();
    res.json(regions);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateRegionsByNationalLevel = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { nationalLevelId } = req.params;
    const regions = await expatriateHierarchyService.getExpatriateRegionsByNationalLevel(nationalLevelId);
    res.json(regions);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateRegionById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await expatriateHierarchyService.getExpatriateRegionById(id);
    if (!region) {
      res.status(404).json({ error: 'Expatriate region not found' });
      return;
    }
    res.json(region);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const region = await expatriateHierarchyService.createExpatriateRegion(req.body);
    res.status(201).json(region);
  } catch (error: any) {
    if (error.message === 'Name is required') {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An expatriate region with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await expatriateHierarchyService.updateExpatriateRegion(id, req.body);
    res.json(region);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateRegion(id);
    res.json({ message: 'Expatriate region deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsersByExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateRegion(id);
    res.json(users);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignUserToExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { expatriateRegionId } = req.body;
    const user = await expatriateHierarchyService.assignUserToExpatriateRegion(userId, expatriateRegionId);
    res.json(user);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUserForExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await expatriateHierarchyService.createUserForExpatriateRegion(id, req.body);
    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (error: any) {
    if (error.message.includes('required') || error.message.includes('not found') || error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== EXPATRIATE LOCALITY ====================

export const getExpatriateLocalitiesByRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    const localities = await expatriateHierarchyService.getExpatriateLocalitiesByRegion(regionId);
    res.json(localities);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateLocalityById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locality = await expatriateHierarchyService.getExpatriateLocalityById(id);
    if (!locality) {
      res.status(404).json({ error: 'Expatriate locality not found' });
      return;
    }
    res.json(locality);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpatriateLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const locality = await expatriateHierarchyService.createExpatriateLocality(req.body);
    res.status(201).json(locality);
  } catch (error: any) {
    if (error.message.includes('required')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An expatriate locality with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExpatriateLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const locality = await expatriateHierarchyService.updateExpatriateLocality(id, req.body);
    res.json(locality);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpatriateLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateLocality(id);
    res.json({ message: 'Expatriate locality deactivated successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsersByExpatriateLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateLocality(id);
    res.json(users);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== EXPATRIATE ADMIN UNIT ====================

export const getExpatriateAdminUnitsByLocality = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    const adminUnits = await expatriateHierarchyService.getExpatriateAdminUnitsByLocality(localityId);
    res.json(adminUnits);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateAdminUnitById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUnit = await expatriateHierarchyService.getExpatriateAdminUnitById(id);
    if (!adminUnit) {
      res.status(404).json({ error: 'Expatriate admin unit not found' });
      return;
    }
    res.json(adminUnit);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpatriateAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const adminUnit = await expatriateHierarchyService.createExpatriateAdminUnit(req.body);
    res.status(201).json(adminUnit);
  } catch (error: any) {
    if (error.message.includes('required')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An expatriate admin unit with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExpatriateAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const adminUnit = await expatriateHierarchyService.updateExpatriateAdminUnit(id, req.body);
    res.json(adminUnit);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpatriateAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateAdminUnit(id);
    res.json({ message: 'Expatriate admin unit deactivated successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsersByExpatriateAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateAdminUnit(id);
    res.json(users);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

// ==================== EXPATRIATE DISTRICT ====================

export const getExpatriateDistrictsByAdminUnit = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    const districts = await expatriateHierarchyService.getExpatriateDistrictsByAdminUnit(adminUnitId);
    res.json(districts);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getExpatriateDistrictById = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const district = await expatriateHierarchyService.getExpatriateDistrictById(id);
    if (!district) {
      res.status(404).json({ error: 'Expatriate district not found' });
      return;
    }
    res.json(district);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createExpatriateDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const district = await expatriateHierarchyService.createExpatriateDistrict(req.body);
    res.status(201).json(district);
  } catch (error: any) {
    if (error.message.includes('required')) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'An expatriate district with this code already exists' });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateExpatriateDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const district = await expatriateHierarchyService.updateExpatriateDistrict(id, req.body);
    res.json(district);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteExpatriateDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateDistrict(id);
    res.json({ message: 'Expatriate district deactivated successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUsersByExpatriateDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateDistrict(id);
    res.json(users);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUserForExpatriateDistrict = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await expatriateHierarchyService.createUserForExpatriateDistrict(id, req.body);
    res.status(201).json({ success: true, data: user, message: 'User created successfully' });
  } catch (error: any) {
    if (error.message.includes('required') || error.message.includes('not found') || error.message.includes('already exists')) {
      res.status(400).json({ error: error.message });
      return;
    }
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};
