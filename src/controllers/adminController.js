const userService = require('../services/userService');
const { authenticate, restrictToAdminRole } = require('../middlewares/auth');

// Create admin account with hierarchical validation
exports.createAdminAccount = async (req, res) => {
  try {
    const creatorAdmin = req.user; // Get the creator admin from auth middleware
    const adminData = req.body;

    // Validate required fields
    const { mobileNumber, password, adminLevel } = adminData;
    if (!mobileNumber || !password || !adminLevel) {
      return res.status(400).json({ 
        error: 'Missing required fields: mobileNumber, password, adminLevel' 
      });
    }

    // Create the admin account
    const newAdmin = await userService.createAdminAccount(creatorAdmin, adminData);

    // Remove password from response
    const { password: _, ...adminWithoutPassword } = newAdmin;

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: adminWithoutPassword
    });

  } catch (error) {
    console.error('Error creating admin account:', error);
    
    if (error.message.includes('permission')) {
      return res.status(403).json({ error: error.message });
    }
    
    if (error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get available admin levels that the creator can create
exports.getAvailableAdminLevels = async (req, res) => {
  try {
    const creatorAdmin = req.user;
    const creatorLevel = creatorAdmin.adminLevel;

    const hierarchy = {
      'GENERAL_SECRETARIAT': 5,
      'REGION': 4,
      'LOCALITY': 3,
      'ADMIN_UNIT': 2,
      'DISTRICT': 1
    };

    const creatorRank = hierarchy[creatorLevel] || 0;
    const availableLevels = [];

    // Add levels that the creator can create (below their level)
    Object.entries(hierarchy).forEach(([level, rank]) => {
      if (rank < creatorRank) {
        availableLevels.push({
          level,
          rank,
          label: getAdminLevelLabel(level)
        });
      }
    });

    res.json({
      success: true,
      availableLevels: availableLevels.sort((a, b) => b.rank - a.rank) // Sort by rank descending
    });

  } catch (error) {
    console.error('Error getting available admin levels:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchy options for admin creation based on creator's level
exports.getHierarchyOptions = async (req, res) => {
  try {
    const creatorAdmin = req.user;
    const { adminLevel } = req.query;

    if (!adminLevel) {
      return res.status(400).json({ error: 'adminLevel query parameter is required' });
    }

    const options = await getHierarchyOptionsForLevel(creatorAdmin, adminLevel);

    res.json({
      success: true,
      hierarchyOptions: options
    });

  } catch (error) {
    console.error('Error getting hierarchy options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get admin level label
function getAdminLevelLabel(level) {
  const labels = {
    'GENERAL_SECRETARIAT': 'الأمانة العامة',
    'REGION': 'الولاية',
    'LOCALITY': 'المحلية',
    'ADMIN_UNIT': 'الوحدة الإدارية',
    'DISTRICT': 'الحي'
  };
  return labels[level] || level;
}

// Helper function to get hierarchy options based on creator's level and target admin level
async function getHierarchyOptionsForLevel(creatorAdmin, targetAdminLevel) {
  const { adminLevel: creatorLevel, regionId, localityId, adminUnitId, districtId } = creatorAdmin;
  const prisma = require('../utils/prisma');

  const options = {};

  switch (creatorLevel) {
    case 'GENERAL_SECRETARIAT':
      // Can assign to any hierarchy level
      if (['REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const regions = await prisma.region.findMany({
          where: { active: true },
          select: { id: true, name: true }
        });
        options.regions = regions;
      }

      if (['LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const localities = await prisma.locality.findMany({
          where: { active: true },
          include: { region: { select: { id: true, name: true } } },
          select: { id: true, name: true, regionId: true, region: true }
        });
        options.localities = localities;
      }

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { active: true },
          include: { 
            locality: { 
              include: { region: { select: { id: true, name: true } } },
              select: { id: true, name: true, regionId: true, region: true }
            }
          },
          select: { id: true, name: true, localityId: true, locality: true }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { active: true },
          include: { 
            adminUnit: { 
              include: { 
                locality: { 
                  include: { region: { select: { id: true, name: true } } },
                  select: { id: true, name: true, regionId: true, region: true }
                },
                select: { id: true, name: true, localityId: true, locality: true }
              }
            }
          },
          select: { id: true, name: true, adminUnitId: true, adminUnit: true }
        });
        options.districts = districts;
      }
      break;

    case 'REGION':
      // Can only assign within their region
      options.region = { id: regionId, name: creatorAdmin.region?.name };

      if (['LOCALITY', 'ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const localities = await prisma.locality.findMany({
          where: { regionId, active: true },
          select: { id: true, name: true }
        });
        options.localities = localities;
      }

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { 
            locality: { regionId },
            active: true 
          },
          include: { locality: { select: { id: true, name: true } } },
          select: { id: true, name: true, localityId: true, locality: true }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { 
            adminUnit: { 
              locality: { regionId }
            },
            active: true 
          },
          include: { 
            adminUnit: { 
              include: { locality: { select: { id: true, name: true } } },
              select: { id: true, name: true, localityId: true, locality: true }
            }
          },
          select: { id: true, name: true, adminUnitId: true, adminUnit: true }
        });
        options.districts = districts;
      }
      break;

    case 'LOCALITY':
      // Can only assign within their locality
      options.region = { id: regionId, name: creatorAdmin.region?.name };
      options.locality = { id: localityId, name: creatorAdmin.locality?.name };

      if (['ADMIN_UNIT', 'DISTRICT'].includes(targetAdminLevel)) {
        const adminUnits = await prisma.adminUnit.findMany({
          where: { localityId, active: true },
          select: { id: true, name: true }
        });
        options.adminUnits = adminUnits;
      }

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { 
            adminUnit: { localityId },
            active: true 
          },
          include: { adminUnit: { select: { id: true, name: true } } },
          select: { id: true, name: true, adminUnitId: true, adminUnit: true }
        });
        options.districts = districts;
      }
      break;

    case 'ADMIN_UNIT':
      // Can only assign within their admin unit
      options.region = { id: regionId, name: creatorAdmin.region?.name };
      options.locality = { id: localityId, name: creatorAdmin.locality?.name };
      options.adminUnit = { id: adminUnitId, name: creatorAdmin.adminUnit?.name };

      if (targetAdminLevel === 'DISTRICT') {
        const districts = await prisma.district.findMany({
          where: { adminUnitId, active: true },
          select: { id: true, name: true }
        });
        options.districts = districts;
      }
      break;

    case 'DISTRICT':
      // Can only assign within their district
      options.region = { id: regionId, name: creatorAdmin.region?.name };
      options.locality = { id: localityId, name: creatorAdmin.locality?.name };
      options.adminUnit = { id: adminUnitId, name: creatorAdmin.adminUnit?.name };
      options.district = { id: districtId, name: creatorAdmin.district?.name };
      break;

    default:
      throw new Error('Invalid creator admin level');
  }

  return options;
}
