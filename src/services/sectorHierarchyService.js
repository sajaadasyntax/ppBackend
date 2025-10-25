const prisma = require('../utils/prisma');

// ===== SECTOR NATIONAL LEVEL =====

async function getAllSectorNationalLevels(expatriateRegionId = null) {
  const where = { active: true };
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

async function getSectorNationalLevelById(id) {
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

async function createSectorNationalLevel(data) {
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

async function updateSectorNationalLevel(id, data) {
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

async function deleteSectorNationalLevel(id) {
  return await prisma.sectorNationalLevel.delete({
    where: { id }
  });
}

// ===== SECTOR REGION =====

async function getAllSectorRegions(sectorNationalLevelId = null, expatriateRegionId = null) {
  const where = { active: true };
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

async function getSectorRegionById(id) {
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

async function createSectorRegion(data) {
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

async function updateSectorRegion(id, data) {
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

async function deleteSectorRegion(id) {
  return await prisma.sectorRegion.delete({
    where: { id }
  });
}

// ===== SECTOR LOCALITY =====

async function getAllSectorLocalities(sectorRegionId = null, expatriateRegionId = null) {
  const where = { active: true };
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

async function getSectorLocalityById(id) {
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

async function createSectorLocality(data) {
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

async function updateSectorLocality(id, data) {
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

async function deleteSectorLocality(id) {
  return await prisma.sectorLocality.delete({
    where: { id }
  });
}

// ===== SECTOR ADMIN UNIT =====

async function getAllSectorAdminUnits(sectorLocalityId = null, expatriateRegionId = null) {
  const where = { active: true };
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

async function getSectorAdminUnitById(id) {
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

async function createSectorAdminUnit(data) {
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

async function updateSectorAdminUnit(id, data) {
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

async function deleteSectorAdminUnit(id) {
  return await prisma.sectorAdminUnit.delete({
    where: { id }
  });
}

// ===== SECTOR DISTRICT =====

async function getAllSectorDistricts(sectorAdminUnitId = null, expatriateRegionId = null) {
  const where = { active: true };
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

async function getSectorDistrictById(id) {
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

async function createSectorDistrict(data) {
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

async function updateSectorDistrict(id, data) {
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

async function deleteSectorDistrict(id) {
  return await prisma.sectorDistrict.delete({
    where: { id }
  });
}

// ===== FULL HIERARCHY =====

async function getFullSectorHierarchy(expatriateRegionId = null) {
  const where = { active: true };
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

module.exports = {
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

