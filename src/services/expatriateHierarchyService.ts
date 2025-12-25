import prisma from '../utils/prisma';
import { SectorType, AdminLevel } from '@prisma/client';
import { hashPassword } from '../utils/auth';
import { normalizeMobileNumber } from '../utils/mobileNormalization';

// Fixed 4 sector types
const FIXED_SECTOR_TYPES: SectorType[] = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];

const sectorTypeNames: Record<SectorType, string> = {
  SOCIAL: 'الاجتماعي',
  ECONOMIC: 'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL: 'السياسي'
};

// Helper function to auto-create 4 sectors for a new expatriate region
async function createSectorsForExpatriateRegion(expatriateRegionId: string, regionName: string): Promise<void> {
  try {
    // Create 4 SectorNationalLevel entries for this expatriate region
    for (const sectorType of FIXED_SECTOR_TYPES) {
      await prisma.sectorNationalLevel.create({
        data: {
          name: `${regionName} - ${sectorTypeNames[sectorType]}`,
          sectorType,
          active: true,
          expatriateRegionId
        }
      });
    }
    
    console.log(`✅ Created 4 sectors for expatriate region: ${regionName}`);
  } catch (error) {
    console.error(`⚠️ Error creating sectors for expatriate region:`, error);
    // Don't throw - sector creation failure shouldn't block region creation
  }
}

// ==================== EXPATRIATE NATIONAL LEVEL ====================

export async function getAllExpatriateNationalLevels(): Promise<any[]> {
  return await prisma.expatriateNationalLevel.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { regions: true, users: true } }
    }
  });
}

export async function getExpatriateNationalLevelById(id: string): Promise<any> {
  return await prisma.expatriateNationalLevel.findUnique({
    where: { id },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      regions: { where: { active: true } },
      _count: { select: { regions: true, users: true } }
    }
  });
}

export async function createExpatriateNationalLevel(data: any): Promise<any> {
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) throw new Error('Name is required');

  return await prisma.expatriateNationalLevel.create({
    data: {
      name: trimmedName,
      code: data.code?.trim()?.toUpperCase() || undefined,
      description: data.description?.trim() || undefined,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateExpatriateNationalLevel(id: string, data: any): Promise<any> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;

  const result = await prisma.expatriateNationalLevel.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { regions: true, users: true } }
    }
  });

  // Update admin's role and adminLevel if assigning
  if (data.adminId) {
    await prisma.user.update({
      where: { id: data.adminId },
      data: { role: 'ADMIN', adminLevel: 'EXPATRIATE_NATIONAL_LEVEL', expatriateNationalLevelId: id }
    });
  }

  return result;
}

export async function deleteExpatriateNationalLevel(id: string): Promise<any> {
  return await prisma.expatriateNationalLevel.update({
    where: { id },
    data: { active: false }
  });
}

export async function getExpatriateRegionsByNationalLevel(nationalLevelId: string): Promise<any[]> {
  const regions = await prisma.expatriateRegion.findMany({
    where: { expatriateNationalLevelId: nationalLevelId, active: true },
    orderBy: { name: 'asc' },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { localities: true, users: true } }
    }
  });

  // Calculate total users including sub-children
  return await Promise.all(regions.map(async (region) => {
    const localities = await prisma.expatriateLocality.findMany({
      where: { expatriateRegionId: region.id },
      select: { id: true }
    });
    const localityIds = localities.map(l => l.id);

    const adminUnits = await prisma.expatriateAdminUnit.findMany({
      where: { expatriateLocalityId: { in: localityIds } },
      select: { id: true }
    });
    const adminUnitIds = adminUnits.map(au => au.id);

    const districts = await prisma.expatriateDistrict.findMany({
      where: { expatriateAdminUnitId: { in: adminUnitIds } },
      select: { id: true }
    });
    const districtIds = districts.map(d => d.id);

    const totalUsers = districtIds.length > 0
      ? await prisma.user.count({ where: { expatriateDistrictId: { in: districtIds } } })
      : await prisma.user.count({ where: { expatriateRegionId: region.id } });

    return {
      ...region,
      _count: { ...region._count, users: totalUsers }
    };
  }));
}

