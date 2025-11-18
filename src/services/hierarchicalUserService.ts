import prisma from '../utils/prisma';
import * as bcrypt from 'bcrypt';
import { UserPayload } from '../types';
import { Prisma } from '@prisma/client';

/**
 * Hierarchical User Management Service
 * Implements the hierarchical data management system where admins can only manage users under their jurisdiction
 */

interface AdminUser extends UserPayload {
  id: string;
}

interface UserData {
  name: string;
  email?: string;
  mobileNumber: string;
  password: string;
  adminLevel?: string;
  role?: string;
}

interface HierarchyCounts {
  nationalLevels: number;
  regions: number;
  localities: number;
  adminUnits: number;
  districts: number;
}

interface HierarchicalStats extends HierarchyCounts {
  totalUsers: number;
  usersByLevel: { [key: string]: number };
  usersByRegion: { [key: string]: number };
  usersByLocality: { [key: string]: number };
  usersByAdminUnit: { [key: string]: number };
  usersByDistrict: { [key: string]: number };
}

class HierarchicalUserService {
  
  /**
   * Get users that an admin can manage based on their hierarchical level
   */
  static async getManageableUsers(adminUser: AdminUser): Promise<any[]> {
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    let whereClause: Prisma.UserWhereInput = {};
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
      case 'ADMIN':
        // General Secretariat and Admin can see all users
        whereClause = {};
        break;
        
      case 'NATIONAL_LEVEL':
        // National level admin can see users in their national level and all sub-levels
        whereClause = {
          nationalLevelId: nationalLevelId || undefined
        };
        break;
        
      case 'REGION':
        // Region admin can see users in their region and all sub-levels
        whereClause = {
          regionId: regionId || undefined
        };
        break;
        
      case 'LOCALITY':
        // Locality admin can see users in their locality and all sub-levels
        whereClause = {
          regionId: regionId || undefined,
          localityId: localityId || undefined
        };
        break;
        
      case 'ADMIN_UNIT':
        // Admin unit admin can see users in their admin unit and all sub-levels
        whereClause = {
          regionId: regionId || undefined,
          localityId: localityId || undefined,
          adminUnitId: adminUnitId || undefined
        };
        break;
        
      case 'DISTRICT':
        // District admin can only see users in their district
        whereClause = {
          regionId: regionId || undefined,
          localityId: localityId || undefined,
          adminUnitId: adminUnitId || undefined,
          districtId: districtId || undefined
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
        nationalLevel: true,
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
   */
  static async canManageUser(adminUser: AdminUser, targetUserId: string): Promise<boolean> {
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        nationalLevel: true,
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
      case 'ADMIN':
        return true;
        
      case 'NATIONAL_LEVEL':
        return targetUser.nationalLevelId === nationalLevelId;
        
      case 'REGION':
        return targetUser.regionId === regionId;
        
      case 'LOCALITY':
        return targetUser.regionId === regionId && targetUser.localityId === localityId;
        
      case 'ADMIN_UNIT':
        return targetUser.regionId === regionId && 
               targetUser.localityId === localityId && 
               targetUser.adminUnitId === adminUnitId;
        
      case 'DISTRICT':
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
   */
  static async getHierarchicalStats(adminUser: AdminUser): Promise<HierarchicalStats> {
    const manageableUsers = await this.getManageableUsers(adminUser);
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId } = adminUser;
    
    // Get hierarchy counts based on admin level
    let hierarchyCounts: HierarchyCounts = {
      nationalLevels: 0,
      regions: 0,
      localities: 0,
      adminUnits: 0,
      districts: 0
    };
    
    if (adminLevel === 'GENERAL_SECRETARIAT' || adminLevel === 'ADMIN') {
      // Count all levels
      const [nationalLevelsCount, regionsCount, localitiesCount, adminUnitsCount, districtsCount] = await Promise.all([
        prisma.nationalLevel.count(),
        prisma.region.count(),
        prisma.locality.count(),
        prisma.adminUnit.count(),
        prisma.district.count()
      ]);
      
      hierarchyCounts = {
        nationalLevels: nationalLevelsCount,
        regions: regionsCount,
        localities: localitiesCount,
        adminUnits: adminUnitsCount,
        districts: districtsCount
      };
    } else if (adminLevel === 'NATIONAL_LEVEL') {
      // Count regions under this national level
      const regionsCount = await prisma.region.count({
        where: { nationalLevelId: nationalLevelId || undefined }
      });
      
      // Get all regions under this national level to count sub-levels
      const regions = await prisma.region.findMany({
        where: { nationalLevelId: nationalLevelId || undefined },
        select: { id: true }
      });
      
      const regionIds = regions.map(r => r.id);
      
      const [localitiesCount, adminUnitsCount, districtsCount] = await Promise.all([
        prisma.locality.count({
          where: { regionId: { in: regionIds } }
        }),
        prisma.adminUnit.count({
          where: { locality: { regionId: { in: regionIds } } }
        }),
        prisma.district.count({
          where: { adminUnit: { locality: { regionId: { in: regionIds } } } }
        })
      ]);
      
      hierarchyCounts = {
        nationalLevels: 1,
        regions: regionsCount,
        localities: localitiesCount,
        adminUnits: adminUnitsCount,
        districts: districtsCount
      };
    } else if (adminLevel === 'REGION') {
      const [localitiesCount, adminUnitsCount, districtsCount] = await Promise.all([
        prisma.locality.count({ where: { regionId: regionId || undefined } }),
        prisma.adminUnit.count({ where: { locality: { regionId: regionId || undefined } } }),
        prisma.district.count({ where: { adminUnit: { locality: { regionId: regionId || undefined } } } })
      ]);
      
      hierarchyCounts = {
        nationalLevels: 0,
        regions: 1,
        localities: localitiesCount,
        adminUnits: adminUnitsCount,
        districts: districtsCount
      };
    } else if (adminLevel === 'LOCALITY') {
      const [adminUnitsCount, districtsCount] = await Promise.all([
        prisma.adminUnit.count({ where: { localityId: localityId || undefined } }),
        prisma.district.count({ where: { adminUnit: { localityId: localityId || undefined } } })
      ]);
      
      hierarchyCounts = {
        nationalLevels: 0,
        regions: 0,
        localities: 1,
        adminUnits: adminUnitsCount,
        districts: districtsCount
      };
    } else if (adminLevel === 'ADMIN_UNIT') {
      const districtsCount = await prisma.district.count({
        where: { adminUnitId: adminUnitId || undefined }
      });
      
      hierarchyCounts = {
        nationalLevels: 0,
        regions: 0,
        localities: 0,
        adminUnits: 1,
        districts: districtsCount
      };
    } else if (adminLevel === 'DISTRICT') {
      hierarchyCounts = {
        nationalLevels: 0,
        regions: 0,
        localities: 0,
        adminUnits: 0,
        districts: 1
      };
    }
    
    const stats: HierarchicalStats = {
      totalUsers: manageableUsers.length,
      ...hierarchyCounts,
      usersByLevel: {},
      usersByRegion: {},
      usersByLocality: {},
      usersByAdminUnit: {},
      usersByDistrict: {}
    };
    
    // Count users by admin level
    manageableUsers.forEach((user: any) => {
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
   */
  static async getManageableContent(adminUser: AdminUser, contentType: string): Promise<any[]> {
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    let whereClause: any = {};
    
    switch (adminLevel) {
      case 'GENERAL_SECRETARIAT':
      case 'ADMIN':
        whereClause = {};
        break;
        
      case 'NATIONAL_LEVEL':
        whereClause = {
          targetNationalLevelId: nationalLevelId || undefined
        };
        break;
        
      case 'REGION':
        whereClause = {
          targetRegionId: regionId || undefined
        };
        break;
        
      case 'LOCALITY':
        whereClause = {
          targetLocalityId: localityId || undefined
        };
        break;
        
      case 'ADMIN_UNIT':
        whereClause = {
          targetAdminUnitId: adminUnitId || undefined
        };
        break;
        
      case 'DISTRICT':
        whereClause = {
          targetDistrictId: districtId || undefined
        };
        break;
        
      default:
        whereClause = {
          createdById: adminUser.id
        };
    }
    
    // Map content type to the appropriate model
    const modelMap: { [key: string]: any } = {
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
        targetNationalLevel: true,
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
   */
  static async canManageContent(adminUser: AdminUser, contentType: string, contentId: string): Promise<boolean> {
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    // Map content type to the appropriate model
    const modelMap: { [key: string]: any } = {
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
        targetNationalLevel: true,
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
      case 'ADMIN':
        return true;
        
      case 'NATIONAL_LEVEL':
        return content.targetNationalLevelId === nationalLevelId;
        
      case 'REGION':
        return content.targetRegionId === regionId;
        
      case 'LOCALITY':
        return content.targetLocalityId === localityId;
        
      case 'ADMIN_UNIT':
        return content.targetAdminUnitId === adminUnitId;
        
      case 'DISTRICT':
        return content.targetDistrictId === districtId;
        
      default:
        return (content as any).createdById === adminUser.id;
    }
  }

  /**
   * Get users by national level
   */
  static async getUsersByNationalLevel(nationalLevelId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { nationalLevelId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get users by region
   */
  static async getUsersByRegion(regionId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { regionId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
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
   */
  static async getUsersByLocality(localityId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { localityId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
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
   */
  static async getUsersByAdminUnit(adminUnitId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { adminUnitId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
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
   */
  static async getUsersByDistrict(districtId: string): Promise<any[]> {
    return prisma.user.findMany({
      where: { districtId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Create user for national level
   */
  static async createUserForNationalLevel(nationalLevelId: string, userData: UserData): Promise<any> {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return prisma.user.create({
      data: {
        email: email || undefined,
        mobileNumber,
        password: hashedPassword,
        adminLevel: (adminLevel as any) || 'USER',
        role: role || 'USER',
        nationalLevelId,
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for region
   */
  static async createUserForRegion(regionId: string, userData: UserData): Promise<any> {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Split name into first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    return prisma.user.create({
      data: {
        email: email || undefined,
        mobileNumber,
        password: hashedPassword,
        adminLevel: (adminLevel as any) || 'USER',
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for locality
   */
  static async createUserForLocality(localityId: string, userData: UserData): Promise<any> {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
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
    
    if (!locality) {
      throw new Error('Locality not found');
    }
    
    return prisma.user.create({
      data: {
        email: email || undefined,
        mobileNumber,
        password: hashedPassword,
        adminLevel: (adminLevel as any) || 'USER',
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for admin unit
   */
  static async createUserForAdminUnit(adminUnitId: string, userData: UserData): Promise<any> {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
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
    
    if (!adminUnit) {
      throw new Error('Admin unit not found');
    }
    
    return prisma.user.create({
      data: {
        email: email || undefined,
        mobileNumber,
        password: hashedPassword,
        adminLevel: (adminLevel as any) || 'USER',
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Create user for district
   */
  static async createUserForDistrict(districtId: string, userData: UserData): Promise<any> {
    const { name, email, mobileNumber, password, adminLevel, role } = userData;
    
    // Hash password
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
    
    if (!district) {
      throw new Error('District not found');
    }
    
    return prisma.user.create({
      data: {
        email: email || undefined,
        mobileNumber,
        password: hashedPassword,
        adminLevel: (adminLevel as any) || 'USER',
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }

  /**
   * Update user status
   */
  static async updateUserStatus(userId: string, active: boolean): Promise<any> {
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
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  }
}

export default HierarchicalUserService;

