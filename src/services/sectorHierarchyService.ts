import prisma from '../utils/prisma';

// ===== SECTOR NATIONAL LEVEL =====

export async function getAllSectorNationalLevels(expatriateRegionId: string | null = null, originalOnly: boolean = false, expatriateOnly: boolean = false): Promise<any[]> {
  const where: any = { active: true };
  
  // Normalize expatriateRegionId - convert empty strings to null
  const normalizedExpatriateRegionId = expatriateRegionId && expatriateRegionId.trim() !== '' ? expatriateRegionId.trim() : null;
  
  if (originalOnly) {
    // Original hierarchy sectors have no expatriateRegionId
    where.expatriateRegionId = null;
  } else if (expatriateOnly) {
    // Expatriate hierarchy sectors have expatriateRegionId set (not null)
    where.expatriateRegionId = { not: null };
  } else if (normalizedExpatriateRegionId) {
    where.expatriateRegionId = normalizedExpatriateRegionId;
  }
  // If none of the conditions match, where.expatriateRegionId is not set, so it will return all active sectors
  
  return await prisma.sectorNationalLevel.findMany({
    where,
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }],
    include: {
      expatriateRegion: true,
      _count: {
        select: { users: true, sectorRegions: true }
      }
    }
  });
}

export async function getSectorNationalLevelById(id: string): Promise<any> {
  return await prisma.sectorNationalLevel.findUnique({
    where: { id },
    include: {
      expatriateRegion: true,
      sectorRegions: true,
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      }
    }
  });
}

export async function createSectorNationalLevel(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  if (!data.expatriateRegionId) {
    throw new Error('Expatriate region ID is required');
  }

  if (!data.sectorType) {
    throw new Error('Sector type is required');
  }

  // Verify expatriate region exists
  const expatriateRegion = await prisma.expatriateRegion.findUnique({
    where: { id: data.expatriateRegionId }
  });

  if (!expatriateRegion) {
    throw new Error('Invalid expatriate region ID');
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  return await prisma.sectorNationalLevel.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      sectorType: data.sectorType,
      description: normalizedDescription,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateSectorNationalLevel(id: string, data: any): Promise<any> {
  return await prisma.sectorNationalLevel.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active
    }
  });
}

export async function deleteSectorNationalLevel(id: string): Promise<any> {
  return await prisma.sectorNationalLevel.delete({
    where: { id }
  });
}

// ===== SECTOR REGION =====

export async function getAllSectorRegions(sectorNationalLevelId: string | null = null, expatriateRegionId: string | null = null, originalOnly: boolean = false, expatriateOnly: boolean = false): Promise<any[]> {
  const where: any = { active: true };
  if (sectorNationalLevelId) {
    where.sectorNationalLevelId = sectorNationalLevelId;
  }
  if (originalOnly) {
    // Original hierarchy sectors have no expatriateRegionId
    where.expatriateRegionId = null;
  } else if (expatriateOnly) {
    // Expatriate hierarchy sectors have expatriateRegionId set (not null)
    where.expatriateRegionId = { not: null };
  } else if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
  return await prisma.sectorRegion.findMany({
    where,
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }],
    include: {
      sectorNationalLevel: true,
      expatriateRegion: true,
      _count: {
        select: { users: true, sectorLocalities: true }
      }
    }
  });
}

export async function getSectorRegionById(id: string): Promise<any> {
  return await prisma.sectorRegion.findUnique({
    where: { id },
    include: {
      sectorNationalLevel: true,
      expatriateRegion: true,
      sectorLocalities: true,
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      }
    }
  });
}

