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

  // If user has districtId but missing parent hierarchy IDs, derive them from the district
  let resolvedHierarchy = { ...userWithHierarchy };
  if (userWithHierarchy.districtId && (!userWithHierarchy.adminUnitId || !userWithHierarchy.localityId || !userWithHierarchy.regionId || !userWithHierarchy.nationalLevelId)) {
    try {
      const district = await prisma.district.findUnique({
        where: { id: userWithHierarchy.districtId },
        include: {
          adminUnit: {
            include: {
              locality: {
                include: {
                  region: {
                    select: { id: true, nationalLevelId: true }
                  }
                }
              }
            }
          }
        }
      });
      
      if (district) {
        // Derive missing parent IDs from district relationships
        resolvedHierarchy.adminUnitId = resolvedHierarchy.adminUnitId || district.adminUnitId;
        const adminUnit = district.adminUnit;
        if (adminUnit) {
          const locality = adminUnit.locality;
          if (locality) {
            resolvedHierarchy.localityId = resolvedHierarchy.localityId || adminUnit.localityId;
            const region = locality.region;
            if (region) {
              resolvedHierarchy.regionId = resolvedHierarchy.regionId || locality.regionId;
              resolvedHierarchy.nationalLevelId = resolvedHierarchy.nationalLevelId || region.nationalLevelId;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deriving hierarchy from district:', error);
      // Continue with original hierarchy values if lookup fails
    }
  }

  // If user has sectorDistrictId but missing parent sector hierarchy IDs, derive them
  if (userWithHierarchy.sectorDistrictId && (!userWithHierarchy.sectorAdminUnitId || !userWithHierarchy.sectorLocalityId || !userWithHierarchy.sectorRegionId || !userWithHierarchy.sectorNationalLevelId)) {
    try {
      const sectorDistrict = await prisma.sectorDistrict.findUnique({
        where: { id: userWithHierarchy.sectorDistrictId },
        include: {
          sectorAdminUnit: {
            include: {
              sectorLocality: {
                include: {
                  sectorRegion: {
                    select: { id: true, sectorNationalLevelId: true }
                  }
                }
              }
            }
          }
        }
      });
      
      if (sectorDistrict) {
        // Derive missing parent IDs from sector district relationships
        resolvedHierarchy.sectorAdminUnitId = resolvedHierarchy.sectorAdminUnitId || sectorDistrict.sectorAdminUnitId;
        const sectorAdminUnit = sectorDistrict.sectorAdminUnit;
        if (sectorAdminUnit) {
          const sectorLocality = sectorAdminUnit.sectorLocality;
          if (sectorLocality) {
            resolvedHierarchy.sectorLocalityId = resolvedHierarchy.sectorLocalityId || sectorAdminUnit.sectorLocalityId;
            const sectorRegion = sectorLocality.sectorRegion;
            if (sectorRegion) {
              resolvedHierarchy.sectorRegionId = resolvedHierarchy.sectorRegionId || sectorLocality.sectorRegionId;
              resolvedHierarchy.sectorNationalLevelId = resolvedHierarchy.sectorNationalLevelId || sectorRegion.sectorNationalLevelId;
            }
          }
        }
      }
    } catch (error) {
      console.error('Error deriving sector hierarchy from sector district:', error);
      // Continue with original hierarchy values if lookup fails
    }
  }

  const whereClause: any = { published: true };
  const orConditions: any[] = [];

  // Build filter based on active hierarchy with CASCADING support
  switch (resolvedHierarchy.activeHierarchy) {
    case 'ORIGINAL':
      // Cascading filter for original geographic hierarchy
      // User sees content targeted at their level AND all parent levels
      
      // 1. Content specifically for user's district (most specific)
      if (resolvedHierarchy.districtId) {
        orConditions.push({ targetDistrictId: resolvedHierarchy.districtId });
      }
      
      // 2. Content for user's admin unit (visible to all districts in this admin unit)
      if (resolvedHierarchy.adminUnitId) {
        orConditions.push({ 
          targetAdminUnitId: resolvedHierarchy.adminUnitId,
          targetDistrictId: null  // Admin unit level content (not district-specific)
        });
      }
      
      // 3. Content for user's locality (visible to all admin units/districts in this locality)
      if (resolvedHierarchy.localityId) {
        orConditions.push({ 
          targetLocalityId: resolvedHierarchy.localityId,
          targetAdminUnitId: null,
          targetDistrictId: null
        });
      }
      
      // 4. Content for user's region (visible to all localities/admin units/districts in this region)
      if (resolvedHierarchy.regionId) {
        orConditions.push({ 
          targetRegionId: resolvedHierarchy.regionId,
          targetLocalityId: null,
          targetAdminUnitId: null,
          targetDistrictId: null
        });
      }
      
      // 5. Content for user's national level (visible to all regions and below)
      if (resolvedHierarchy.nationalLevelId) {
        orConditions.push({ 
          targetNationalLevelId: resolvedHierarchy.nationalLevelId,
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
      if (resolvedHierarchy.expatriateRegionId) {
        orConditions.push({ targetExpatriateRegionId: resolvedHierarchy.expatriateRegionId });
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
      if (resolvedHierarchy.sectorDistrictId) {
        orConditions.push({ targetSectorDistrictId: resolvedHierarchy.sectorDistrictId });
      }
      
      // 2. Content for user's sector admin unit
      if (resolvedHierarchy.sectorAdminUnitId) {
        orConditions.push({ 
          targetSectorAdminUnitId: resolvedHierarchy.sectorAdminUnitId,
          targetSectorDistrictId: null
        });
      }
      
      // 3. Content for user's sector locality
      if (resolvedHierarchy.sectorLocalityId) {
        orConditions.push({ 
          targetSectorLocalityId: resolvedHierarchy.sectorLocalityId,
          targetSectorAdminUnitId: null,
          targetSectorDistrictId: null
        });
      }
      
      // 4. Content for user's sector region
      if (resolvedHierarchy.sectorRegionId) {
        orConditions.push({ 
          targetSectorRegionId: resolvedHierarchy.sectorRegionId,
          targetSectorLocalityId: null,
          targetSectorAdminUnitId: null,
          targetSectorDistrictId: null
        });
      }
      
      // 5. Content for user's sector national level
      if (resolvedHierarchy.sectorNationalLevelId) {
        orConditions.push({ 
          targetSectorNationalLevelId: resolvedHierarchy.sectorNationalLevelId,
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
      if (resolvedHierarchy.districtId) {
        orConditions.push({ targetDistrictId: resolvedHierarchy.districtId });
      }
      if (resolvedHierarchy.adminUnitId) {
        orConditions.push({ targetAdminUnitId: resolvedHierarchy.adminUnitId, targetDistrictId: null });
      }
      if (resolvedHierarchy.localityId) {
        orConditions.push({ targetLocalityId: resolvedHierarchy.localityId, targetAdminUnitId: null, targetDistrictId: null });
      }
      if (resolvedHierarchy.regionId) {
        orConditions.push({ targetRegionId: resolvedHierarchy.regionId, targetLocalityId: null, targetAdminUnitId: null, targetDistrictId: null });
      }
      if (resolvedHierarchy.nationalLevelId) {
        orConditions.push({ targetNationalLevelId: resolvedHierarchy.nationalLevelId, targetRegionId: null, targetLocalityId: null, targetAdminUnitId: null, targetDistrictId: null });
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
