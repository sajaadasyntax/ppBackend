import prisma from '../utils/prisma';

/**
 * Build where clause for filtering content based on user's active hierarchy
 * Content cascades DOWN the hierarchy:
 * - User in District sees: District-specific + AdminUnit-wide + Locality-wide + Region-wide + NationalLevel-wide + Global
 * - User in AdminUnit sees: AdminUnit-specific + Locality-wide + Region-wide + NationalLevel-wide + Global
 * - User in Locality sees: Locality-specific + Region-wide + NationalLevel-wide + Global
 * - User in Region sees: Region-specific + NationalLevel-wide + Global
 * - User in NationalLevel sees: NationalLevel-specific + Global
 * 
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

  // Build filter based on active hierarchy with CASCADING support
  switch (userWithHierarchy.activeHierarchy) {
    case 'ORIGINAL':
      // Cascading filter for original geographic hierarchy
      // User sees content targeted at their level AND all parent levels
      
      // 1. Content specifically for user's district (most specific)
      if (userWithHierarchy.districtId) {
        orConditions.push({ targetDistrictId: userWithHierarchy.districtId });
      }
      
      // 2. Content for user's admin unit (visible to all districts in this admin unit)
      if (userWithHierarchy.adminUnitId) {
        orConditions.push({ 
          targetAdminUnitId: userWithHierarchy.adminUnitId,
          targetDistrictId: null  // Admin unit level content (not district-specific)
        });
      }
      
      // 3. Content for user's locality (visible to all admin units/districts in this locality)
      if (userWithHierarchy.localityId) {
        orConditions.push({ 
          targetLocalityId: userWithHierarchy.localityId,
          targetAdminUnitId: null,
          targetDistrictId: null
        });
      }
      
      // 4. Content for user's region (visible to all localities/admin units/districts in this region)
      if (userWithHierarchy.regionId) {
        orConditions.push({ 
          targetRegionId: userWithHierarchy.regionId,
          targetLocalityId: null,
          targetAdminUnitId: null,
          targetDistrictId: null
        });
      }
      
      // 5. Content for user's national level (visible to all regions and below)
      if (userWithHierarchy.nationalLevelId) {
        orConditions.push({ 
          targetNationalLevelId: userWithHierarchy.nationalLevelId,
          targetRegionId: null,
          targetLocalityId: null,
          targetAdminUnitId: null,
          targetDistrictId: null
        });
      }
      
      // 6. Global content (no specific targeting - visible to everyone)
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
      // Expatriate users see content targeted at their expatriate region + global content
      if (userWithHierarchy.expatriateRegionId) {
        orConditions.push({ targetExpatriateRegionId: userWithHierarchy.expatriateRegionId });
      }
      
      // Global content (no specific targeting)
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
      // Cascading filter for sector hierarchy
      // User sees content targeted at their level AND all parent levels
      
      // 1. Content specifically for user's sector district (most specific)
      if (userWithHierarchy.sectorDistrictId) {
        orConditions.push({ targetSectorDistrictId: userWithHierarchy.sectorDistrictId });
      }
      
      // 2. Content for user's sector admin unit
      if (userWithHierarchy.sectorAdminUnitId) {
        orConditions.push({ 
          targetSectorAdminUnitId: userWithHierarchy.sectorAdminUnitId,
          targetSectorDistrictId: null
        });
      }
      
      // 3. Content for user's sector locality
      if (userWithHierarchy.sectorLocalityId) {
        orConditions.push({ 
          targetSectorLocalityId: userWithHierarchy.sectorLocalityId,
          targetSectorAdminUnitId: null,
          targetSectorDistrictId: null
        });
      }
      
      // 4. Content for user's sector region
      if (userWithHierarchy.sectorRegionId) {
        orConditions.push({ 
          targetSectorRegionId: userWithHierarchy.sectorRegionId,
          targetSectorLocalityId: null,
          targetSectorAdminUnitId: null,
          targetSectorDistrictId: null
        });
      }
      
      // 5. Content for user's sector national level
      if (userWithHierarchy.sectorNationalLevelId) {
        orConditions.push({ 
          targetSectorNationalLevelId: userWithHierarchy.sectorNationalLevelId,
          targetSectorRegionId: null,
          targetSectorLocalityId: null,
          targetSectorAdminUnitId: null,
          targetSectorDistrictId: null
        });
      }
      
      // 6. Global content (no specific targeting)
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
      // If no active hierarchy or unknown, fall back to ORIGINAL hierarchy with cascading
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
      // Global content
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
  }

  // If we have OR conditions, add them to the where clause
  if (orConditions.length > 0) {
    whereClause.OR = orConditions;
  }

  return whereClause;
}

/**
 * Build where clause for bulletins - uses the same cascading logic
 * @param adminUser - User object
 * @returns Prisma where clause
 */
