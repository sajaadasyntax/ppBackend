const prisma = require('../utils/prisma');

/**
 * Get all expatriate regions
 */
async function getAllExpatriateRegions() {
  return await prisma.expatriateRegion.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });
}

/**
 * Get expatriate region by ID
 */
async function getExpatriateRegionById(id) {
  return await prisma.expatriateRegion.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          adminLevel: true,
          profile: true
        }
      },
      sectorNationalLevels: true,
      sectorRegions: true,
      sectorLocalities: true,
      sectorAdminUnits: true,
      sectorDistricts: true
    }
  });
}

/**
 * Create new expatriate region
 */
async function createExpatriateRegion(data) {
  return await prisma.expatriateRegion.create({
    data: {
      name: data.name,
      code: data.code,
      description: data.description,
      active: data.active !== undefined ? data.active : true
    }
  });
}

/**
 * Update expatriate region
 */
async function updateExpatriateRegion(id, data) {
  return await prisma.expatriateRegion.update({
    where: { id },
    data: {
      name: data.name,
      code: data.code,
      description: data.description,
      active: data.active
    }
  });
}

/**
 * Delete expatriate region
 */
async function deleteExpatriateRegion(id) {
  return await prisma.expatriateRegion.delete({
    where: { id }
  });
}

/**
 * Get users in an expatriate region
 */
async function getUsersByExpatriateRegion(expatriateRegionId) {
  return await prisma.user.findMany({
    where: { expatriateRegionId },
    include: {
      profile: true,
      expatriateRegion: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * Assign user to expatriate region
 */
async function assignUserToExpatriateRegion(userId, expatriateRegionId) {
  return await prisma.user.update({
    where: { id: userId },
    data: { expatriateRegionId }
  });
}

module.exports = {
  getAllExpatriateRegions,
  getExpatriateRegionById,
  createExpatriateRegion,
  updateExpatriateRegion,
  deleteExpatriateRegion,
  getUsersByExpatriateRegion,
  assignUserToExpatriateRegion
};

