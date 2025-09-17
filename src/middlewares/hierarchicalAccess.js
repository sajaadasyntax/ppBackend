const HierarchicalUserService = require('../services/hierarchicalUserService');

/**
 * Middleware to enforce hierarchical access control
 * Ensures admins can only access data within their jurisdiction
 */

/**
 * Middleware to check if user can manage a specific user
 */
const canManageUser = async (req, res, next) => {
  try {
    const adminUser = req.user;
    const targetUserId = req.params.userId || req.params.id;
    
    if (!targetUserId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const canManage = await HierarchicalUserService.canManageUser(adminUser, targetUserId);
    
    if (!canManage) {
      return res.status(403).json({ 
        error: 'Forbidden - You can only manage users within your jurisdiction' 
      });
    }
    
    next();
  } catch (error) {
    console.error('Error in canManageUser middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to check if user can manage specific content
 */
const canManageContent = (contentType) => {
  return async (req, res, next) => {
    try {
      const adminUser = req.user;
      const contentId = req.params.id || req.params.contentId;
      
      if (!contentId) {
        return res.status(400).json({ error: 'Content ID is required' });
      }
      
      const canManage = await HierarchicalUserService.canManageContent(adminUser, contentType, contentId);
      
      if (!canManage) {
        return res.status(403).json({ 
          error: `Forbidden - You can only manage ${contentType} within your jurisdiction` 
        });
      }
      
      next();
    } catch (error) {
      console.error(`Error in canManageContent middleware for ${contentType}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to filter users based on hierarchical access
 */
const filterUsersByHierarchy = async (req, res, next) => {
  try {
    const adminUser = req.user;
    
    // Get manageable users based on admin's hierarchy level
    const manageableUsers = await HierarchicalUserService.getManageableUsers(adminUser);
    
    // Add the filtered users to the request object
    req.manageableUsers = manageableUsers;
    
    next();
  } catch (error) {
    console.error('Error in filterUsersByHierarchy middleware:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware to filter content based on hierarchical access
 */
const filterContentByHierarchy = (contentType) => {
  return async (req, res, next) => {
    try {
      const adminUser = req.user;
      
      // Get manageable content based on admin's hierarchy level
      const manageableContent = await HierarchicalUserService.getManageableContent(adminUser, contentType);
      
      // Add the filtered content to the request object
      req.manageableContent = manageableContent;
      
      next();
    } catch (error) {
      console.error(`Error in filterContentByHierarchy middleware for ${contentType}:`, error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
};

/**
 * Middleware to check if user has minimum admin level
 */
const requireAdminLevel = (minLevel) => {
  return (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Define hierarchy levels in order of authority
    const hierarchyLevels = {
      'USER': 0,
      'DISTRICT': 1,
      'ADMIN_UNIT': 2,
      'LOCALITY': 3,
      'REGION': 4,
      'GENERAL_SECRETARIAT': 5,
      'ADMIN': 6
    };
    
    const userLevel = hierarchyLevels[user.adminLevel] || 0;
    const requiredLevel = hierarchyLevels[minLevel] || 0;
    
    if (userLevel < requiredLevel) {
      return res.status(403).json({ 
        error: `Forbidden - Requires ${minLevel} level or higher` 
      });
    }
    
    next();
  };
};

module.exports = {
  canManageUser,
  canManageContent,
  filterUsersByHierarchy,
  filterContentByHierarchy,
  requireAdminLevel
};