/**
 * Get all expatriate regions
 */
export async function getAllExpatriateRegions(): Promise<any[]> {
  return await prisma.expatriateRegion.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
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
        }
      },
      _count: {
        select: { 
          users: true,
          sectorNationalLevels: true,
          localities: true
        }
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
  // Validate required fields
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) {
    throw new Error('Name is required');
  }

  const normalizedCode = typeof data.code === 'string' && data.code.trim().length > 0
    ? data.code.trim().toUpperCase()
    : undefined;

  const normalizedDescription = typeof data.description === 'string' && data.description.trim().length > 0
    ? data.description.trim()
    : undefined;

  const region = await prisma.expatriateRegion.create({
    data: {
      name: trimmedName,
      code: normalizedCode,
      description: normalizedDescription,
      active: data.active !== undefined ? data.active : true
    }
  });
  
  // Auto-create 4 sectors for this expatriate region
  await createSectorsForExpatriateRegion(region.id, trimmedName);
  
  return region;
}

/**
 * Update expatriate region
 */
export async function updateExpatriateRegion(id: string, data: any): Promise<any> {
  const updateData: any = {};
  
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;
  
  return await prisma.expatriateRegion.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
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
        }
      },
      _count: {
        select: {
          users: true,
          sectorNationalLevels: true
        }
      }
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

/**
 * Create user for expatriate region
 */