export async function buildBulletinWhereClause(adminUser: any): Promise<any> {
  return buildContentWhereClause(adminUser);
}

/**
 * Build a more permissive filter that shows content targeted at user's hierarchy chain
 * This is useful for admin views where you want to see all relevant content
 * @param user - User object
 * @returns Prisma where clause
 */
export async function buildAdminContentWhereClause(user: any): Promise<any> {
  if (!user) {
    return { published: true };
  }

  const userWithHierarchy = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      activeHierarchy: true,
      adminLevel: true,
      nationalLevelId: true,
      regionId: true,
      localityId: true,
      adminUnitId: true,
      districtId: true,
      expatriateRegionId: true,
      sectorNationalLevelId: true,
      sectorRegionId: true,
      sectorLocalityId: true,
      sectorAdminUnitId: true,
      sectorDistrictId: true,
    }
  });

  if (!userWithHierarchy) {
    return {};
  }

  // Admin and General Secretariat can see and manage everything
  if (userWithHierarchy.adminLevel === 'ADMIN' || userWithHierarchy.adminLevel === 'GENERAL_SECRETARIAT') {
    return {};
  }

  const orConditions: any[] = [];

  // For admins at various levels, show content they can manage (their level and below)
  switch (userWithHierarchy.adminLevel) {
    case 'NATIONAL_LEVEL':
      if (userWithHierarchy.nationalLevelId) {
        orConditions.push({ targetNationalLevelId: userWithHierarchy.nationalLevelId });
        // Also show content for child regions
        const regions = await prisma.region.findMany({
          where: { nationalLevelId: userWithHierarchy.nationalLevelId },
          select: { id: true }
        });
        if (regions.length > 0) {
          orConditions.push({ targetRegionId: { in: regions.map(r => r.id) } });
        }
      }
      break;

    case 'REGION':
      if (userWithHierarchy.regionId) {
        orConditions.push({ targetRegionId: userWithHierarchy.regionId });
        // Also show content for child localities
        const localities = await prisma.locality.findMany({
          where: { regionId: userWithHierarchy.regionId },
          select: { id: true }
        });
        if (localities.length > 0) {
          orConditions.push({ targetLocalityId: { in: localities.map(l => l.id) } });
        }
      }
      break;

    case 'LOCALITY':
      if (userWithHierarchy.localityId) {
        orConditions.push({ targetLocalityId: userWithHierarchy.localityId });
        // Also show content for child admin units
        const adminUnits = await prisma.adminUnit.findMany({
          where: { localityId: userWithHierarchy.localityId },
          select: { id: true }
        });
        if (adminUnits.length > 0) {
          orConditions.push({ targetAdminUnitId: { in: adminUnits.map(a => a.id) } });
        }
      }
      break;

    case 'ADMIN_UNIT':
      if (userWithHierarchy.adminUnitId) {
        orConditions.push({ targetAdminUnitId: userWithHierarchy.adminUnitId });
        // Also show content for child districts
        const districts = await prisma.district.findMany({
          where: { adminUnitId: userWithHierarchy.adminUnitId },
          select: { id: true }
        });
        if (districts.length > 0) {
          orConditions.push({ targetDistrictId: { in: districts.map(d => d.id) } });
        }
      }
      break;

    case 'DISTRICT':
      if (userWithHierarchy.districtId) {
        orConditions.push({ targetDistrictId: userWithHierarchy.districtId });
      }
      break;

    case 'EXPATRIATE_GENERAL':
      // Expatriate general admins can see all expatriate content
      orConditions.push({ targetExpatriateRegionId: { not: null } });
      break;

    case 'EXPATRIATE_REGION':
      // Expatriate region admins can see content for their expatriate region
      if (userWithHierarchy.expatriateRegionId) {
        orConditions.push({ targetExpatriateRegionId: userWithHierarchy.expatriateRegionId });
      }
      break;

    case 'USER':
      // Regular users - no admin content filtering, use standard content filtering
      return await buildContentWhereClause(user);

    default:
      // Unknown admin level - fall back to standard content filtering
      return await buildContentWhereClause(user);
  }

  if (orConditions.length === 0) {
    return {};
  }

  return { OR: orConditions };
}

export default {
  buildContentWhereClause,
  buildBulletinWhereClause,
  buildAdminContentWhereClause
};
