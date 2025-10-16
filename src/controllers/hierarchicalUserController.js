const HierarchicalUserService = require('../services/hierarchicalUserService');

/**
 * Hierarchical User Management Controller
 * Handles user management operations with hierarchical access control
 */

// Get users that the current admin can manage
exports.getManageableUsers = async (req, res) => {
  try {
    const adminUser = req.user;
    const users = await HierarchicalUserService.getManageableUsers(adminUser);
    
    // Return just the array for backwards compatibility with admin panel
    res.json(users);
  } catch (error) {
    console.error('Error getting manageable users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchical statistics for the current admin
exports.getHierarchicalStats = async (req, res) => {
  try {
    const adminUser = req.user;
    const stats = await HierarchicalUserService.getHierarchicalStats(adminUser);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting hierarchical stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get content that the current admin can manage
exports.getManageableContent = async (req, res) => {
  try {
    const adminUser = req.user;
    const { contentType } = req.params;
    
    const validContentTypes = ['bulletins', 'surveys', 'votingItems', 'reports'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ') 
      });
    }
    
    const content = await HierarchicalUserService.getManageableContent(adminUser, contentType);
    
    res.json({
      success: true,
      data: content,
      count: content.length
    });
  } catch (error) {
    console.error('Error getting manageable content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if admin can manage a specific user
exports.checkUserAccess = async (req, res) => {
  try {
    const adminUser = req.user;
    const { userId } = req.params;
    
    const canManage = await HierarchicalUserService.canManageUser(adminUser, userId);
    
    res.json({
      success: true,
      canManage,
      message: canManage ? 'Access granted' : 'Access denied'
    });
  } catch (error) {
    console.error('Error checking user access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if admin can manage specific content
exports.checkContentAccess = async (req, res) => {
  try {
    const adminUser = req.user;
    const { contentType, contentId } = req.params;
    
    const validContentTypes = ['bulletins', 'surveys', 'votingItems', 'reports'];
    if (!validContentTypes.includes(contentType)) {
      return res.status(400).json({ 
        error: 'Invalid content type. Must be one of: ' + validContentTypes.join(', ') 
      });
    }
    
    const canManage = await HierarchicalUserService.canManageContent(adminUser, contentType, contentId);
    
    res.json({
      success: true,
      canManage,
      message: canManage ? 'Access granted' : 'Access denied'
    });
  } catch (error) {
    console.error('Error checking content access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by region
exports.getUsersByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    const adminUser = req.user;
    
    // Check if admin can manage this region
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser.regionId !== regionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await HierarchicalUserService.getUsersByRegion(regionId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error getting users by region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by locality
exports.getUsersByLocality = async (req, res) => {
  try {
    const { localityId } = req.params;
    const adminUser = req.user;
    
    // Check if admin can manage this locality
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.localityId !== localityId && adminUser.regionId !== adminUser.regionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await HierarchicalUserService.getUsersByLocality(localityId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error getting users by locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by admin unit
exports.getUsersByAdminUnit = async (req, res) => {
  try {
    const { adminUnitId } = req.params;
    const adminUser = req.user;
    
    // Check if admin can manage this admin unit
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminUnitId !== adminUnitId && adminUser.localityId !== adminUser.localityId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await HierarchicalUserService.getUsersByAdminUnit(adminUnitId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error getting users by admin unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by district
exports.getUsersByDistrict = async (req, res) => {
  try {
    const { districtId } = req.params;
    const adminUser = req.user;
    
    // Check if admin can manage this district
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.districtId !== districtId && adminUser.adminUnitId !== adminUser.adminUnitId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const users = await HierarchicalUserService.getUsersByDistrict(districtId);
    
    res.json({
      success: true,
      data: users,
      count: users.length
    });
  } catch (error) {
    console.error('Error getting users by district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for region
exports.createUserForRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    // Check if admin can manage this region
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && adminUser.regionId !== regionId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await HierarchicalUserService.createUserForRegion(regionId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user for region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for locality
exports.createUserForLocality = async (req, res) => {
  try {
    const { localityId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    // Check if admin can manage this locality
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.localityId !== localityId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await HierarchicalUserService.createUserForLocality(localityId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user for locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for admin unit
exports.createUserForAdminUnit = async (req, res) => {
  try {
    const { adminUnitId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    // Check if admin can manage this admin unit
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.adminUnitId !== adminUnitId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await HierarchicalUserService.createUserForAdminUnit(adminUnitId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user for admin unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create user for district
exports.createUserForDistrict = async (req, res) => {
  try {
    const { districtId } = req.params;
    const userData = req.body;
    const adminUser = req.user;
    
    // Check if admin can manage this district
    if (adminUser.adminLevel !== 'ADMIN' && adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.districtId !== districtId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await HierarchicalUserService.createUserForDistrict(districtId, userData);
    
    res.status(201).json({
      success: true,
      data: user,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user for district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;
    const adminUser = req.user;
    
    // Check if admin can manage this user
    const canManage = await HierarchicalUserService.canManageUser(adminUser, userId);
    if (!canManage) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const user = await HierarchicalUserService.updateUserStatus(userId, active);
    
    res.json({
      success: true,
      data: user,
      message: 'User status updated successfully'
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin's jurisdiction information
exports.getJurisdictionInfo = async (req, res) => {
  try {
    const adminUser = req.user;
    
    const jurisdictionInfo = {
      adminLevel: adminUser.adminLevel,
      regionId: adminUser.regionId,
      localityId: adminUser.localityId,
      adminUnitId: adminUser.adminUnitId,
      districtId: adminUser.districtId,
      regionName: adminUser.region?.name || null,
      localityName: adminUser.locality?.name || null,
      adminUnitName: adminUser.adminUnit?.name || null,
      districtName: adminUser.district?.name || null
    };
    
    res.json({
      success: true,
      data: jurisdictionInfo
    });
  } catch (error) {
    console.error('Error getting jurisdiction info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
