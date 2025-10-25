const expatriateHierarchyService = require('../services/expatriateHierarchyService');

/**
 * Get all expatriate regions
 */
async function getAllExpatriateRegions(req, res, next) {
  try {
    const regions = await expatriateHierarchyService.getAllExpatriateRegions();
    res.json(regions);
  } catch (error) {
    next(error);
  }
}

/**
 * Get expatriate region by ID
 */
async function getExpatriateRegionById(req, res, next) {
  try {
    const { id } = req.params;
    const region = await expatriateHierarchyService.getExpatriateRegionById(id);
    
    if (!region) {
      return res.status(404).json({ error: 'Expatriate region not found' });
    }
    
    res.json(region);
  } catch (error) {
    next(error);
  }
}

/**
 * Create new expatriate region
 */
async function createExpatriateRegion(req, res, next) {
  try {
    const region = await expatriateHierarchyService.createExpatriateRegion(req.body);
    res.status(201).json(region);
  } catch (error) {
    next(error);
  }
}

/**
 * Update expatriate region
 */
async function updateExpatriateRegion(req, res, next) {
  try {
    const { id } = req.params;
    const region = await expatriateHierarchyService.updateExpatriateRegion(id, req.body);
    res.json(region);
  } catch (error) {
    next(error);
  }
}

/**
 * Delete expatriate region
 */
async function deleteExpatriateRegion(req, res, next) {
  try {
    const { id } = req.params;
    await expatriateHierarchyService.deleteExpatriateRegion(id);
    res.json({ message: 'Expatriate region deleted successfully' });
  } catch (error) {
    next(error);
  }
}

/**
 * Get users by expatriate region
 */
async function getUsersByExpatriateRegion(req, res, next) {
  try {
    const { id } = req.params;
    const users = await expatriateHierarchyService.getUsersByExpatriateRegion(id);
    res.json(users);
  } catch (error) {
    next(error);
  }
}

/**
 * Assign user to expatriate region
 */
async function assignUserToExpatriateRegion(req, res, next) {
  try {
    const { userId } = req.params;
    const { expatriateRegionId } = req.body;
    
    const user = await expatriateHierarchyService.assignUserToExpatriateRegion(
      userId,
      expatriateRegionId
    );
    
    res.json(user);
  } catch (error) {
    next(error);
  }
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

