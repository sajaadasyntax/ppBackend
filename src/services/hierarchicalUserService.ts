import prisma from '../utils/prisma';
import * as bcrypt from 'bcrypt';
import { UserPayload } from '../types';
import { Prisma } from '@prisma/client';
import { notify } from './notificationService';
import { markUserSuspended, markUserActive } from '../middlewares/auth';

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
  /**
   * Build a WHERE clause that finds all users within the admin's jurisdiction,
   * traversing down through child nodes.
   *
   * SECURITY FIX: Also respects `activeHierarchy` to prevent cross-hierarchy
   * leakage (geographical admin cannot see expatriate users).
   */
  private static async buildScopedWhere(adminUser: AdminUser): Promise<Prisma.UserWhereInput> {
    const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;

    // Top-level admins see everything
    if (adminLevel === 'GENERAL_SECRETARIAT' || adminLevel === 'ADMIN') {
      return {};
    }

    // ── Expatriate admins — scope to expatriate hierarchy ───────────
    if (adminLevel?.startsWith('EXPATRIATE')) {
      const expatriateRegionId = (adminUser as any).expatriateRegionId;
      if (expatriateRegionId) {
        return { activeHierarchy: 'EXPATRIATE', expatriateRegionId };
      }
      return { id: adminUser.id }; // Fallback: can only see self
    }

    // ── Geographical admins — scope to ORIGINAL hierarchy ───────────
    // and traverse child nodes so REGION admin counts users at ALL sub-levels.
    const baseFilter: Prisma.UserWhereInput = { activeHierarchy: 'ORIGINAL' };

    switch (adminLevel) {
      case 'NATIONAL_LEVEL':
        return { ...baseFilter, nationalLevelId: adminUser.nationalLevelId || undefined };

      case 'REGION': {
        if (!regionId) return { id: adminUser.id };
        // Traverse: region → localities → adminUnits → districts
        const localities = await prisma.locality.findMany({ where: { regionId }, select: { id: true } });
        const localityIds = localities.map(l => l.id);
        const adminUnits = localityIds.length
          ? await prisma.adminUnit.findMany({ where: { localityId: { in: localityIds } }, select: { id: true } })
          : [];
        const auIds = adminUnits.map(au => au.id);
        const districts = auIds.length
          ? await prisma.district.findMany({ where: { adminUnitId: { in: auIds } }, select: { id: true } })
          : [];
        const dIds = districts.map(d => d.id);

        return {
          ...baseFilter,
          OR: [
            { regionId },
            ...(localityIds.length ? [{ localityId: { in: localityIds } }] : []),
            ...(auIds.length       ? [{ adminUnitId: { in: auIds } }]       : []),
            ...(dIds.length        ? [{ districtId: { in: dIds } }]         : []),
          ],
        };
      }

      case 'LOCALITY': {
        if (!localityId) return { id: adminUser.id };
        const adminUnits = await prisma.adminUnit.findMany({ where: { localityId }, select: { id: true } });
        const auIds = adminUnits.map(au => au.id);
        const districts = auIds.length
          ? await prisma.district.findMany({ where: { adminUnitId: { in: auIds } }, select: { id: true } })
          : [];
        const dIds = districts.map(d => d.id);

        return {
          ...baseFilter,
          OR: [
            { localityId },
            ...(auIds.length ? [{ adminUnitId: { in: auIds } }] : []),
            ...(dIds.length  ? [{ districtId: { in: dIds } }]   : []),
          ],
        };
      }

      case 'ADMIN_UNIT': {
        if (!adminUnitId) return { id: adminUser.id };
        const districts = await prisma.district.findMany({ where: { adminUnitId }, select: { id: true } });
        const dIds = districts.map(d => d.id);

        return {
          ...baseFilter,
          OR: [
            { adminUnitId },
            ...(dIds.length ? [{ districtId: { in: dIds } }] : []),
          ],
        };
      }

      case 'DISTRICT':
        return { ...baseFilter, districtId: districtId || undefined };

      default:
        return { id: adminUser.id };
    }
  }

  static async getManageableUsers(adminUser: AdminUser): Promise<any[]> {
    const whereClause = await HierarchicalUserService.buildScopedWhere(adminUser);

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
    const newStatus = active ? 'active' : 'disabled';

    const result = await prisma.user.update({
      where: { id: userId },
      data: { 
        profile: {
          update: {
            status: newStatus,
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

    // Notify the user about status change
    await notify.statusChanged(userId, newStatus);

    if (!active) {
      // CRITICAL: Immediately invalidate the user's session
      // 1. Invalidate the auth middleware cache so the next request is blocked
      markUserSuspended(userId);
      // 2. Delete all refresh tokens so the user can't get new access tokens
      await prisma.refreshToken.deleteMany({ where: { userId } });
      // 3. Send force-logout via WebSocket so the mobile app logs out immediately
      await notify.forceLogout(userId);
    } else {
      markUserActive(userId);
    }

    return result;
  }
}

export default HierarchicalUserService;

