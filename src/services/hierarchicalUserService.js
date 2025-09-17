const prisma = require('../utils/prisma');

/**
 * Hierarchical User Management Service
 * Implements the hierarchical data management system where admins can only manage users under their jurisdiction
 */

class HierarchicalUserService {
  
  /**
   * Get users that an admin can manage based on their hierarchical level
   * @param {Object} adminUser - The admin user object with hierarchy information
   * @returns {Array} Array of users that the admin can manage
   */
  static async getManageableUsers(adminUser) {
    const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    let whereClause = {};
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
        // General Secretariat can see all users
        whereClause = {};
        break;
        
      case 'REGION':
        // Region admin can see users in their region and all sub-levels
        whereClause = {
          regionId: regionId
        };
        break;
        
      case 'LOCALITY':
        // Locality admin can see users in their locality and all sub-levels
        // Users must be in the same region and locality
        whereClause = {
          regionId: regionId,
          localityId: localityId
        };
        break;
        
      case 'ADMIN_UNIT':
        // Admin unit admin can see users in their admin unit and all sub-levels
        // Users must be in the same region, locality, and admin unit
        whereClause = {
          regionId: regionId,
          localityId: localityId,
          adminUnitId: adminUnitId
        };
        break;
        
      case 'DISTRICT':
        // District admin can only see users in their district
        whereClause = {
          regionId: regionId,
          localityId: localityId,
          adminUnitId: adminUnitId,
          districtId: districtId
        };
        break;
        
      default:
        // Regular users can only see themselves
        whereClause = {
          id: adminUser.id
        };
    }
    