export async function createUserForExpatriateRegion(expatriateRegionId: string, userData: {
  mobileNumber: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  adminLevel?: string;
}): Promise<any> {
  // Validate mobile number
  if (!userData.mobileNumber) {
    throw new Error('Mobile number is required');
  }
  
  if (!userData.password) {
    throw new Error('Password is required');
  }
  
  // Normalize mobile number to E.164 format (same as login)
  let normalizedMobile: string;
  try {
    normalizedMobile = normalizeMobileNumber(userData.mobileNumber);
  } catch (error: any) {
    throw new Error(`Invalid mobile number format: ${error.message}`);
  }
  
  // Check if user already exists (using normalized mobile number)
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mobileNumber: normalizedMobile },
        ...(userData.email ? [{ email: userData.email }] : [])
      ]
    }
  });
  
  if (existingUser) {
    throw new Error('A user with this mobile number or email already exists');
  }
  
  // Verify expatriate region exists
  const region = await prisma.expatriateRegion.findUnique({
    where: { id: expatriateRegionId }
  });
  
  if (!region) {
    throw new Error('Expatriate region not found');
  }
  
  // Hash password
  const hashedPassword = await hashPassword(userData.password);
  
  // Determine the full name
  const fullName = userData.fullName || 
    (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` : 
     userData.firstName || userData.lastName || userData.mobileNumber);
  
  // Create user with expatriate region assignment (using normalized mobile number)
  const user = await prisma.user.create({
    data: {
      mobileNumber: normalizedMobile,
      password: hashedPassword,
      email: userData.email || null,
      role: 'USER',
      adminLevel: (userData.adminLevel || 'USER') as AdminLevel,
      expatriateRegionId,
      profile: {
        create: {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: normalizedMobile
        }
      },
      memberDetails: {
        create: {
          fullName,
          mobile: normalizedMobile
        }
      }
    },
    include: {
      profile: true,
      memberDetails: true,
      expatriateRegion: true
    }
  });
  
  return user;
}

// ==================== EXPATRIATE LOCALITY ====================

export async function getExpatriateLocalitiesByRegion(regionId: string): Promise<any[]> {
  const localities = await prisma.expatriateLocality.findMany({
    where: { expatriateRegionId: regionId, active: true },
    orderBy: { name: 'asc' },
    include: {
      expatriateRegion: { select: { id: true, name: true } },
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { adminUnits: true, users: true } }
    }
  });

  // Calculate total users including sub-children
  return await Promise.all(localities.map(async (locality) => {
    const adminUnits = await prisma.expatriateAdminUnit.findMany({
      where: { expatriateLocalityId: locality.id },
      select: { id: true }
    });
    const adminUnitIds = adminUnits.map(au => au.id);

    const districts = await prisma.expatriateDistrict.findMany({
      where: { expatriateAdminUnitId: { in: adminUnitIds } },
      select: { id: true }
    });
    const districtIds = districts.map(d => d.id);

    const totalUsers = districtIds.length > 0
      ? await prisma.user.count({ where: { expatriateDistrictId: { in: districtIds } } })
      : 0;

    return {
      ...locality,
      _count: { ...locality._count, users: totalUsers }
    };
  }));
}

export async function getExpatriateLocalityById(id: string): Promise<any> {
  return await prisma.expatriateLocality.findUnique({
    where: { id },
    include: {
      expatriateRegion: true,
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      adminUnits: { where: { active: true } },
      _count: { select: { adminUnits: true, users: true } }
    }
  });
}

export async function createExpatriateLocality(data: any): Promise<any> {
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) throw new Error('Name is required');
  if (!data.expatriateRegionId) throw new Error('Expatriate region ID is required');

  return await prisma.expatriateLocality.create({
    data: {
      name: trimmedName,
      code: data.code?.trim()?.toUpperCase() || undefined,
      description: data.description?.trim() || undefined,
      expatriateRegionId: data.expatriateRegionId,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateExpatriateLocality(id: string, data: any): Promise<any> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;

  const locality = await prisma.expatriateLocality.findUnique({
    where: { id },
    select: { expatriateRegionId: true }
  });

  const result = await prisma.expatriateLocality.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { adminUnits: true, users: true } }
    }
  });

  if (data.adminId) {
    await prisma.user.update({
      where: { id: data.adminId },
      data: {
        role: 'ADMIN',
        adminLevel: 'EXPATRIATE_LOCALITY',
        expatriateRegionId: locality?.expatriateRegionId,
        expatriateLocalityId: id
      }
    });
  }

  return result;
}

export async function deleteExpatriateLocality(id: string): Promise<any> {
  return await prisma.expatriateLocality.update({
    where: { id },
    data: { active: false }
  });
}

// ==================== EXPATRIATE ADMIN UNIT ====================

export async function getExpatriateAdminUnitsByLocality(localityId: string): Promise<any[]> {
  const adminUnits = await prisma.expatriateAdminUnit.findMany({
    where: { expatriateLocalityId: localityId, active: true },
    orderBy: { name: 'asc' },
    include: {
      expatriateLocality: {
        select: {
          id: true,
          name: true,
          expatriateRegionId: true,
          expatriateRegion: { select: { id: true, name: true } }
        }
      },
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { districts: true, users: true } }
    }
  });

  // Calculate total users including sub-children
  return await Promise.all(adminUnits.map(async (adminUnit) => {
    const districts = await prisma.expatriateDistrict.findMany({
      where: { expatriateAdminUnitId: adminUnit.id },
      select: { id: true }
    });
    const districtIds = districts.map(d => d.id);

    const totalUsers = districtIds.length > 0
      ? await prisma.user.count({ where: { expatriateDistrictId: { in: districtIds } } })
      : 0;

    return {
      ...adminUnit,
      _count: { ...adminUnit._count, users: totalUsers }
    };
  }));
}

export async function getExpatriateAdminUnitById(id: string): Promise<any> {
  return await prisma.expatriateAdminUnit.findUnique({
    where: { id },
    include: {
      expatriateLocality: {
        include: { expatriateRegion: true }
      },
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      districts: { where: { active: true } },
      _count: { select: { districts: true, users: true } }
    }
  });
}

export async function createExpatriateAdminUnit(data: any): Promise<any> {
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) throw new Error('Name is required');
  if (!data.expatriateLocalityId) throw new Error('Expatriate locality ID is required');

  return await prisma.expatriateAdminUnit.create({
    data: {
      name: trimmedName,
      code: data.code?.trim()?.toUpperCase() || undefined,
      description: data.description?.trim() || undefined,
      expatriateLocalityId: data.expatriateLocalityId,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateExpatriateAdminUnit(id: string, data: any): Promise<any> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;

  const adminUnit = await prisma.expatriateAdminUnit.findUnique({
    where: { id },
    select: {
      expatriateLocalityId: true,
      expatriateLocality: { select: { expatriateRegionId: true } }
    }
  });

  const result = await prisma.expatriateAdminUnit.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { districts: true, users: true } }
    }
  });

  if (data.adminId) {
    await prisma.user.update({
      where: { id: data.adminId },
      data: {
        role: 'ADMIN',
        adminLevel: 'EXPATRIATE_ADMIN_UNIT',
        expatriateRegionId: adminUnit?.expatriateLocality?.expatriateRegionId,
        expatriateLocalityId: adminUnit?.expatriateLocalityId,
        expatriateAdminUnitId: id
      }
    });
  }

  return result;
}

export async function deleteExpatriateAdminUnit(id: string): Promise<any> {
  return await prisma.expatriateAdminUnit.update({
    where: { id },
    data: { active: false }
  });
}

// ==================== EXPATRIATE DISTRICT ====================

export async function getExpatriateDistrictsByAdminUnit(adminUnitId: string): Promise<any[]> {
  return await prisma.expatriateDistrict.findMany({
    where: { expatriateAdminUnitId: adminUnitId, active: true },
    orderBy: { name: 'asc' },
    include: {
      expatriateAdminUnit: {
        select: {
          id: true,
          name: true,
          expatriateLocalityId: true,
          expatriateLocality: {
            select: {
              id: true,
              name: true,
              expatriateRegionId: true,
              expatriateRegion: { select: { id: true, name: true } }
            }
          }
        }
      },
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { users: true } }
    }
  });
}

export async function getExpatriateDistrictById(id: string): Promise<any> {
  return await prisma.expatriateDistrict.findUnique({
    where: { id },
    include: {
      expatriateAdminUnit: {
        include: {
          expatriateLocality: {
            include: { expatriateRegion: true }
          }
        }
      },
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { users: true } }
    }
  });
}

export async function createExpatriateDistrict(data: any): Promise<any> {
  const trimmedName = typeof data.name === 'string' ? data.name.trim() : '';
  if (!trimmedName) throw new Error('Name is required');
  if (!data.expatriateAdminUnitId) throw new Error('Expatriate admin unit ID is required');

  return await prisma.expatriateDistrict.create({
    data: {
      name: trimmedName,
      code: data.code?.trim()?.toUpperCase() || undefined,
      description: data.description?.trim() || undefined,
      expatriateAdminUnitId: data.expatriateAdminUnitId,
      active: data.active !== undefined ? data.active : true
    }
  });
}

export async function updateExpatriateDistrict(id: string, data: any): Promise<any> {
  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.adminId !== undefined) updateData.adminId = data.adminId;

  const district = await prisma.expatriateDistrict.findUnique({
    where: { id },
    select: {
      expatriateAdminUnitId: true,
      expatriateAdminUnit: {
        select: {
          expatriateLocalityId: true,
          expatriateLocality: { select: { expatriateRegionId: true } }
        }
      }
    }
  });

  const result = await prisma.expatriateDistrict.update({
    where: { id },
    data: updateData,
    include: {
      admin: {
        select: {
          id: true,
          email: true,
          mobileNumber: true,
          profile: { select: { firstName: true, lastName: true } },
          memberDetails: { select: { fullName: true } }
        }
      },
      _count: { select: { users: true } }
    }
  });

  if (data.adminId) {
    await prisma.user.update({
      where: { id: data.adminId },
      data: {
        role: 'ADMIN',
        adminLevel: 'EXPATRIATE_DISTRICT',
        expatriateRegionId: district?.expatriateAdminUnit?.expatriateLocality?.expatriateRegionId,
        expatriateLocalityId: district?.expatriateAdminUnit?.expatriateLocalityId,
        expatriateAdminUnitId: district?.expatriateAdminUnitId,
        expatriateDistrictId: id
      }
    });
  }

  return result;
}

export async function deleteExpatriateDistrict(id: string): Promise<any> {
  return await prisma.expatriateDistrict.update({
    where: { id },
    data: { active: false }
  });
}

// ==================== USER MANAGEMENT FOR EXPATRIATE HIERARCHY ====================

export async function getUsersByExpatriateLocality(localityId: string): Promise<any[]> {
  return await prisma.user.findMany({
    where: { expatriateLocalityId: localityId },
    include: { profile: true, memberDetails: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getUsersByExpatriateAdminUnit(adminUnitId: string): Promise<any[]> {
  return await prisma.user.findMany({
    where: { expatriateAdminUnitId: adminUnitId },
    include: { profile: true, memberDetails: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function getUsersByExpatriateDistrict(districtId: string): Promise<any[]> {
  return await prisma.user.findMany({
    where: { expatriateDistrictId: districtId },
    include: { profile: true, memberDetails: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUserForExpatriateDistrict(districtId: string, userData: {
  mobileNumber: string;
  password: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
}): Promise<any> {
  if (!userData.mobileNumber) throw new Error('Mobile number is required');
  if (!userData.password) throw new Error('Password is required');

  let normalizedMobile: string;
  try {
    normalizedMobile = normalizeMobileNumber(userData.mobileNumber);
  } catch (error: any) {
    throw new Error(`Invalid mobile number format: ${error.message}`);
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { mobileNumber: normalizedMobile },
        ...(userData.email ? [{ email: userData.email }] : [])
      ]
    }
  });

  if (existingUser) throw new Error('A user with this mobile number or email already exists');

  const district = await prisma.expatriateDistrict.findUnique({
    where: { id: districtId },
    include: {
      expatriateAdminUnit: {
        include: {
          expatriateLocality: {
            include: { expatriateRegion: true }
          }
        }
      }
    }
  });

  if (!district) throw new Error('Expatriate district not found');

  const hashedPassword = await hashPassword(userData.password);
  const fullName = userData.fullName ||
    (userData.firstName && userData.lastName ? `${userData.firstName} ${userData.lastName}` :
      userData.firstName || userData.lastName || userData.mobileNumber);

  return await prisma.user.create({
    data: {
      mobileNumber: normalizedMobile,
      password: hashedPassword,
      email: userData.email || null,
      role: 'USER',
      adminLevel: 'USER',
      activeHierarchy: 'EXPATRIATE',
      expatriateDistrictId: districtId,
      expatriateAdminUnitId: district.expatriateAdminUnitId,
      expatriateLocalityId: district.expatriateAdminUnit?.expatriateLocalityId,
      expatriateRegionId: district.expatriateAdminUnit?.expatriateLocality?.expatriateRegionId,
      profile: {
        create: {
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          phoneNumber: normalizedMobile
        }
      },
      memberDetails: {
        create: {
          fullName,
          mobile: normalizedMobile
        }
      }
    },
    include: {
      profile: true,
      memberDetails: true,
      expatriateDistrict: true,
      expatriateAdminUnit: true,
      expatriateLocality: true,
      expatriateRegion: true
    }
  });
}

export default {
  // National Level
  getAllExpatriateNationalLevels,
  getExpatriateNationalLevelById,
  createExpatriateNationalLevel,
  updateExpatriateNationalLevel,
  deleteExpatriateNationalLevel,
  // Region
  getAllExpatriateRegions,
  getExpatriateRegionsByNationalLevel,
  getExpatriateRegionById,
  createExpatriateRegion,
  updateExpatriateRegion,
  deleteExpatriateRegion,
  getUsersByExpatriateRegion,
  assignUserToExpatriateRegion,
  createUserForExpatriateRegion,
  // Locality
  getExpatriateLocalitiesByRegion,
  getExpatriateLocalityById,
  createExpatriateLocality,
  updateExpatriateLocality,
  deleteExpatriateLocality,
  getUsersByExpatriateLocality,
  // Admin Unit
  getExpatriateAdminUnitsByLocality,
  getExpatriateAdminUnitById,
  createExpatriateAdminUnit,
  updateExpatriateAdminUnit,
  deleteExpatriateAdminUnit,
  getUsersByExpatriateAdminUnit,
  // District
  getExpatriateDistrictsByAdminUnit,
  getExpatriateDistrictById,
  createExpatriateDistrict,
  updateExpatriateDistrict,
  deleteExpatriateDistrict,
  getUsersByExpatriateDistrict,
  createUserForExpatriateDistrict
};

