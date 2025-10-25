const express = require('express');
const router = express.Router();
const sectorHierarchyController = require('../controllers/sectorHierarchyController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Sector National Level routes
router.get('/sector-national-levels', sectorHierarchyController.getAllSectorNationalLevels);
router.get('/sector-national-levels/:id', sectorHierarchyController.getSectorNationalLevelById);
router.post('/sector-national-levels', sectorHierarchyController.createSectorNationalLevel);
router.put('/sector-national-levels/:id', sectorHierarchyController.updateSectorNationalLevel);
router.delete('/sector-national-levels/:id', sectorHierarchyController.deleteSectorNationalLevel);

// Sector Region routes
router.get('/sector-regions', sectorHierarchyController.getAllSectorRegions);
router.get('/sector-regions/:id', sectorHierarchyController.getSectorRegionById);
router.post('/sector-regions', sectorHierarchyController.createSectorRegion);
router.put('/sector-regions/:id', sectorHierarchyController.updateSectorRegion);
router.delete('/sector-regions/:id', sectorHierarchyController.deleteSectorRegion);

// Sector Locality routes
router.get('/sector-localities', sectorHierarchyController.getAllSectorLocalities);
router.get('/sector-localities/:id', sectorHierarchyController.getSectorLocalityById);
router.post('/sector-localities', sectorHierarchyController.createSectorLocality);
router.put('/sector-localities/:id', sectorHierarchyController.updateSectorLocality);
router.delete('/sector-localities/:id', sectorHierarchyController.deleteSectorLocality);

// Sector Admin Unit routes
router.get('/sector-admin-units', sectorHierarchyController.getAllSectorAdminUnits);
router.get('/sector-admin-units/:id', sectorHierarchyController.getSectorAdminUnitById);
router.post('/sector-admin-units', sectorHierarchyController.createSectorAdminUnit);
router.put('/sector-admin-units/:id', sectorHierarchyController.updateSectorAdminUnit);
router.delete('/sector-admin-units/:id', sectorHierarchyController.deleteSectorAdminUnit);

// Sector District routes
router.get('/sector-districts', sectorHierarchyController.getAllSectorDistricts);
router.get('/sector-districts/:id', sectorHierarchyController.getSectorDistrictById);
router.post('/sector-districts', sectorHierarchyController.createSectorDistrict);
router.put('/sector-districts/:id', sectorHierarchyController.updateSectorDistrict);
router.delete('/sector-districts/:id', sectorHierarchyController.deleteSectorDistrict);

// Full hierarchy route
router.get('/full-hierarchy', sectorHierarchyController.getFullSectorHierarchy);

module.exports = router;

