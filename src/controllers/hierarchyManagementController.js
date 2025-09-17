const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Hierarchy Management Controller
 * Handles CRUD operations for administrative hierarchy elements
 */

// Get all regions with hierarchical access control
exports.getRegions = async (req, res) => {
  try {
    const adminUser = req.user; // Get the admin user with hierarchy info
    let whereClause = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all regions
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          whereClause.id = regionId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) whereClause.id = regionId;
      }
    }
    
    const regions = await prisma.region.findMany({
      where: whereClause,
      include: {
        localities: {
          where: { active: true },
          include: {
            adminUnits: {
              where: { active: true },
              include: {
                districts: {
                  where: { active: true }
                }
              }
            }
          }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Returning ${regions.length} regions based on user hierarchy level: ${adminUser?.adminLevel}`);
    
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

// Get localities by region
exports.getLocalitiesByRegion = async (req, res) => {
  try {
    const { regionId } = req.params;
    const adminUser = req.user;
    
    // Check if user has access to this region
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== regionId) {
      console.log('Access denied to localities for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        requestedRegion: regionId
      });
      return res.status(403).json({ error: 'Access denied to this region' });
    }
    
    console.log('User accessing localities for region:', regionId);
    
    const localities = await prisma.locality.findMany({
      where: { 
        regionId,
        active: true 
      },
      include: {
        adminUnits: {
          where: { active: true },
          include: {
            districts: {
              where: { active: true }
            }
          }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${localities.length} localities for region ${regionId}`);
    res.json(localities);
  } catch (error) {
    console.error('Error fetching localities:', error);
    res.status(500).json({ error: 'Failed to fetch localities' });
  }
};

// Get admin units by locality
exports.getAdminUnitsByLocality = async (req, res) => {
  try {
    const { localityId } = req.params;
    const adminUser = req.user;
    
    // First, get the locality to check its region
    const locality = await prisma.locality.findUnique({
      where: { id: localityId },
      select: { regionId: true }
    });
    
    if (!locality) {
      return res.status(404).json({ error: 'Locality not found' });
    }
    
    // Check if user has access to this locality's region
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== locality.regionId &&
        adminUser.localityId !== localityId) {
      console.log('Access denied to admin units for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        userLocality: adminUser.localityId,
        requestedLocality: localityId,
        localityRegion: locality.regionId
      });
      return res.status(403).json({ error: 'Access denied to this locality' });
    }
    
    console.log('User accessing admin units for locality:', localityId);
    
    const adminUnits = await prisma.adminUnit.findMany({
      where: { 
        localityId,
        active: true 
      },
      include: {
        districts: {
          where: { active: true }
        },
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${adminUnits.length} admin units for locality ${localityId}`);
    res.json(adminUnits);
  } catch (error) {
    console.error('Error fetching admin units:', error);
    res.status(500).json({ error: 'Failed to fetch admin units' });
  }
};

// Get districts by admin unit
exports.getDistrictsByAdminUnit = async (req, res) => {
  try {
    const { adminUnitId } = req.params;
    const adminUser = req.user;
    
    // First, get the admin unit to check its locality and region
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId },
      include: {
        locality: { select: { regionId: true } }
      }
    });
    
    if (!adminUnit) {
      return res.status(404).json({ error: 'Admin unit not found' });
    }
    
    // Check if user has access to this admin unit's region or locality
    if (adminUser.adminLevel !== 'ADMIN' && 
        adminUser.adminLevel !== 'GENERAL_SECRETARIAT' && 
        adminUser.regionId !== adminUnit.locality.regionId &&
        adminUser.localityId !== adminUnit.localityId &&
        adminUser.adminUnitId !== adminUnitId) {
      console.log('Access denied to districts for user:', {
        userId: adminUser.id,
        userRegion: adminUser.regionId,
        userLocality: adminUser.localityId,
        userAdminUnit: adminUser.adminUnitId,
        requestedAdminUnit: adminUnitId,
        adminUnitLocality: adminUnit.localityId,
        adminUnitRegion: adminUnit.locality.regionId
      });
      return res.status(403).json({ error: 'Access denied to this admin unit' });
    }
    
    console.log('User accessing districts for admin unit:', adminUnitId);
    
    const districts = await prisma.district.findMany({
      where: { 
        adminUnitId,
        active: true 
      },
      include: {
        admin: {
          include: { profile: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`Found ${districts.length} districts for admin unit ${adminUnitId}`);
    res.json(districts);
  } catch (error) {
    console.error('Error fetching districts:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
};

// Create new region
exports.createRegion = async (req, res) => {
  try {
    const { name, code, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Region name is required' });
    }
    
    // Check if code already exists
    if (code) {
      const existing = await prisma.region.findUnique({
        where: { code }
      });
      if (existing) {
        return res.status(400).json({ error: 'Region code already exists' });
      }
    }
    
    const region = await prisma.region.create({
      data: {
        name,
        code,
        description,
        active: true
      }
    });
    
    res.status(201).json(region);
  } catch (error) {
    console.error('Error creating region:', error);
    res.status(500).json({ error: 'Failed to create region' });
  }
};

// Create new locality
exports.createLocality = async (req, res) => {
  try {
    const { name, code, description, regionId } = req.body;
    
    console.log('Creating locality with data:', { name, code, description, regionId });
    
    if (!name || !regionId) {
      console.log('Validation failed: missing required fields', { name: !!name, regionId: !!regionId });
      return res.status(400).json({ error: 'Locality name and region are required' });
    }
    
    // Verify region exists
    const region = await prisma.region.findUnique({
      where: { id: regionId }
    });
    if (!region) {
      return res.status(400).json({ error: 'Region not found' });
    }
    
    // Check if code already exists
    if (code) {
      const existing = await prisma.locality.findUnique({
        where: { code }
      });
      if (existing) {
        return res.status(400).json({ error: 'Locality code already exists' });
      }
    }
    
    const locality = await prisma.locality.create({
      data: {
        name,
        code,
        description,
        regionId,
        active: true
      },
      include: {
        region: true
      }
    });
    
    res.status(201).json(locality);
  } catch (error) {
    console.error('Error creating locality:', error);
    res.status(500).json({ error: 'Failed to create locality' });
  }
};

// Create new admin unit
exports.createAdminUnit = async (req, res) => {
  try {
    const { name, code, description, localityId } = req.body;
    
    console.log('Creating admin unit with data:', { name, code, description, localityId });
    
    if (!name || !localityId) {
      console.log('Validation failed: missing required fields', { name: !!name, localityId: !!localityId });
      return res.status(400).json({ error: 'Admin unit name and locality are required' });
    }
    
    // Verify locality exists
    const locality = await prisma.locality.findUnique({
      where: { id: localityId }
    });
    if (!locality) {
      return res.status(400).json({ error: 'Locality not found' });
    }
    
    // Check if code already exists
    if (code) {
      const existing = await prisma.adminUnit.findUnique({
        where: { code }
      });
      if (existing) {
        return res.status(400).json({ error: 'Admin unit code already exists' });
      }
    }
    
    const adminUnit = await prisma.adminUnit.create({
      data: {
        name,
        code,
        description,
        localityId,
        active: true
      },
      include: {
        locality: {
          include: { region: true }
        }
      }
    });
    
    res.status(201).json(adminUnit);
  } catch (error) {
    console.error('Error creating admin unit:', error);
    res.status(500).json({ error: 'Failed to create admin unit' });
  }
};

// Create new district
exports.createDistrict = async (req, res) => {
  try {
    const { name, code, description, adminUnitId } = req.body;
    
    console.log('Creating district with data:', { name, code, description, adminUnitId });
    
    if (!name || !adminUnitId) {
      console.log('Validation failed: missing required fields', { name: !!name, adminUnitId: !!adminUnitId });
      return res.status(400).json({ error: 'District name and admin unit are required' });
    }
    
    // Verify admin unit exists
    const adminUnit = await prisma.adminUnit.findUnique({
      where: { id: adminUnitId }
    });
    if (!adminUnit) {
      return res.status(400).json({ error: 'Admin unit not found' });
    }
    
    // Check if code already exists
    if (code) {
      const existing = await prisma.district.findUnique({
        where: { code }
      });
      if (existing) {
        return res.status(400).json({ error: 'District code already exists' });
      }
    }
    
    const district = await prisma.district.create({
      data: {
        name,
        code,
        description,
        adminUnitId,
        active: true
      },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: { region: true }
            }
          }
        }
      }
    });
    
    res.status(201).json(district);
  } catch (error) {
    console.error('Error creating district:', error);
    res.status(500).json({ error: 'Failed to create district' });
  }
};

// Update region
exports.updateRegion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, active } = req.body;
    
    // Check if code already exists (excluding current region)
    if (code) {
      const existing = await prisma.region.findFirst({
        where: { 
          code,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Region code already exists' });
      }
    }
    
    const region = await prisma.region.update({
      where: { id },
      data: {
        name,
        code,
        description,
        active
      }
    });
    
    res.json(region);
  } catch (error) {
    console.error('Error updating region:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Region not found' });
    }
    res.status(500).json({ error: 'Failed to update region' });
  }
};

// Update locality
exports.updateLocality = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, active, regionId } = req.body;
    
    // Check if code already exists (excluding current locality)
    if (code) {
      const existing = await prisma.locality.findFirst({
        where: { 
          code,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Locality code already exists' });
      }
    }
    
    const locality = await prisma.locality.update({
      where: { id },
      data: {
        name,
        code,
        description,
        active,
        regionId
      },
      include: {
        region: true
      }
    });
    
    res.json(locality);
  } catch (error) {
    console.error('Error updating locality:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Locality not found' });
    }
    res.status(500).json({ error: 'Failed to update locality' });
  }
};

// Update admin unit
exports.updateAdminUnit = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, active, localityId } = req.body;
    
    // Check if code already exists (excluding current admin unit)
    if (code) {
      const existing = await prisma.adminUnit.findFirst({
        where: { 
          code,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'Admin unit code already exists' });
      }
    }
    
    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: {
        name,
        code,
        description,
        active,
        localityId
      },
      include: {
        locality: {
          include: { region: true }
        }
      }
    });
    
    res.json(adminUnit);
  } catch (error) {
    console.error('Error updating admin unit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Admin unit not found' });
    }
    res.status(500).json({ error: 'Failed to update admin unit' });
  }
};

// Update district
exports.updateDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, active, adminUnitId } = req.body;
    
    // Check if code already exists (excluding current district)
    if (code) {
      const existing = await prisma.district.findFirst({
        where: { 
          code,
          id: { not: id }
        }
      });
      if (existing) {
        return res.status(400).json({ error: 'District code already exists' });
      }
    }
    
    const district = await prisma.district.update({
      where: { id },
      data: {
        name,
        code,
        description,
        active,
        adminUnitId
      },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: { region: true }
            }
          }
        }
      }
    });
    
    res.json(district);
  } catch (error) {
    console.error('Error updating district:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    res.status(500).json({ error: 'Failed to update district' });
  }
};

// Delete (deactivate) region
exports.deleteRegion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if region has localities
    const localitiesCount = await prisma.locality.count({
      where: { regionId: id, active: true }
    });
    
    if (localitiesCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete region with active localities. Please deactivate all localities first.' 
      });
    }
    
    const region = await prisma.region.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'Region deactivated successfully', region });
  } catch (error) {
    console.error('Error deleting region:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Region not found' });
    }
    res.status(500).json({ error: 'Failed to delete region' });
  }
};

// Delete (deactivate) locality
exports.deleteLocality = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if locality has admin units
    const adminUnitsCount = await prisma.adminUnit.count({
      where: { localityId: id, active: true }
    });
    
    if (adminUnitsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete locality with active admin units. Please deactivate all admin units first.' 
      });
    }
    
    const locality = await prisma.locality.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'Locality deactivated successfully', locality });
  } catch (error) {
    console.error('Error deleting locality:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Locality not found' });
    }
    res.status(500).json({ error: 'Failed to delete locality' });
  }
};

// Delete (deactivate) admin unit
exports.deleteAdminUnit = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if admin unit has districts
    const districtsCount = await prisma.district.count({
      where: { adminUnitId: id, active: true }
    });
    
    if (districtsCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete admin unit with active districts. Please deactivate all districts first.' 
      });
    }
    
    const adminUnit = await prisma.adminUnit.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'Admin unit deactivated successfully', adminUnit });
  } catch (error) {
    console.error('Error deleting admin unit:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Admin unit not found' });
    }
    res.status(500).json({ error: 'Failed to delete admin unit' });
  }
};

// Delete (deactivate) district
exports.deleteDistrict = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if district has users
    const usersCount = await prisma.user.count({
      where: { districtId: id }
    });
    
    if (usersCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete district with assigned users. Please reassign users first.' 
      });
    }
    
    const district = await prisma.district.update({
      where: { id },
      data: { active: false }
    });
    
    res.json({ message: 'District deactivated successfully', district });
  } catch (error) {
    console.error('Error deleting district:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'District not found' });
    }
    res.status(500).json({ error: 'Failed to delete district' });
  }
};

// Get hierarchy statistics
exports.getHierarchyStats = async (req, res) => {
  try {
    const stats = {
      counts: {
        regions: await prisma.region.count({ where: { active: true } }),
        localities: await prisma.locality.count({ where: { active: true } }),
        adminUnits: await prisma.adminUnit.count({ where: { active: true } }),
        districts: await prisma.district.count({ where: { active: true } }),
        users: await prisma.user.count()
      },
      totalUsers: await prisma.user.count(),
      usersWithHierarchy: await prisma.user.count({
        where: {
          OR: [
            { regionId: { not: null } },
            { localityId: { not: null } },
            { adminUnitId: { not: null } },
            { districtId: { not: null } }
          ]
        }
      })
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching hierarchy stats:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy statistics' });
  }
};

// Get full hierarchy tree
exports.getHierarchyTree = async (req, res) => {
  try {
    const adminUser = req.user; // Get the admin user with hierarchy info
    let whereClause = { active: true };
    
    // Apply hierarchical access control based on admin level
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // Admin and General Secretariat can see all regions
          break;
          
        case 'REGION':
        case 'LOCALITY':
        case 'ADMIN_UNIT':
        case 'DISTRICT':
          // These levels can only see their region
          whereClause.id = regionId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          if (regionId) whereClause.id = regionId;
      }
    }
    
    const tree = await prisma.region.findMany({
      where: whereClause,
      include: {
        localities: {
          where: { active: true },
          include: {
            adminUnits: {
              where: { active: true },
              include: {
                districts: {
                  where: { active: true },
                  include: {
                    _count: {
                      select: { users: true }
                    }
                  }
                },
                _count: {
                  select: { districts: true, users: true }
                }
              }
            },
            _count: {
              select: { adminUnits: true, users: true }
            }
          }
        },
        _count: {
          select: { localities: true, users: true }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(tree);
  } catch (error) {
    console.error('Error fetching hierarchy tree:', error);
    res.status(500).json({ error: 'Failed to fetch hierarchy tree' });
  }
};
