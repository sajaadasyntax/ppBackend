import { Response, NextFunction } from 'express';
import HierarchicalUserService from '../services/hierarchicalUserService';
import { AuthenticatedRequest } from '../types';

/**
 * Hierarchical User Management Controller
 * Handles user management operations with hierarchical access control
 */

// Get users that the current admin can manage
export const getManageableUsers = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const users = await HierarchicalUserService.getManageableUsers(adminUser);
    
    // Return just the array for backwards compatibility with admin panel
    res.json(users);
  } catch (error: any) {
    console.error('Error getting manageable users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchical statistics for the current admin
export const getHierarchicalStats = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const stats = await HierarchicalUserService.getHierarchicalStats(adminUser);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('Error getting hierarchical stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get content that the current admin can manage
export const getManageableContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { contentType } = req.params;
    
    const validContentTypes = ['bulletins', 'surveys', 'votingItems', 'reports'];
    if (!contentType || !validContentTypes.includes(contentType)) {
      res.status(400).json({ 
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ') 
      });
      return;
    }
    
    const content = await HierarchicalUserService.getManageableContent(adminUser, contentType);
    
    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (error: any) {
    console.error('Error getting manageable content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if admin can manage a specific user
export const checkUserAccess = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { userId } = req.params;
    
    const canManage = await HierarchicalUserService.canManageUser(adminUser, userId);
    
    res.json({
      success: true,
      canManage,
      message: canManage ? 'Access granted' : 'Access denied'
    });
  } catch (error: any) {
    console.error('Error checking user access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if admin can manage specific content
export const checkContentAccess = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { contentType, contentId } = req.params;
    
    const validContentTypes = ['bulletins', 'surveys', 'votingItems', 'reports'];
    if (!contentType || !validContentTypes.includes(contentType)) {
      res.status(400).json({ 
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ') 
      });
      return;
    }
    
    const canManage = await HierarchicalUserService.canManageContent(adminUser, contentType, contentId);
    
    res.json({
      success: true,
      canManage,
      message: canManage ? 'Access granted' : 'Access denied'
    });
  } catch (error: any) {
    console.error('Error checking content access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by national level
export const getUsersByNationalLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { nationalLevelId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this national level
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser.nationalLevelId !== nationalLevelId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const users = await HierarchicalUserService.getUsersByNationalLevel(nationalLevelId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Error getting users by national level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by region
export const getUsersByRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this region
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.regionId !== regionId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const users = await HierarchicalUserService.getUsersByRegion(regionId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Error getting users by region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by locality
export const getUsersByLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this locality
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.localityId !== localityId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const users = await HierarchicalUserService.getUsersByLocality(localityId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Error getting users by locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by admin unit
export const getUsersByAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this admin unit
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.adminLevel !== 'LOCALITY' && adminUser.adminUnitId !== adminUnitId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const users = await HierarchicalUserService.getUsersByAdminUnit(adminUnitId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Error getting users by admin unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by district
export const getUsersByDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { districtId } = req.params;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this district
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.adminLevel !== 'LOCALITY' && adminUser.adminLevel !== 'ADMIN_UNIT' &&
        adminUser.districtId !== districtId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const users = await HierarchicalUserService.getUsersByDistrict(districtId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error: any) {
    console.error('Error getting users by district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for national level
export const createUserForNationalLevel = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { nationalLevelId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this national level
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser.nationalLevelId !== nationalLevelId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.createUserForNationalLevel(nationalLevelId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Error creating user for national level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for region
export const createUserForRegion = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this region
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.regionId !== regionId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.createUserForRegion(regionId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Error creating user for region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for locality
export const createUserForLocality = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this locality
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.localityId !== localityId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.createUserForLocality(localityId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Error creating user for locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for admin unit
export const createUserForAdminUnit = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this admin unit
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.adminLevel !== 'LOCALITY' && adminUser.adminUnitId !== adminUnitId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.createUserForAdminUnit(adminUnitId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Error creating user for admin unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for district
export const createUserForDistrict = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { districtId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this district
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminLevel !== 'NATIONAL_LEVEL' && adminUser.adminLevel !== 'REGION' &&
        adminUser.adminLevel !== 'LOCALITY' && adminUser.adminLevel !== 'ADMIN_UNIT' &&
        adminUser.districtId !== districtId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.createUserForDistrict(districtId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error: any) {
    console.error('Error creating user for district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user status
export const updateUserStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { userId } = req.params;
    const { active } = req.body;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Check if admin can manage this user
    const canManage = await HierarchicalUserService.canManageUser(adminUser, userId);
    if (!canManage) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }
    
    const user = await HierarchicalUserService.updateUserStatus(userId, active);
    
    res.json({
      success: true,
      data: user,
      message: 'User status updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin's jurisdiction information
export const getJurisdictionInfo = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const jurisdictionInfo = {
      adminLevel: adminUser.adminLevel,
      nationalLevelId: adminUser.nationalLevelId,
      regionId: adminUser.regionId,
      localityId: adminUser.localityId,
      adminUnitId: adminUser.adminUnitId,
      districtId: adminUser.districtId,
      nationalLevelName: adminUser.nationalLevel?.name || null,
      regionName: adminUser.region?.name || null,
      localityName: adminUser.locality?.name || null,
      adminUnitName: adminUser.adminUnit?.name || null,
      districtName: adminUser.district?.name || null
    };
    
    res.json({
      success: true,
      data: jurisdictionInfo
    });
  } catch (error: any) {
    console.error('Error getting jurisdiction info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