export async function createSectorRegion(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  if (!data.sectorType) {
    throw new Error('Sector type is required');
  }

  // Require either sectorNationalLevelId or expatriateRegionId
  if (!data.sectorNationalLevelId && !data.expatriateRegionId) {
    throw new Error('Sector national level ID or expatriate region ID is required');
  }

  let expatriateRegionId = data.expatriateRegionId;

  // If sectorNationalLevelId is provided, derive expatriateRegionId from it
  if (data.sectorNationalLevelId) {
    const sectorNationalLevel = await prisma.sectorNationalLevel.findUnique({
      where: { id: data.sectorNationalLevelId },
      select: { expatriateRegionId: true }
    });

    if (!sectorNationalLevel) {
      throw new Error('Invalid sector national level ID');
    }

    // Use the parent's expatriateRegionId to prevent drift
    expatriateRegionId = sectorNationalLevel.expatriateRegionId;

    // Reject if caller tries to override with conflicting value
    if (data.expatriateRegionId && data.expatriateRegionId !== expatriateRegionId) {
      throw new Error('Expatriate region ID conflicts with parent sector national level');
    }
  } else if (expatriateRegionId) {
    // Verify expatriate region exists if directly specified
    const expatriateRegion = await prisma.expatriateRegion.findUnique({
      where: { id: expatriateRegionId }
    });

    if (!expatriateRegion) {
      throw new Error('Invalid expatriate region ID');
    }
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  return await prisma.sectorRegion.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      sectorType: data.sectorType,
      description: normalizedDescription,
      sectorNationalLevelId: data.sectorNationalLevelId || null,
      expatriateRegionId: expatriateRegionId || null,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateSectorRegion(id: string, data: any): Promise<any> {
  return await prisma.sectorRegion.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorNationalLevelId: data.sectorNationalLevelId,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active
    }
  });
}

export async function deleteSectorRegion(id: string): Promise<any> {
  return await prisma.sectorRegion.delete({
    where: { id }
  });
}

// ===== SECTOR LOCALITY =====

export async function getAllSectorLocalities(sectorRegionId: string | null = null, expatriateRegionId: string | null = null, originalOnly: boolean = false, expatriateOnly: boolean = false): Promise<any[]> {
  const where: any = { active: true };
  if (sectorRegionId) {
    where.sectorRegionId = sectorRegionId;
  }
  if (originalOnly) {
    // Original hierarchy sectors have no expatriateRegionId
    where.expatriateRegionId = null;
  } else if (expatriateOnly) {
    // Expatriate hierarchy sectors have expatriateRegionId set (not null)
    where.expatriateRegionId = { not: null };
  } else if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
  return await prisma.sectorLocality.findMany({
    where,
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }],
    include: {
      sectorRegion: true,
      expatriateRegion: true,
      _count: {
        select: { users: true, sectorAdminUnits: true }
      }
    }
  });
}

export async function getSectorLocalityById(id: string): Promise<any> {
  return await prisma.sectorLocality.findUnique({
    where: { id },
    include: {
      sectorRegion: true,
      expatriateRegion: true,
      sectorAdminUnits: true,
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      }
    }
  });
}

export async function createSectorLocality(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  if (!data.sectorType) {
    throw new Error('Sector type is required');
  }

  // Require either sectorRegionId or expatriateRegionId
  if (!data.sectorRegionId && !data.expatriateRegionId) {
    throw new Error('Sector region ID or expatriate region ID is required');
  }

  let expatriateRegionId = data.expatriateRegionId;

  // If sectorRegionId is provided, derive expatriateRegionId from it
  if (data.sectorRegionId) {
    const sectorRegion = await prisma.sectorRegion.findUnique({
      where: { id: data.sectorRegionId },
      select: { expatriateRegionId: true }
    });

    if (!sectorRegion) {
      throw new Error('Invalid sector region ID');
    }

    // Use the parent's expatriateRegionId to prevent drift
    expatriateRegionId = sectorRegion.expatriateRegionId;

    // Reject if caller tries to override with conflicting value
    if (data.expatriateRegionId && data.expatriateRegionId !== expatriateRegionId) {
      throw new Error('Expatriate region ID conflicts with parent sector region');
    }
  } else if (expatriateRegionId) {
    // Verify expatriate region exists if directly specified
    const expatriateRegion = await prisma.expatriateRegion.findUnique({
      where: { id: expatriateRegionId }
    });

    if (!expatriateRegion) {
      throw new Error('Invalid expatriate region ID');
    }
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  return await prisma.sectorLocality.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      sectorType: data.sectorType,
      description: normalizedDescription,
      sectorRegionId: data.sectorRegionId || null,
      expatriateRegionId: expatriateRegionId || null,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateSectorLocality(id: string, data: any): Promise<any> {
  return await prisma.sectorLocality.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorRegionId: data.sectorRegionId,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active
    }
  });
}

