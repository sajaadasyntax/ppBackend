import { Response, NextFunction } from 'express';
import expatriateHierarchyService from '../services/expatriateHierarchyService';
import { AuthenticatedRequest } from '../types';

/**
 * Get all expatriate regions
 */
export const getAllExpatriateRegions = async (_req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const regions = await expatriateHierarchyService.getAllExpatriateRegions();
    res.json(regions);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get expatriate region by ID
 */
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

/**
 * Create new expatriate region
 */
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

/**
 * Update expatriate region
 */
export const updateExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const region = await expatriateHierarchyService.updateExpatriateRegion(id, req.body);
    res.json(region);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete expatriate region
 */
export const deleteExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateRegion(id);
    res.json({ message: 'Expatriate region deleted successfully' });
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get users by expatriate region
 */
export const getUsersByExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateRegion(id);
    res.json(users);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Assign user to expatriate region
 */
export const assignUserToExpatriateRegion = async (req: AuthenticatedRequest, res: Response, next?: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { expatriateRegionId } = req.body;
    
    const user = await expatriateHierarchyService.assignUserToExpatriateRegion(
      userId,
      expatriateRegionId
    );
    
    res.json(user);
  } catch (error: any) {
    next ? next(error) : res.status(500).json({ error: 'Internal server error' });
  }
};

