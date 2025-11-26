import express, { Router } from 'express';
import * as sectorHierarchyController from '../controllers/sectorHierarchyController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();
const adminOnly = authorize(['ADMIN', 'GENERAL_SECRETARIAT']);

// All routes require authentication
router.use(authenticate);

// Sector National Level routes
router.get('/sector-national-levels', sectorHierarchyController.getAllSectorNationalLevels);
router.get('/sector-national-levels/:id', sectorHierarchyController.getSectorNationalLevelById);
router.post('/sector-national-levels', adminOnly, sectorHierarchyController.createSectorNationalLevel);
router.put('/sector-national-levels/:id', adminOnly, sectorHierarchyController.updateSectorNationalLevel);
router.delete('/sector-national-levels/:id', adminOnly, sectorHierarchyController.deleteSectorNationalLevel);

// Sector Region routes
router.get('/sector-regions', sectorHierarchyController.getAllSectorRegions);
router.get('/sector-regions/:id', sectorHierarchyController.getSectorRegionById);
router.post('/sector-regions', adminOnly, sectorHierarchyController.createSectorRegion);
router.put('/sector-regions/:id', adminOnly, sectorHierarchyController.updateSectorRegion);
router.delete('/sector-regions/:id', adminOnly, sectorHierarchyController.deleteSectorRegion);

// Sector Locality routes
router.get('/sector-localities', sectorHierarchyController.getAllSectorLocalities);
router.get('/sector-localities/:id', sectorHierarchyController.getSectorLocalityById);
router.post('/sector-localities', adminOnly, sectorHierarchyController.createSectorLocality);
router.put('/sector-localities/:id', adminOnly, sectorHierarchyController.updateSectorLocality);
router.delete('/sector-localities/:id', adminOnly, sectorHierarchyController.deleteSectorLocality);

// Sector Admin Unit routes
router.get('/sector-admin-units', sectorHierarchyController.getAllSectorAdminUnits);
router.get('/sector-admin-units/:id', sectorHierarchyController.getSectorAdminUnitById);
router.post('/sector-admin-units', adminOnly, sectorHierarchyController.createSectorAdminUnit);
router.put('/sector-admin-units/:id', adminOnly, sectorHierarchyController.updateSectorAdminUnit);
router.delete('/sector-admin-units/:id', adminOnly, sectorHierarchyController.deleteSectorAdminUnit);

// Sector District routes
router.get('/sector-districts', sectorHierarchyController.getAllSectorDistricts);
router.get('/sector-districts/:id', sectorHierarchyController.getSectorDistrictById);
router.post('/sector-districts', adminOnly, sectorHierarchyController.createSectorDistrict);
router.put('/sector-districts/:id', adminOnly, sectorHierarchyController.updateSectorDistrict);
router.delete('/sector-districts/:id', adminOnly, sectorHierarchyController.deleteSectorDistrict);

// Full hierarchy route
router.get('/full-hierarchy', sectorHierarchyController.getFullSectorHierarchy);

// Sector members management routes
// :level can be: national, region, locality, adminUnit, district
router.get('/members/:level/:sectorId', sectorHierarchyController.getSectorMembers);
router.get('/available-users/:level/:sectorId', sectorHierarchyController.getAvailableUsersForSector);
router.post('/members/:level/:sectorId', adminOnly, sectorHierarchyController.addUserToSector);
router.delete('/members/:level/:sectorId/:userId', adminOnly, sectorHierarchyController.removeUserFromSector);

export default router;