export async function deleteSectorLocality(id: string): Promise<any> {
  return await prisma.sectorLocality.delete({
    where: { id }
  });
}

// ===== SECTOR ADMIN UNIT =====

export async function getAllSectorAdminUnits(sectorLocalityId: string | null = null, expatriateRegionId: string | null = null, originalOnly: boolean = false, expatriateOnly: boolean = false): Promise<any[]> {
  const where: any = { active: true };
  if (sectorLocalityId) {
    where.sectorLocalityId = sectorLocalityId;
  }
  if (originalOnly) {
    // Original hierarchy sectors have no expatriateRegionId
    where.expatriateRegionId = null;
  } else if (expatriateOnly) {
    // Expatriate hierarchy sectors have expatriateRegionId set (not null)
    where.expatriateRegionId = { not: null };
  } else if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
  return await prisma.sectorAdminUnit.findMany({
    where,
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }],
    include: {
      sectorLocality: true,
      expatriateRegion: true,
      _count: {
        select: { users: true, sectorDistricts: true }
      }
    }
  });
}

export async function getSectorAdminUnitById(id: string): Promise<any> {
  return await prisma.sectorAdminUnit.findUnique({
    where: { id },
    include: {
      sectorLocality: true,
      expatriateRegion: true,
      sectorDistricts: true,
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      }
    }
  });
}

export async function createSectorAdminUnit(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  if (!data.sectorType) {
    throw new Error('Sector type is required');
  }

  // Require either sectorLocalityId or expatriateRegionId
  if (!data.sectorLocalityId && !data.expatriateRegionId) {
    throw new Error('Sector locality ID or expatriate region ID is required');
  }

  let expatriateRegionId = data.expatriateRegionId;

  // If sectorLocalityId is provided, derive expatriateRegionId from it
  if (data.sectorLocalityId) {
    const sectorLocality = await prisma.sectorLocality.findUnique({
      where: { id: data.sectorLocalityId },
      select: { expatriateRegionId: true }
    });

    if (!sectorLocality) {
      throw new Error('Invalid sector locality ID');
    }

    // Use the parent's expatriateRegionId to prevent drift
    expatriateRegionId = sectorLocality.expatriateRegionId;

    // Reject if caller tries to override with conflicting value
    if (data.expatriateRegionId && data.expatriateRegionId !== expatriateRegionId) {
      throw new Error('Expatriate region ID conflicts with parent sector locality');
    }
  } else if (expatriateRegionId) {
    // Verify expatriate region exists if directly specified
    const expatriateRegion = await prisma.expatriateRegion.findUnique({
      where: { id: expatriateRegionId }
    });

    if (!expatriateRegion) {
      throw new Error('Invalid expatriate region ID');
    }
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  return await prisma.sectorAdminUnit.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      sectorType: data.sectorType,
      description: normalizedDescription,
      sectorLocalityId: data.sectorLocalityId || null,
      expatriateRegionId: expatriateRegionId || null,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateSectorAdminUnit(id: string, data: any): Promise<any> {
  return await prisma.sectorAdminUnit.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorLocalityId: data.sectorLocalityId,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active
    }
  });
}

export async function deleteSectorAdminUnit(id: string): Promise<any> {
  return await prisma.sectorAdminUnit.delete({
    where: { id }
  });
}

// ===== SECTOR DISTRICT =====

export async function getAllSectorDistricts(sectorAdminUnitId: string | null = null, expatriateRegionId: string | null = null, originalOnly: boolean = false, expatriateOnly: boolean = false): Promise<any[]> {
  const where: any = { active: true };
  if (sectorAdminUnitId) {
    where.sectorAdminUnitId = sectorAdminUnitId;
  }
  if (originalOnly) {
    // Original hierarchy sectors have no expatriateRegionId
    where.expatriateRegionId = null;
  } else if (expatriateOnly) {
    // Expatriate hierarchy sectors have expatriateRegionId set (not null)
    where.expatriateRegionId = { not: null };
  } else if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
  return await prisma.sectorDistrict.findMany({
    where,
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }],
    include: {
      sectorAdminUnit: true,
      expatriateRegion: true,
      _count: {
        select: { users: true }
      }
    }
  });
}

