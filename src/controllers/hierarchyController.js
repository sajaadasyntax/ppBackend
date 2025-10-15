const prisma = require('../utils/prisma');
const userService = require('../services/userService');

// Get all regions
exports.getRegions = async (req, res) => {
  try {
    console.log('🔍 getRegions called from hierarchyController');
    
    const adminUser = req.user; // Get the admin user with hierarchy info
    
    console.log('👤 User in request:', JSON.stringify({
      id: adminUser?.id,
      email: adminUser?.email,
      adminLevel: adminUser?.adminLevel,
      regionId: adminUser?.regionId,
      region: adminUser?.region?.name
    }, null, 2));
    
    let whereClause = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log('🔒 Applying access control:', { adminLevel, regionId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // Admin and General Secretariat can see all regions
          console.log('👑 Admin/General Secretariat user - showing all regions');
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          console.log('🏢 Region/lower level user - filtering to regionId:', regionId);
          whereClause.id = regionId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) {
            console.log('👤 Regular user with regionId:', regionId);
            whereClause.id = regionId;
          } else {
            console.log('⚠️ User has no regionId assigned!');
          }
      }
    } else {
      console.log('⚠️ No user information in request! Authentication may have failed.');
    }
    
    console.log('🔍 Finding regions with whereClause:', whereClause);
    
    const regions = await prisma.region.findMany({
      where: whereClause,
      include: {
        _count: {
          select: {
            localities: true,
            users: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Found ${regions.length} regions based on filters`);
    if (regions.length > 0) {
      console.log('📋 Region names:', regions.map(r => r.name).join(', '));
    }
    
    res.json(regions);
  } catch (error) {
    console.error('❌ Error getting regions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single region by ID
exports.getRegionById = async (req, res) => {
  try {
    const { id } = req.params;
    const region = await prisma.region.findUnique({
      where: { id },
      include: {
        localities: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }
    
    res.json(region);
  } catch (error) {
    console.error('Error getting region:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new region
exports.createRegion = async (req, res) => {
  try {
    const { name, code, description, adminId } = req.body;
    
    const region = await prisma.region.create({
      data: {
        name,
        code: code && code.trim() ? code.trim() : undefined, // Convert empty strings to undefined/null
        description: description && description.trim() ? description.trim() : undefined,
        adminId: adminId || undefined
      }
    });
    
    res.status(201).json(region);
  } catch (error) {
    console.error('Error creating region:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A region with this code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update region
exports.updateRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, adminId, active } = req.body;
    
    const region = await prisma.region.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(region);
  } catch (error) {
    console.error('Error updating region:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Region not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete region
exports.deleteRegion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.region.delete({
      where: { id }
    });
    
    res.json({ message: 'Region deleted successfully' });
  } catch (error) {
    console.error('Error deleting region:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Region not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete region with associated localities or users' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get localities by region
exports.getLocalitiesByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    const localities = await prisma.locality.findMany({
      where: { regionId },
      orderBy: { name: 'asc' }
    });
    
    res.json(localities);
  } catch (error) {
    console.error('Error getting localities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single locality by ID
exports.getLocalityById = async (req, res) => {
  try {
    const { id } = req.params;
    const locality = await prisma.locality.findUnique({
      where: { id },
      include: {
        region: true,
        adminUnits: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!locality) {
      return res.status(404).json({ error: 'Locality not found' });
    }
    
    res.json(locality);
  } catch (error) {
    console.error('Error getting locality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new locality
exports.createLocality = async (req, res) => {
  try {
    const { name, code, description, adminId } = req.body;
    // regionId can come from URL params or request body
    const regionId = req.params.regionId || req.body.regionId;
    
    if (!regionId) {
      return res.status(400).json({ error: 'Region ID is required' });
    }
    
    const locality = await prisma.locality.create({
      data: {
        name,
        code: code && code.trim() ? code.trim() : undefined, // Convert empty strings to undefined/null
        description: description && description.trim() ? description.trim() : undefined,
        regionId,
        adminId: adminId || undefined
      }
    });
    
    res.status(201).json(locality);
  } catch (error) {
    console.error('Error creating locality:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid region ID' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A locality with this code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update locality
exports.updateLocality = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, regionId, adminId, active } = req.body;
    
    const locality = await prisma.locality.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        regionId: regionId !== undefined ? regionId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(locality);
  } catch (error) {
    console.error('Error updating locality:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Locality not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid region ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete locality
exports.deleteLocality = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.locality.delete({
      where: { id }
    });
    
    res.json({ message: 'Locality deleted successfully' });
  } catch (error) {
    console.error('Error deleting locality:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Locality not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete locality with associated admin units or users' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get admin units by locality
exports.getAdminUnitsByLocality = async (req, res) => {
  try {
    const { localityId } = req.params;
    const adminUnits = await prisma.adminUnit.findMany({
      where: { localityId },
      orderBy: { name: 'asc' }
    });
    
    res.json(adminUnits);
  } catch (error) {
    console.error('Error getting admin units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single admin unit by ID
exports.getAdminUnitById = async (req, res) => {
  try {
    const { id } = req.params;
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id },
      include: {
        locality: {
          include: {
            region: true
          }
        },
        districts: true,
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!adminUnit) {
      return res.status(404).json({ error: 'Administrative unit not found' });
    }
    
    res.json(adminUnit);
  } catch (error) {
    console.error('Error getting administrative unit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new admin unit
exports.createAdminUnit = async (req, res) => {
  try {
    const { name, code, description, adminId } = req.body;
    // localityId can come from URL params or request body
    const localityId = req.params.localityId || req.body.localityId;
    
    if (!localityId) {
      return res.status(400).json({ error: 'Locality ID is required' });
    }
    
    const adminUnit = await prisma.adminUnit.create({
      data: {
        name,
        code: code && code.trim() ? code.trim() : undefined, // Convert empty strings to undefined/null
        description: description && description.trim() ? description.trim() : undefined,
        localityId,
        adminId: adminId || undefined
      }
    });
    
    res.status(201).json(adminUnit);
  } catch (error) {
    console.error('Error creating administrative unit:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid locality ID' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'An administrative unit with this code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update admin unit
exports.updateAdminUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, localityId, adminId, active } = req.body;
    
    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        localityId: localityId !== undefined ? localityId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(adminUnit);
  } catch (error) {
    console.error('Error updating administrative unit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Administrative unit not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid locality ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete admin unit
exports.deleteAdminUnit = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.adminUnit.delete({
      where: { id }
    });
    
    res.json({ message: 'Administrative unit deleted successfully' });
  } catch (error) {
    console.error('Error deleting administrative unit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Administrative unit not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete administrative unit with associated districts or users' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get districts by admin unit
exports.getDistrictsByAdminUnit = async (req, res) => {
  try {
    const { adminUnitId } = req.params;
    const districts = await prisma.district.findMany({
      where: { adminUnitId },
      orderBy: { name: 'asc' }
    });
    
    res.json(districts);
  } catch (error) {
    console.error('Error getting districts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get single district by ID
exports.getDistrictById = async (req, res) => {
  try {
    const { id } = req.params;
    const district = await prisma.district.findUnique({
      where: { id },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: {
                region: true
              }
            }
          }
        },
        users: {
          include: {
            profile: true
          }
        }
      }
    });
    
    if (!district) {
      return res.status(404).json({ error: 'District not found' });
    }
    
    res.json(district);
  } catch (error) {
    console.error('Error getting district:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create new district
exports.createDistrict = async (req, res) => {
  try {
    const { name, code, description, adminId } = req.body;
    // adminUnitId can come from URL params or request body
    const adminUnitId = req.params.adminUnitId || req.body.adminUnitId;
    
    if (!adminUnitId) {
      return res.status(400).json({ error: 'Administrative unit ID is required' });
    }
    
    const district = await prisma.district.create({
      data: {
        name,
        code: code && code.trim() ? code.trim() : undefined, // Convert empty strings to undefined/null
        description: description && description.trim() ? description.trim() : undefined,
        adminUnitId,
        adminId: adminId || undefined
      }
    });
    
    res.status(201).json(district);
  } catch (error) {
    console.error('Error creating district:', error);
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid administrative unit ID' });
    }
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A district with this code already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update district
exports.updateDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, adminUnitId, adminId, active } = req.body;
    
    const district = await prisma.district.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        description: description !== undefined ? description : undefined,
        adminUnitId: adminUnitId !== undefined ? adminUnitId : undefined,
        adminId: adminId !== undefined ? adminId : undefined,
        active: active !== undefined ? active : undefined
      }
    });
    
    res.json(district);
  } catch (error) {
    console.error('Error updating district:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid administrative unit ID' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete district
exports.deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.district.delete({
      where: { id }
    });
    
    res.json({ message: 'District deleted successfully' });
  } catch (error) {
    console.error('Error deleting district:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({ error: 'Cannot delete district with associated users' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get full hierarchy
exports.getFullHierarchy = async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: {
        localities: {
          where: { active: true },
          orderBy: { name: 'asc' },
          include: {
            adminUnits: {
              where: { active: true },
              orderBy: { name: 'asc' },
              include: {
                districts: {
                  where: { active: true },
                  orderBy: { name: 'asc' }
                }
              }
            }
          }
        }
      }
    });
    
    res.json(regions);
  } catch (error) {
    console.error('Error getting full hierarchy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get users by hierarchy level and ID
exports.getUsersByHierarchyLevel = async (req, res) => {
  try {
    const { level, id, page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    
    let filter = {};
    
    // Build filter based on hierarchy level
    switch(level) {
      case 'region':
        filter.regionId = id;
        break;
      case 'locality':
        filter.localityId = id;
        break;
      case 'adminUnit':
        filter.adminUnitId = id;
        break;
      case 'district':
        filter.districtId = id;
        break;
      default:
        return res.status(400).json({ error: 'Invalid hierarchy level' });
    }
    
    const result = await userService.getUsersByHierarchy(filter, pageNum, limitNum);
    res.json(result);
  } catch (error) {
    console.error('Error getting users by hierarchy level:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
