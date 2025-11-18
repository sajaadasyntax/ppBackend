import prisma from '../utils/prisma';

/**
 * Build where clause for filtering content based on user's active hierarchy
 * @param user - User object with hierarchy information
 * @returns Prisma where clause
 */
export async function buildContentWhereClause(user: any): Promise<any> {
  if (!user) {
    return { published: true };
  }

  // Get user's complete hierarchy information including active hierarchy
  const userWithHierarchy = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      activeHierarchy: true,
      adminLevel: true,
      // Original hierarchy
      nationalLevelId: true,
      regionId: true,
      localityId: true,
      adminUnitId: true,
      districtId: true,
      // Expatriate hierarchy
      expatriateRegionId: true,
      // Sector hierarchy
      sectorNationalLevelId: true,
      sectorRegionId: true,
      sectorLocalityId: true,
      sectorAdminUnitId: true,
      sectorDistrictId: true,
    }
  });

  if (!userWithHierarchy) {
    return { published: true };
  }

  // Admin and General Secretariat can see everything
  if (userWithHierarchy.adminLevel === 'ADMIN' || userWithHierarchy.adminLevel === 'GENERAL_SECRETARIAT') {
    return { published: true };
  }

  const whereClause: any = { published: true };
  const orConditions: any[] = [];

  // Build filter based on active hierarchy
  switch (userWithHierarchy.activeHierarchy) {
    case 'ORIGINAL':
      // Filter by original geographic hierarchy
      if (userWithHierarchy.districtId) {
        orConditions.push({ targetDistrictId: userWithHierarchy.districtId });
      }
      if (userWithHierarchy.adminUnitId) {
        orConditions.push({ targetAdminUnitId: userWithHierarchy.adminUnitId, targetDistrictId: null });
      }
      if (userWithHierarchy.localityId) {
        orConditions.push({ targetLocalityId: userWithHierarchy.localityId, targetAdminUnitId: null, targetDistrictId: null });
      }
      if (userWithHierarchy.regionId) {
        orConditions.push({ targetRegionId: userWithHierarchy.regionId, targetLocalityId: null, targetAdminUnitId: null, targetDistrictId: null });
      }
      if (userWithHierarchy.nationalLevelId) {
        orConditions.push({ targetNationalLevelId: userWithHierarchy.nationalLevelId, targetRegionId: null, targetLocalityId: null, targetAdminUnitId: null, targetDistrictId: null });
      }
      // Also show content with no specific targeting (global content)
      orConditions.push({ 
        targetNationalLevelId: null, 
        targetRegionId: null, 
        targetLocalityId: null, 
        targetAdminUnitId: null, 
        targetDistrictId: null,
        targetExpatriateRegionId: null,
        targetSectorNationalLevelId: null,
        targetSectorRegionId: null,
        targetSectorLocalityId: null,
        targetSectorAdminUnitId: null,
        targetSectorDistrictId: null
      });
      break;

    case 'EXPATRIATE':
      // Filter by expatriate hierarchy
      if (userWithHierarchy.expatriateRegionId) {
        orConditions.push({ targetExpatriateRegionId: userWithHierarchy.expatriateRegionId });
      }
      // Also show content with no specific targeting (global content)
      orConditions.push({ 
        targetNationalLevelId: null,
        targetRegionId: null, 
        targetLocalityId: null, 
        targetAdminUnitId: null, 
        targetDistrictId: null,
        targetExpatriateRegionId: null,
        targetSectorNationalLevelId: null,
        targetSectorRegionId: null,
        targetSectorLocalityId: null,
        targetSectorAdminUnitId: null,
        targetSectorDistrictId: null
      });
      break;

    case 'SECTOR':
      // Filter by sector hierarchy
      if (userWithHierarchy.sectorDistrictId) {
        orConditions.push({ targetSectorDistrictId: userWithHierarchy.sectorDistrictId });
      }
      if (userWithHierarchy.sectorAdminUnitId) {
        orConditions.push({ targetSectorAdminUnitId: userWithHierarchy.sectorAdminUnitId, targetSectorDistrictId: null });
      }
      if (userWithHierarchy.sectorLocalityId) {
        orConditions.push({ targetSectorLocalityId: userWithHierarchy.sectorLocalityId, targetSectorAdminUnitId: null, targetSectorDistrictId: null });
      }
      if (userWithHierarchy.sectorRegionId) {
        orConditions.push({ targetSectorRegionId: userWithHierarchy.sectorRegionId, targetSectorLocalityId: null, targetSectorAdminUnitId: null, targetSectorDistrictId: null });
      }
      if (userWithHierarchy.sectorNationalLevelId) {
        orConditions.push({ targetSectorNationalLevelId: userWithHierarchy.sectorNationalLevelId, targetSectorRegionId: null, targetSectorLocalityId: null, targetSectorAdminUnitId: null, targetSectorDistrictId: null });
      }
      // Also show content with no specific targeting (global content)
      orConditions.push({ 
        targetNationalLevelId: null,
        targetRegionId: null, 
        targetLocalityId: null, 
        targetAdminUnitId: null, 
        targetDistrictId: null,
        targetExpatriateRegionId: null,
        targetSectorNationalLevelId: null,
        targetSectorRegionId: null,
        targetSectorLocalityId: null,
        targetSectorAdminUnitId: null,
        targetSectorDistrictId: null
      });
      break;

    default:
      // If no active hierarchy or unknown, fall back to original hierarchy
      if (userWithHierarchy.regionId) {
        orConditions.push({ targetRegionId: userWithHierarchy.regionId });
      }
  }

  // If we have OR conditions, add them to the where clause
  if (orConditions.length > 0) {
    whereClause.OR = orConditions;
  }

  return whereClause;
}

/**
 * Build simplified where clause for bulletins (legacy support)
 * @param adminUser - User object
 * @returns Prisma where clause
 */
export async function buildBulletinWhereClause(adminUser: any): Promise<any> {
  return buildContentWhereClause(adminUser);
}

export default {
  buildContentWhereClause,
  buildBulletinWhereClause
};