export async function getSectorDistrictById(id: string): Promise<any> {
  return await prisma.sectorDistrict.findUnique({
    where: { id },
    include: {
      sectorAdminUnit: true,
      expatriateRegion: true,
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      }
    }
  });
}

export async function createSectorDistrict(data: any): Promise<any> {
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  if (!data.sectorType) {
    throw new Error('Sector type is required');
  }

  // Require either sectorAdminUnitId or expatriateRegionId
  if (!data.sectorAdminUnitId && !data.expatriateRegionId) {
    throw new Error('Sector admin unit ID or expatriate region ID is required');
  }

  let expatriateRegionId = data.expatriateRegionId;

  // If sectorAdminUnitId is provided, derive expatriateRegionId from it
  if (data.sectorAdminUnitId) {
    const sectorAdminUnit = await prisma.sectorAdminUnit.findUnique({
      where: { id: data.sectorAdminUnitId },
      select: { expatriateRegionId: true }
    });

    if (!sectorAdminUnit) {
      throw new Error('Invalid sector admin unit ID');
    }

    // Use the parent's expatriateRegionId to prevent drift
    expatriateRegionId = sectorAdminUnit.expatriateRegionId;

    // Reject if caller tries to override with conflicting value
    if (data.expatriateRegionId && data.expatriateRegionId !== expatriateRegionId) {
      throw new Error('Expatriate region ID conflicts with parent sector admin unit');
    }
  } else if (expatriateRegionId) {
    // Verify expatriate region exists if directly specified
    const expatriateRegion = await prisma.expatriateRegion.findUnique({
      where: { id: expatriateRegionId }
    });

    if (!expatriateRegion) {
      throw new Error('Invalid expatriate region ID');
    }
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  return await prisma.sectorDistrict.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      sectorType: data.sectorType,
      description: normalizedDescription,
      sectorAdminUnitId: data.sectorAdminUnitId || null,
      expatriateRegionId: expatriateRegionId || null,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateSectorDistrict(id: string, data: any): Promise<any> {
  return await prisma.sectorDistrict.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorAdminUnitId: data.sectorAdminUnitId,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active
    }
  });
}

export async function deleteSectorDistrict(id: string): Promise<any> {
  return await prisma.sectorDistrict.delete({
    where: { id }
  });
}

// ===== SECTOR MEMBERS MANAGEMENT =====

type SectorLevelType = 'national' | 'region' | 'locality' | 'adminUnit' | 'district';

const sectorIdFields: Record<SectorLevelType, string> = {
  national: 'sectorNationalLevelId',
  region: 'sectorRegionId',
  locality: 'sectorLocalityId',
  adminUnit: 'sectorAdminUnitId',
  district: 'sectorDistrictId'
};

