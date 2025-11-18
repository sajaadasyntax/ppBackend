import { Request, Response, NextFunction } from 'express';
import HierarchicalUserService from '../services/hierarchicalUserService';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to enforce hierarchical access control
 * Ensures admins can only access data within their jurisdiction
 */

/**
 * Middleware to check if user can manage a specific user
 */
export const canManageUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminUser = authReq.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const targetUserId = req.params.userId || req.params.id;
    
    if (!targetUserId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }
    
    const canManage = await HierarchicalUserService.canManageUser(adminUser, targetUserId);
    
    if (!canManage) {
      res.status(403).json({ 
        error: 'Forbidden - You can only manage users within your jurisdiction' 
      });
      return;
    }
    
    next();
  } catch (error: any) {
    console.error('Error in canManageUser middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user can manage specific content
 */
export const canManageContent = (contentType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const adminUser = authReq.user;
      
      if (!adminUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      const contentId = req.params.id || req.params.contentId;
      
      if (!contentId) {
        res.status(400).json({ error: 'Content ID is required' });
        return;
      }
      
      const canManage = await HierarchicalUserService.canManageContent(adminUser, contentType, contentId);
      
      if (!canManage) {
        res.status(403).json({ 
          error: `Forbidden - You can only manage ${contentType} within your jurisdiction` 
        });
        return;
      }
      
      next();
    } catch (error: any) {
      console.error(`Error in canManageContent middleware for ${contentType}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to filter users based on hierarchical access
 */
export const filterUsersByHierarchy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authReq = req as AuthenticatedRequest;
    const adminUser = authReq.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Get manageable users based on admin's hierarchy level
    const manageableUsers = await HierarchicalUserService.getManageableUsers(adminUser);
    
    // Add the filtered users to the request object
    (req as any).manageableUsers = manageableUsers;
    
    next();
  } catch (error: any) {
    console.error('Error in filterUsersByHierarchy middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to filter content based on hierarchical access
 */
export const filterContentByHierarchy = (contentType: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authReq = req as AuthenticatedRequest;
      const adminUser = authReq.user;
      
      if (!adminUser) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }
      
      // Get manageable content based on admin's hierarchy level
      const manageableContent = await HierarchicalUserService.getManageableContent(adminUser, contentType);
      
      // Add the filtered content to the request object
      (req as any).manageableContent = manageableContent;
      
      next();
    } catch (error: any) {
      console.error(`Error in filterContentByHierarchy middleware for ${contentType}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to check if user has minimum admin level
 */
export const requireAdminLevel = (minLevel: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;
    
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Define hierarchy levels in order of authority
    const hierarchyLevels: { [key: string]: number } = {
      'USER': 0,
      'DISTRICT': 1,
      'ADMIN_UNIT': 2,
      'LOCALITY': 3,
      'REGION': 4,
      'NATIONAL_LEVEL': 5,
      'GENERAL_SECRETARIAT': 6,
      'ADMIN': 7
    };
    
    const userLevel = hierarchyLevels[user.adminLevel] || 0;
    const requiredLevel = hierarchyLevels[minLevel] || 0;
    
    if (userLevel < requiredLevel) {
      res.status(403).json({ 
        error: `Forbidden - Requires ${minLevel} level or higher` 
      });
      return;
    }
    
    next();
  };
};

