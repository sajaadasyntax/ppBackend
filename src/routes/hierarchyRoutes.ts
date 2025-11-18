import express, { Router } from 'express';
import * as hierarchyController from '../controllers/hierarchyController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router: Router = express.Router();

// Middleware to ensure only authenticated users can access these routes
router.use(authenticate);

// National Level routes
router.get('/national-levels', hierarchyController.getNationalLevels);
router.get('/national-levels/:id', hierarchyController.getNationalLevelById);
router.post('/national-levels', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.createNationalLevel);
router.put('/national-levels/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.updateNationalLevel);
router.delete('/national-levels/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.deleteNationalLevel);

// Region routes
router.get('/regions', hierarchyController.getRegions);
router.get('/regions/:id', hierarchyController.getRegionById);
router.post('/regions', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.createRegion);
router.put('/regions/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.updateRegion);
router.delete('/regions/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.deleteRegion);

// Locality routes
router.get('/regions/:regionId/localities', hierarchyController.getLocalitiesByRegion);
router.post('/regions/:regionId/localities', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.createLocality);
router.get('/localities/:id', hierarchyController.getLocalityById);
router.post('/localities', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.createLocality);
router.put('/localities/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.updateLocality);
router.delete('/localities/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.deleteLocality);

// Administrative Unit routes
router.get('/localities/:localityId/admin-units', hierarchyController.getAdminUnitsByLocality);
router.post('/localities/:localityId/admin-units', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.createAdminUnit);
router.get('/admin-units/:id', hierarchyController.getAdminUnitById);
router.post('/admin-units', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.createAdminUnit);
router.put('/admin-units/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.updateAdminUnit);
router.delete('/admin-units/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.deleteAdminUnit);

// District routes
router.get('/admin-units/:adminUnitId/districts', hierarchyController.getDistrictsByAdminUnit);
router.post('/admin-units/:adminUnitId/districts', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.createDistrict);
router.get('/districts/:id', hierarchyController.getDistrictById);
router.post('/districts', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.createDistrict);
router.put('/districts/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.updateDistrict);
router.delete('/districts/:id', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.deleteDistrict);

// Full hierarchy route
router.get('/full-hierarchy', hierarchyController.getFullHierarchy);

// Get users by hierarchy level
router.get('/users', hierarchyController.getUsersByHierarchyLevel);

export default router;