// Get members of a specific sector
export async function getSectorMembers(sectorId: string, level: SectorLevelType): Promise<any[]> {
  const idField = sectorIdFields[level];
  
  return await prisma.user.findMany({
    where: {
      [idField]: sectorId
    },
    select: {
      id: true,
      email: true,
      mobileNumber: true,
      adminLevel: true,
      role: true,
      profile: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      memberDetails: {
        select: {
          fullName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

// Get available users that can be added to a sector
// Fetches ALL users from the hierarchy level AND all sub-children
export async function getAvailableUsersForSector(sectorId: string, level: SectorLevelType, adminUser: any = null): Promise<any[]> {
  const idField = sectorIdFields[level];
  
  // First, get the sector to extract the hierarchy entity ID from description
  let hierarchyEntityId: string | null = null;
  
  try {
    switch (level) {
      case 'region': {
        const sector = await prisma.sectorRegion.findUnique({ where: { id: sectorId } });
        if (sector?.description) {
          // Try JSON format first (new format)
          try {
            const metadata = JSON.parse(sector.description);
            if (metadata.sourceEntityType === 'region' && metadata.sourceEntityId) {
              hierarchyEntityId = metadata.sourceEntityId;
            }
          } catch {
            // Fallback to legacy format
            const match = sector.description.match(/SOURCE:region:([a-f0-9-]+)/i);
            hierarchyEntityId = match ? match[1] : null;
          }
        }
        break;
      }
      case 'locality': {
        const sector = await prisma.sectorLocality.findUnique({ where: { id: sectorId } });
        if (sector?.description) {
          // Try JSON format first (new format)
          try {
            const metadata = JSON.parse(sector.description);
            if (metadata.sourceEntityType === 'locality' && metadata.sourceEntityId) {
              hierarchyEntityId = metadata.sourceEntityId;
            }
          } catch {
            // Fallback to legacy format
            const match = sector.description.match(/SOURCE:locality:([a-f0-9-]+)/i);
            hierarchyEntityId = match ? match[1] : null;
          }
        }
        break;
      }
      case 'adminUnit': {
        const sector = await prisma.sectorAdminUnit.findUnique({ where: { id: sectorId } });
        if (sector?.description) {
          // Try JSON format first (new format)
          try {
            const metadata = JSON.parse(sector.description);
            if (metadata.sourceEntityType === 'adminUnit' && metadata.sourceEntityId) {
              hierarchyEntityId = metadata.sourceEntityId;
            }
          } catch {
            // Fallback to legacy format
            const match = sector.description.match(/SOURCE:adminUnit:([a-f0-9-]+)/i);
            hierarchyEntityId = match ? match[1] : null;
          }
        }
        break;
      }
      case 'district': {
        const sector = await prisma.sectorDistrict.findUnique({ where: { id: sectorId } });
        if (sector?.description) {
          // Try JSON format first (new format)
          try {
            const metadata = JSON.parse(sector.description);
            if (metadata.sourceEntityType === 'district' && metadata.sourceEntityId) {
              hierarchyEntityId = metadata.sourceEntityId;
            }
          } catch {
            // Fallback to legacy format
            const match = sector.description.match(/SOURCE:district:([a-f0-9-]+)/i);
            hierarchyEntityId = match ? match[1] : null;
          }
        }
        break;
      }
    }
  } catch (error) {
    console.error('Error extracting hierarchy entity ID from sector:', error);
  }

  // Build where clause - get users NOT already in this sector
  const whereClause: any = {
    [idField]: null // Users not already assigned to this sector type
  };

  // If we have a hierarchy entity ID, get users from that hierarchy level itself (not sub-children)
  if (hierarchyEntityId) {
    switch (level) {
      case 'region': {
        // Users from this region only
        whereClause.regionId = hierarchyEntityId;
        break;
      }
      case 'locality': {
        // Users from this locality only
        whereClause.localityId = hierarchyEntityId;
        break;
      }
      case 'adminUnit': {
        // Users from this admin unit only
        whereClause.adminUnitId = hierarchyEntityId;
        break;
      }
      case 'district': {
        // Users from this district only
        whereClause.districtId = hierarchyEntityId;
        break;
      }
    }
  }

  // Apply additional admin scope filtering if needed
  if (adminUser) {
    const { adminLevel, regionId, localityId, adminUnitId, districtId, nationalLevelId } = adminUser;

    // Full access admins can see all users
    if (adminLevel !== 'ADMIN' && adminLevel !== 'GENERAL_SECRETARIAT') {
      // Additional scope restriction for hierarchical admins
      // This is already partially handled by the hierarchy entity filter above
      // But we can add additional restrictions based on admin's own scope
      
      if (adminLevel === 'NATIONAL_LEVEL' && nationalLevelId && !hierarchyEntityId) {
        // Fallback: filter by national level if no hierarchy entity
        whereClause.region = { nationalLevelId: nationalLevelId };
      } else if (adminLevel === 'REGION' && regionId && !hierarchyEntityId) {
        whereClause.regionId = regionId;
      } else if (adminLevel === 'LOCALITY' && localityId && !hierarchyEntityId) {
        whereClause.localityId = localityId;
      } else if (adminLevel === 'ADMIN_UNIT' && adminUnitId && !hierarchyEntityId) {
        whereClause.adminUnitId = adminUnitId;
      } else if (adminLevel === 'DISTRICT' && districtId && !hierarchyEntityId) {
        whereClause.districtId = districtId;
      }
    }
  }
  
  // Get users that match the criteria
  const users = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      email: true,
      mobileNumber: true,
      adminLevel: true,
      role: true,
      regionId: true,
      localityId: true,
      adminUnitId: true,
      districtId: true,
      sectorNationalLevelId: true,
      sectorRegionId: true,
      sectorLocalityId: true,
      sectorAdminUnitId: true,
      sectorDistrictId: true,
      profile: {
        select: {
          firstName: true,
          lastName: true
        }
      },
      memberDetails: {
        select: {
          fullName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 100 // Limit for performance
  });

  return users;
}

// Add a user to a sector
export async function addUserToSector(userId: string, sectorId: string, level: SectorLevelType): Promise<any> {
  const idField = sectorIdFields[level];
  
  return await prisma.user.update({
    where: { id: userId },
    data: {
      [idField]: sectorId
    },
    select: {
      id: true,
      email: true,
      mobileNumber: true,
      profile: {
        select: {
          firstName: true,
          lastName: true
        }
      }
    }
  });
}

// Remove a user from a sector
export async function removeUserFromSector(userId: string, sectorId: string, level: SectorLevelType): Promise<any> {
  const idField = sectorIdFields[level];
  
  // First verify the user actually belongs to the specified sector
  const user = await prisma.user.findUnique({
    where: { id: userId },
    // Use a typed cast here because we're selecting a dynamic field name
    // that corresponds to one of the sector*Id columns.
    select: { [idField]: true } as any
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if the user belongs to the specified sector
  const currentSectorId = (user as any)[idField] as string | null;
  if (currentSectorId !== sectorId) {
    throw new Error('User does not belong to the specified sector');
  }
  
  return await prisma.user.update({
    where: { id: userId },
    data: {
      [idField]: null
    },
    select: {
      id: true,
      email: true,
      mobileNumber: true
    }
  });
}

// ===== FULL HIERARCHY =====

export async function getFullSectorHierarchy(expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
  const nationalLevels = await prisma.sectorNationalLevel.findMany({
    where,
    include: {
      expatriateRegion: true,
      sectorRegions: {
        where: { active: true },
        include: {
          sectorLocalities: {
            where: { active: true },
            include: {
              sectorAdminUnits: {
                where: { active: true },
                include: {
                  sectorDistricts: {
                    where: { active: true }
                  }
                }
              }
            }
          }
        }
      }
    },
    orderBy: [{ sectorType: 'asc' }, { name: 'asc' }]
  });
  
  return nationalLevels;
}

export default {
  // Sector National Level
  getAllSectorNationalLevels,
  getSectorNationalLevelById,
  createSectorNationalLevel,
  updateSectorNationalLevel,
  deleteSectorNationalLevel,
  
  // Sector Region
  getAllSectorRegions,
  getSectorRegionById,
  createSectorRegion,
  updateSectorRegion,
  deleteSectorRegion,
  
  // Sector Locality
  getAllSectorLocalities,
  getSectorLocalityById,
  createSectorLocality,
  updateSectorLocality,
  deleteSectorLocality,
  
  // Sector Admin Unit
  getAllSectorAdminUnits,
  getSectorAdminUnitById,
  createSectorAdminUnit,
  updateSectorAdminUnit,
  deleteSectorAdminUnit,
  
  // Sector District
  getAllSectorDistricts,
  getSectorDistrictById,
  createSectorDistrict,
  updateSectorDistrict,
  deleteSectorDistrict,
  
  // Full Hierarchy
  getFullSectorHierarchy,
  
  // Sector Members Management
  getSectorMembers,
  getAvailableUsersForSector,
  addUserToSector,
  removeUserFromSector
};

