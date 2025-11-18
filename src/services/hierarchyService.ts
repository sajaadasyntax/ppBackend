import prisma from '../utils/prisma';

/**
 * Hierarchy Service - Manages content filtering based on administrative hierarchy
 * 
 * The hierarchy works as follows:
 * - Content targeted at a higher level (Region) is visible to all users in that region and its children
 * - Content targeted at a lower level (District) is only visible to users in that specific district
 * - Users see content from their level and all parent levels
 */

class HierarchyService {
  /**
   * Build WHERE clause for content filtering based on user's hierarchy
   * @param user - User object with hierarchy information
   * @returns Prisma WHERE clause for content filtering
   */
  static buildContentFilter(user: any): any {
    const filter: any = {
      OR: []
    };

    // Since targetRegionId is now required, users see content based on their hierarchy level
    // Users can see content from their level and all parent levels

    // If user has district assignment, include content targeted to their district
    if (user.districtId) {
      filter.OR.push({
        AND: [
          { targetRegionId: user.regionId },
          { targetLocalityId: user.localityId },
          { targetAdminUnitId: user.adminUnitId },
          { targetDistrictId: user.districtId }
        ]
      });
    }

    // If user has admin unit assignment, include content targeted to their admin unit
    if (user.adminUnitId) {
      filter.OR.push({
        AND: [
          { targetRegionId: user.regionId },
          { targetLocalityId: user.localityId },
          { targetAdminUnitId: user.adminUnitId },
          { targetDistrictId: null } // Admin unit level content
        ]
      });
    }

    // If user has locality assignment, include content targeted to their locality
    if (user.localityId) {
      filter.OR.push({
        AND: [
          { targetRegionId: user.regionId },
          { targetLocalityId: user.localityId },
          { targetAdminUnitId: null }, // Locality level content
          { targetDistrictId: null }
        ]
      });
    }

    // If user has region assignment, include content targeted to their region
    if (user.regionId) {
      filter.OR.push({
        AND: [
          { targetRegionId: user.regionId },
          { targetLocalityId: null }, // Region level content
          { targetAdminUnitId: null },
          { targetDistrictId: null }
        ]
      });
    }

    // If user has no hierarchy, they see no content (empty filter will return nothing)
    if (!user.regionId) {
      filter.OR.push({
        id: 'never-matches' // This will never match any real content
      });
    }

    return filter;
  }

