import prisma from '../utils/prisma';

// ===== SECTOR NATIONAL LEVEL =====

export async function getAllSectorNationalLevels(expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (expatriateRegionId) {
    where.expatriateRegionId = expatriateRegionId;
  }
  
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
  return await prisma.sectorNationalLevel.create({
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
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

export async function getAllSectorRegions(sectorNationalLevelId: string | null = null, expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (sectorNationalLevelId) {
    where.sectorNationalLevelId = sectorNationalLevelId;
  }
  if (expatriateRegionId) {
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
  return await prisma.sectorRegion.create({
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorNationalLevelId: data.sectorNationalLevelId,
      expatriateRegionId: data.expatriateRegionId,
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

export async function getAllSectorLocalities(sectorRegionId: string | null = null, expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (sectorRegionId) {
    where.sectorRegionId = sectorRegionId;
  }
  if (expatriateRegionId) {
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
  return await prisma.sectorLocality.create({
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorRegionId: data.sectorRegionId,
      expatriateRegionId: data.expatriateRegionId,
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

export async function getAllSectorAdminUnits(sectorLocalityId: string | null = null, expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (sectorLocalityId) {
    where.sectorLocalityId = sectorLocalityId;
  }
  if (expatriateRegionId) {
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
  return await prisma.sectorAdminUnit.create({
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorLocalityId: data.sectorLocalityId,
      expatriateRegionId: data.expatriateRegionId,
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

export async function getAllSectorDistricts(sectorAdminUnitId: string | null = null, expatriateRegionId: string | null = null): Promise<any[]> {
  const where: any = { active: true };
  if (sectorAdminUnitId) {
    where.sectorAdminUnitId = sectorAdminUnitId;
  }
  if (expatriateRegionId) {
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
  return await prisma.sectorDistrict.create({
    data: {
      name: data.name,
      code: data.code,
      sectorType: data.sectorType,
      description: data.description,
      sectorAdminUnitId: data.sectorAdminUnitId,
      expatriateRegionId: data.expatriateRegionId,
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
  getFullSectorHierarchy
};

