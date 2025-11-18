import prisma from '../utils/prisma';

/**
 * Get all expatriate regions
 */
export async function getAllExpatriateRegions(): Promise<any[]> {
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
export async function getExpatriateRegionById(id: string): Promise<any> {
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
export async function createExpatriateRegion(data: any): Promise<any> {
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
export async function updateExpatriateRegion(id: string, data: any): Promise<any> {
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
export async function deleteExpatriateRegion(id: string): Promise<any> {
  return await prisma.expatriateRegion.delete({
    where: { id }
  });
}

/**
 * Get users in an expatriate region
 */
export async function getUsersByExpatriateRegion(expatriateRegionId: string): Promise<any[]> {
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
export async function assignUserToExpatriateRegion(userId: string, expatriateRegionId: string): Promise<any> {
  return await prisma.user.update({
    where: { id: userId },
    data: { expatriateRegionId }
  });
}

export default {
  getAllExpatriateRegions,
  getExpatriateRegionById,
  createExpatriateRegion,
  updateExpatriateRegion,
  deleteExpatriateRegion,
  getUsersByExpatriateRegion,
  assignUserToExpatriateRegion
};