  /**
   * Get user's full hierarchy information
   * @param userId - User ID
   * @returns User with full hierarchy data
   */
  static async getUserWithHierarchy(userId: string): Promise<any> {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        region: true,
        locality: {
          include: { region: true }
        },
        adminUnit: {
          include: {
            locality: { include: { region: true } }
          }
        },
        district: {
          include: {
            adminUnit: {
              include: {
                locality: { include: { region: true } }
              }
            }
          }
        }
      }
    });
  }

  /**
   * Get bulletins filtered by user's hierarchy
   * @param userId - User ID
   * @returns Filtered bulletins
   */
  static async getUserBulletins(userId: string): Promise<any[]> {
    const user = await this.getUserWithHierarchy(userId);
    if (!user) return [];

    const filter = this.buildContentFilter(user);
    
    return await prisma.bulletin.findMany({
      where: {
        published: true,
        ...filter
      },
      orderBy: { date: 'desc' }
    });
  }

  /**
   * Get surveys filtered by user's hierarchy
   * @param userId - User ID
   * @returns Filtered surveys
   */
  static async getUserSurveys(userId: string): Promise<any[]> {
    const user = await this.getUserWithHierarchy(userId);
    if (!user) return [];

    const filter = this.buildContentFilter(user);
    
    return await prisma.survey.findMany({
      where: {
        published: true,
        dueDate: { gte: new Date() }, // Only active surveys
        ...filter
      },
      orderBy: { dueDate: 'asc' }
    });
  }

  /**
   * Get subscription plans filtered by user's hierarchy
   * @param userId - User ID
   * @returns Filtered subscription plans
   */
  static async getUserSubscriptionPlans(userId: string): Promise<any[]> {
    const user = await this.getUserWithHierarchy(userId);
    if (!user) return [];

    const filter = this.buildContentFilter(user);
    
    return await prisma.subscriptionPlan.findMany({
      where: {
        active: true,
        isApproved: true,
        ...filter
      },
      include: {
        creator: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        },
        approver: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            profile: true,
            adminLevel: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get users who should see a subscription plan based on its target hierarchy
   * @param plan - Subscription plan with target hierarchy
   * @returns Users who should see this plan
   */
  static async getUsersForSubscriptionPlan(plan: any): Promise<any[]> {
    const whereClause: any = {};

    // Build WHERE clause based on plan's target hierarchy
    if (plan.targetDistrictId) {
      // District-level plan: only users in this specific district
      whereClause.districtId = plan.targetDistrictId;
    } else if (plan.targetAdminUnitId) {
      // Admin unit-level plan: users in this admin unit and its districts
      whereClause.adminUnitId = plan.targetAdminUnitId;
    } else if (plan.targetLocalityId) {
      // Locality-level plan: users in this locality and its admin units/districts
      whereClause.localityId = plan.targetLocalityId;
    } else if (plan.targetRegionId) {
      // Region-level plan: users in this region and all its sub-levels
      whereClause.regionId = plan.targetRegionId;
    } else {
      // Global plan: all users
      return await prisma.user.findMany({
        where: { role: 'USER' }, // Only regular users, not admins
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: true,
          regionId: true,
          localityId: true,
          adminUnitId: true,
          districtId: true
        }
      });
    }

    return await prisma.user.findMany({
      where: {
        ...whereClause,
        role: 'USER' // Only regular users, not admins
      },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        profile: true,
        regionId: true,
        localityId: true,
        adminUnitId: true,
        districtId: true
      }
    });
  }

  /**
   * Get voting items filtered by user's hierarchy
   * @param userId - User ID
   * @returns Filtered voting items
   */
  static async getUserVotingItems(userId: string): Promise<any[]> {
    const user = await this.getUserWithHierarchy(userId);
    if (!user) return [];

    const filter = this.buildContentFilter(user);
    const now = new Date();
    
    return await prisma.votingItem.findMany({
      where: {
        published: true,
        startDate: { lte: now },
        endDate: { gte: now }, // Only active voting
        ...filter
      },
      orderBy: { endDate: 'asc' }
    });
  }

  /**
   * Get reports filtered by admin's hierarchy (for viewing reports)
   * @param adminId - Admin user ID
   * @returns Filtered reports that this admin can see
   */
  static async getAdminReports(adminId: string): Promise<any[]> {
    const admin = await this.getUserWithHierarchy(adminId);
    if (!admin) return [];

    // Admins can see reports from their level and all child levels
    const filter: any = { OR: [] };

    // If admin manages a region, they can see all reports in that region
    if ((admin as any).managedRegions && (admin as any).managedRegions.length > 0) {
      for (const region of (admin as any).managedRegions) {
        filter.OR.push({ targetRegionId: region.id });
        
        // Also include reports from all localities in this region
        const localities = await prisma.locality.findMany({
          where: { regionId: region.id }
        });
        for (const locality of localities) {
          filter.OR.push({ targetLocalityId: locality.id });
        }
        
        // Also include reports from all admin units in this region
        const adminUnits = await prisma.adminUnit.findMany({
          where: { 
            locality: { regionId: region.id }
          }
        });
        for (const adminUnit of adminUnits) {
          filter.OR.push({ targetAdminUnitId: adminUnit.id });
        }
        
        // Also include reports from all districts in this region
        const districts = await prisma.district.findMany({
          where: { 
            adminUnit: { 
              locality: { regionId: region.id }
            }
          }
        });
        for (const district of districts) {
          filter.OR.push({ targetDistrictId: district.id });
        }
      }
    }

    // Similar logic for other admin levels...
    if ((admin as any).managedLocalities && (admin as any).managedLocalities.length > 0) {
      for (const locality of (admin as any).managedLocalities) {
        filter.OR.push({ targetLocalityId: locality.id });
        
        // Include reports from child admin units and districts
        const adminUnits = await prisma.adminUnit.findMany({
          where: { localityId: locality.id }
        });
        for (const adminUnit of adminUnits) {
          filter.OR.push({ targetAdminUnitId: adminUnit.id });
          
          const districts = await prisma.district.findMany({
            where: { adminUnitId: adminUnit.id }
          });
          for (const district of districts) {
            filter.OR.push({ targetDistrictId: district.id });
          }
        }
      }
    }

    // Continue for admin units and districts...
    if ((admin as any).managedAdminUnits && (admin as any).managedAdminUnits.length > 0) {
      for (const adminUnit of (admin as any).managedAdminUnits) {
        filter.OR.push({ targetAdminUnitId: adminUnit.id });
        
        const districts = await prisma.district.findMany({
          where: { adminUnitId: adminUnit.id }
        });
        for (const district of districts) {
          filter.OR.push({ targetDistrictId: district.id });
        }
      }
    }

    if ((admin as any).managedDistricts && (admin as any).managedDistricts.length > 0) {
      for (const district of (admin as any).managedDistricts) {
        filter.OR.push({ targetDistrictId: district.id });
      }
    }

    if (filter.OR.length === 0) {
      return []; // Admin doesn't manage any areas
    }

    return await prisma.report.findMany({
      where: filter,
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Determine the appropriate hierarchy level for content based on user's position
   * @param user - User object with hierarchy information
   * @returns Hierarchy targeting for content creation
   */
  static determineContentHierarchy(user: any): any {
    // Content is targeted to the user's most specific level
    if (user.districtId) {
      return { targetDistrictId: user.districtId };
    } else if (user.adminUnitId) {
      return { targetAdminUnitId: user.adminUnitId };
    } else if (user.localityId) {
      return { targetLocalityId: user.localityId };
    } else if (user.regionId) {
      return { targetRegionId: user.regionId };
    }
    
    // If user has no hierarchy assignment, content is global
    return {};
  }

  /**
   * Get hierarchy options for content creation based on user's admin level
   * @param user - User object with admin information
   * @returns Available hierarchy options for targeting
   */
  static async getContentTargetingOptions(user: any): Promise<any> {
    const options: any = {
      regions: [],
      localities: [],
      adminUnits: [],
      districts: []
    };

    // Super admins can target any level
    if (user.adminLevel === 'ADMIN' || user.adminLevel === 'GENERAL_SECRETARIAT') {
      options.regions = await prisma.region.findMany({
        where: { active: true },
        orderBy: { name: 'asc' }
      });
      return options;
    }

    // Region admins can target their region and its children
    if ((user as any).managedRegions && (user as any).managedRegions.length > 0) {
      options.regions = (user as any).managedRegions;
      
      for (const region of (user as any).managedRegions) {
        const localities = await prisma.locality.findMany({
          where: { regionId: region.id, active: true },
          orderBy: { name: 'asc' }
        });
        options.localities.push(...localities);
        
        for (const locality of localities) {
          const adminUnits = await prisma.adminUnit.findMany({
            where: { localityId: locality.id, active: true },
            orderBy: { name: 'asc' }
          });
          options.adminUnits.push(...adminUnits);
          
          for (const adminUnit of adminUnits) {
            const districts = await prisma.district.findMany({
              where: { adminUnitId: adminUnit.id, active: true },
              orderBy: { name: 'asc' }
            });
            options.districts.push(...districts);
          }
        }
      }
    }

    // Similar logic for other admin levels...
    // (Continuing pattern for locality, admin unit, and district admins)

    return options;
  }
}

export default HierarchyService;

