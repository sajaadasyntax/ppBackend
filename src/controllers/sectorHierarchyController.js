const sectorHierarchyService = require('../services/sectorHierarchyService');

// ===== SECTOR NATIONAL LEVEL =====

async function getAllSectorNationalLevels(req, res, next) {
  try {
    const { expatriateRegionId } = req.query;
    const levels = await sectorHierarchyService.getAllSectorNationalLevels(expatriateRegionId);
    res.json(levels);
  } catch (error) {
    next(error);
  }
}

async function getSectorNationalLevelById(req, res, next) {
  try {
    const { id } = req.params;
    const level = await sectorHierarchyService.getSectorNationalLevelById(id);
    
    if (!level) {
      return res.status(404).json({ error: 'Sector national level not found' });
    }
    
    res.json(level);
  } catch (error) {
    next(error);
  }
}

async function createSectorNationalLevel(req, res, next) {
  try {
    const level = await sectorHierarchyService.createSectorNationalLevel(req.body);
    res.status(201).json(level);
  } catch (error) {
    next(error);
  }
}

async function updateSectorNationalLevel(req, res, next) {
  try {
    const { id } = req.params;
    const level = await sectorHierarchyService.updateSectorNationalLevel(id, req.body);
    res.json(level);
  } catch (error) {
    next(error);
  }
}

async function deleteSectorNationalLevel(req, res, next) {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorNationalLevel(id);
    res.json({ message: 'Sector national level deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ===== SECTOR REGION =====

async function getAllSectorRegions(req, res, next) {
  try {
    const { sectorNationalLevelId, expatriateRegionId } = req.query;
    const regions = await sectorHierarchyService.getAllSectorRegions(
      sectorNationalLevelId,
      expatriateRegionId
    );
    res.json(regions);
  } catch (error) {
    next(error);
  }
}

async function getSectorRegionById(req, res, next) {
  try {
    const { id } = req.params;
    const region = await sectorHierarchyService.getSectorRegionById(id);
    
    if (!region) {
      return res.status(404).json({ error: 'Sector region not found' });
    }
    
    res.json(region);
  } catch (error) {
    next(error);
  }
}

async function createSectorRegion(req, res, next) {
  try {
    const region = await sectorHierarchyService.createSectorRegion(req.body);
    res.status(201).json(region);
  } catch (error) {
    next(error);
  }
}

async function updateSectorRegion(req, res, next) {
  try {
    const { id } = req.params;
    const region = await sectorHierarchyService.updateSectorRegion(id, req.body);
    res.json(region);
  } catch (error) {
    next(error);
  }
}

async function deleteSectorRegion(req, res, next) {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorRegion(id);
    res.json({ message: 'Sector region deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ===== SECTOR LOCALITY =====

async function getAllSectorLocalities(req, res, next) {
  try {
    const { sectorRegionId, expatriateRegionId } = req.query;
    const localities = await sectorHierarchyService.getAllSectorLocalities(
      sectorRegionId,
      expatriateRegionId
    );
    res.json(localities);
  } catch (error) {
    next(error);
  }
}

async function getSectorLocalityById(req, res, next) {
  try {
    const { id } = req.params;
    const locality = await sectorHierarchyService.getSectorLocalityById(id);
    
    if (!locality) {
      return res.status(404).json({ error: 'Sector locality not found' });
    }
    
    res.json(locality);
  } catch (error) {
    next(error);
  }
}

async function createSectorLocality(req, res, next) {
  try {
    const locality = await sectorHierarchyService.createSectorLocality(req.body);
    res.status(201).json(locality);
  } catch (error) {
    next(error);
  }
}

async function updateSectorLocality(req, res, next) {
  try {
    const { id } = req.params;
    const locality = await sectorHierarchyService.updateSectorLocality(id, req.body);
    res.json(locality);
  } catch (error) {
    next(error);
  }
}

async function deleteSectorLocality(req, res, next) {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorLocality(id);
    res.json({ message: 'Sector locality deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ===== SECTOR ADMIN UNIT =====

async function getAllSectorAdminUnits(req, res, next) {
  try {
    const { sectorLocalityId, expatriateRegionId } = req.query;
    const adminUnits = await sectorHierarchyService.getAllSectorAdminUnits(
      sectorLocalityId,
      expatriateRegionId
    );
    res.json(adminUnits);
  } catch (error) {
    next(error);
  }
}

async function getSectorAdminUnitById(req, res, next) {
  try {
    const { id } = req.params;
    const adminUnit = await sectorHierarchyService.getSectorAdminUnitById(id);
    
    if (!adminUnit) {
      return res.status(404).json({ error: 'Sector admin unit not found' });
    }
    
    res.json(adminUnit);
  } catch (error) {
    next(error);
  }
}

async function createSectorAdminUnit(req, res, next) {
  try {
    const adminUnit = await sectorHierarchyService.createSectorAdminUnit(req.body);
    res.status(201).json(adminUnit);
  } catch (error) {
    next(error);
  }
}

async function updateSectorAdminUnit(req, res, next) {
  try {
    const { id } = req.params;
    const adminUnit = await sectorHierarchyService.updateSectorAdminUnit(id, req.body);
    res.json(adminUnit);
  } catch (error) {
    next(error);
  }
}

async function deleteSectorAdminUnit(req, res, next) {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorAdminUnit(id);
    res.json({ message: 'Sector admin unit deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ===== SECTOR DISTRICT =====

async function getAllSectorDistricts(req, res, next) {
  try {
    const { sectorAdminUnitId, expatriateRegionId } = req.query;
    const districts = await sectorHierarchyService.getAllSectorDistricts(
      sectorAdminUnitId,
      expatriateRegionId
    );
    res.json(districts);
  } catch (error) {
    next(error);
  }
}

async function getSectorDistrictById(req, res, next) {
  try {
    const { id } = req.params;
    const district = await sectorHierarchyService.getSectorDistrictById(id);
    
    if (!district) {
      return res.status(404).json({ error: 'Sector district not found' });
    }
    
    res.json(district);
  } catch (error) {
    next(error);
  }
}

async function createSectorDistrict(req, res, next) {
  try {
    const district = await sectorHierarchyService.createSectorDistrict(req.body);
    res.status(201).json(district);
  } catch (error) {
    next(error);
  }
}

async function updateSectorDistrict(req, res, next) {
  try {
    const { id } = req.params;
    const district = await sectorHierarchyService.updateSectorDistrict(id, req.body);
    res.json(district);
  } catch (error) {
    next(error);
  }
}

async function deleteSectorDistrict(req, res, next) {
  try {
    const { id } = req.params;
    await sectorHierarchyService.deleteSectorDistrict(id);
    res.json({ message: 'Sector district deleted successfully' });
  } catch (error) {
    next(error);
  }
}

// ===== FULL HIERARCHY =====

async function getFullSectorHierarchy(req, res, next) {
  try {
    const { expatriateRegionId } = req.query;
    const hierarchy = await sectorHierarchyService.getFullSectorHierarchy(expatriateRegionId);
    res.json(hierarchy);
  } catch (error) {
    next(error);
  }
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