    return prisma.user.findMany({
      where: whereClause,
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  
  /**
   * Check if an admin can manage a specific user
   * @param {Object} adminUser - The admin user object
   * @param {String} targetUserId - The ID of the user to check
   * @returns {Boolean} True if the admin can manage the user
   */
  static async canManageUser(adminUser, targetUserId) {
    const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
    
    if (!targetUser) {
      return false;
    }
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
        return true;
        
      case 'REGION':
        // Region admin can manage users in their region and all sub-levels
        return targetUser.regionId === regionId;
        
      case 'LOCALITY':
        // Locality admin can manage users in their locality and all sub-levels
        // First check if they're in the same region, then check locality
        return targetUser.regionId === regionId && targetUser.localityId === localityId;
        
      case 'ADMIN_UNIT':
        // Admin unit admin can manage users in their admin unit and all sub-levels
        // Check region, locality, then admin unit
        return targetUser.regionId === regionId && 
               targetUser.localityId === localityId && 
               targetUser.adminUnitId === adminUnitId;
        
      case 'DISTRICT':
        // District admin can only manage users in their district
        return targetUser.regionId === regionId && 
               targetUser.localityId === localityId && 
               targetUser.adminUnitId === adminUnitId && 
               targetUser.districtId === districtId;
        
      default:
        return adminUser.id === targetUserId;
    }
  }
  
  /**
   * Get hierarchical statistics for an admin
   * @param {Object} adminUser - The admin user object
   * @returns {Object} Statistics about users under their management
   */
  static async getHierarchicalStats(adminUser) {
    const manageableUsers = await this.getManageableUsers(adminUser);
    
    const stats = {
      totalUsers: manageableUsers.length,
      usersByLevel: {},
      usersByRegion: {},
      usersByLocality: {},
      usersByAdminUnit: {},
      usersByDistrict: {}
    };
    
    // Count users by admin level
    manageableUsers.forEach(user => {
      const level = user.adminLevel || 'USER';
      stats.usersByLevel[level] = (stats.usersByLevel[level] || 0) + 1;
      
      // Count by region
      if (user.region?.name) {
        stats.usersByRegion[user.region.name] = (stats.usersByRegion[user.region.name] || 0) + 1;
      }
      
      // Count by locality
      if (user.locality?.name) {
        stats.usersByLocality[user.locality.name] = (stats.usersByLocality[user.locality.name] || 0) + 1;
      }
      
      // Count by admin unit
      if (user.adminUnit?.name) {
        stats.usersByAdminUnit[user.adminUnit.name] = (stats.usersByAdminUnit[user.adminUnit.name] || 0) + 1;
      }
      
      // Count by district
      if (user.district?.name) {
        stats.usersByDistrict[user.district.name] = (stats.usersByDistrict[user.district.name] || 0) + 1;
      }
    });
    
    return stats;
  }
  
  /**
   * Get content (bulletins, surveys, etc.) that an admin can manage
   * @param {Object} adminUser - The admin user object
   * @param {String} contentType - Type of content ('bulletins', 'surveys', 'votingItems', 'reports')
   * @returns {Array} Array of content items the admin can manage
   */
  static async getManageableContent(adminUser, contentType) {
    const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    let whereClause = {};
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
        // General Secretariat can see all content
        whereClause = {};
        break;
        
      case 'REGION':
        // Region admin can see content targeted to their region
        whereClause = {
          targetRegionId: regionId
        };
        break;
        
      case 'LOCALITY':
        // Locality admin can see content targeted to their locality
        whereClause = {
          targetLocalityId: localityId
        };
        break;
        
      case 'ADMIN_UNIT':
        // Admin unit admin can see content targeted to their admin unit
        whereClause = {
          targetAdminUnitId: adminUnitId
        };
        break;
        
      case 'DISTRICT':
        // District admin can see content targeted to their district
        whereClause = {
          targetDistrictId: districtId
        };
        break;
        
      default:
        // Regular users can only see content they created
        whereClause = {
          createdById: adminUser.id
        };
    }
    
    // Map content type to the appropriate model
    const modelMap = {
      'bulletins': prisma.bulletin,
      'surveys': prisma.survey,
      'votingItems': prisma.votingItem,
      'reports': prisma.report
    };
    
    const model = modelMap[contentType];
    if (!model) {
      throw new Error(`Invalid content type: ${contentType}`);
    }
    
    return model.findMany({
      where: whereClause,
      include: {
        targetRegion: true,
        targetLocality: true,
        targetAdminUnit: true,
        targetDistrict: true,
        createdBy: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }
  
  /**
   * Check if an admin can manage a specific content item
   * @param {Object} adminUser - The admin user object
   * @param {String} contentType - Type of content
   * @param {String} contentId - The ID of the content item
   * @returns {Boolean} True if the admin can manage the content
   */
  static async canManageContent(adminUser, contentType, contentId) {
    const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    // Map content type to the appropriate model
    const modelMap = {
      'bulletins': prisma.bulletin,
      'surveys': prisma.survey,
      'votingItems': prisma.votingItem,
      'reports': prisma.report
    };
    
    const model = modelMap[contentType];
    if (!model) {
      return false;
    }
    
    const content = await model.findUnique({
      where: { id: contentId },
      include: {
        targetRegion: true,
        targetLocality: true,
        targetAdminUnit: true,
        targetDistrict: true
      }
    });
    
    if (!content) {
      return false;
    }
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
        return true;
        
      case 'REGION':
        return content.targetRegionId === regionId;
        
      case 'LOCALITY':
        return content.targetLocalityId === localityId;
        
      case 'ADMIN_UNIT':
        return content.targetAdminUnitId === adminUnitId;
        
      case 'DISTRICT':
        return content.targetDistrictId === districtId;
        
      default:
        return content.createdById === adminUser.id;
    }
  }

  /**
   * Get users by region
   * @param {String} regionId - The region ID
   * @returns {Array} Array of users in the region
   */
  static async getUsersByRegion(regionId) {
    return prisma.user.findMany({
      where: { regionId },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get users by locality
   * @param {String} localityId - The locality ID
   * @returns {Array} Array of users in the locality
   */
  static async getUsersByLocality(localityId) {
    return prisma.user.findMany({
      where: { localityId },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get users by admin unit
   * @param {String} adminUnitId - The admin unit ID
   * @returns {Array} Array of users in the admin unit
   */
  static async getUsersByAdminUnit(adminUnitId) {
    return prisma.user.findMany({
      where: { adminUnitId },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get users by district
   * @param {String} districtId - The district ID
   * @returns {Array} Array of users in the district
   */
  static async getUsersByDistrict(districtId) {
    return prisma.user.findMany({
      where: { districtId },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create user for region
   * @param {String} regionId - The region ID
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async createUserForRegion(regionId, userData) {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return prisma.user.create({
      data: {
        email,
        mobileNumber,
        password: hashedPassword,
        adminLevel: adminLevel || 'USER',
        role: role || 'USER',
        regionId,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for locality
   * @param {String} localityId - The locality ID
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async createUserForLocality(localityId, userData) {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Get locality to find its region
    const locality = await prisma.locality.findUnique({
      where: { id: localityId },
      include: { region: true }
    });
    
    return prisma.user.create({
      data: {
        email,
        mobileNumber,
        password: hashedPassword,
        adminLevel: adminLevel || 'USER',
        role: role || 'USER',
        regionId: locality.regionId,
        localityId,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for admin unit
   * @param {String} adminUnitId - The admin unit ID
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async createUserForAdminUnit(adminUnitId, userData) {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Get admin unit to find its region and locality
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId },
      include: { 
        locality: {
          include: { region: true }
        }
      }
    });
    
    return prisma.user.create({
      data: {
        email,
        mobileNumber,
        password: hashedPassword,
        adminLevel: adminLevel || 'USER',
        role: role || 'USER',
        regionId: adminUnit.locality.regionId,
        localityId: adminUnit.localityId,
        adminUnitId,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for district
   * @param {String} districtId - The district ID
   * @param {Object} userData - User data
   * @returns {Object} Created user
   */
  static async createUserForDistrict(districtId, userData) {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Get district to find its hierarchy
    const district = await prisma.district.findUnique({
      where: { id: districtId },
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
    
    return prisma.user.create({
      data: {
        email,
        mobileNumber,
        password: hashedPassword,
        adminLevel: adminLevel || 'USER',
        role: role || 'USER',
        regionId: district.adminUnit.locality.regionId,
        localityId: district.adminUnit.localityId,
        adminUnitId: district.adminUnitId,
        districtId,
        profile: {
          create: {
            firstName,
            lastName
          }
        }
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Update user status
   * @param {String} userId - The user ID
   * @param {Boolean} active - New active status (true = active, false = inactive)
   * @returns {Object} Updated user
   */
  static async updateUserStatus(userId, active) {
    // Since the User model doesn't have an 'active' field,
    // we need to update the status in the profile table
    return prisma.user.update({
      where: { id: userId },
      data: { 
        profile: {
          update: {
            status: active ? "active" : "disabled" 
          }
        }
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }
}

module.exports = HierarchicalUserService;
