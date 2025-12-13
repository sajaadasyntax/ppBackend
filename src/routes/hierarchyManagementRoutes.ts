import express, { Router } from 'express';
import * as hierarchyController from '../controllers/hierarchyManagementController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Statistics and overview routes
router.get('/stats', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL']), hierarchyController.getHierarchyStats);
router.get('/tree', hierarchyController.getHierarchyTree);

// Region management routes (NATIONAL_LEVEL can manage regions in their national level)
router.get('/regions', hierarchyController.getRegions);
router.post('/regions', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL']), hierarchyController.createRegion);
router.put('/regions/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL']), hierarchyController.updateRegion);
router.delete('/regions/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL']), hierarchyController.deleteRegion);

// Locality management routes
router.get('/regions/:regionId/localities', hierarchyController.getLocalitiesByRegion);
router.post('/localities', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION']), hierarchyController.createLocality);
router.put('/localities/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION']), hierarchyController.updateLocality);
router.delete('/localities/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION']), hierarchyController.deleteLocality);

// Admin Unit management routes
router.get('/localities/:localityId/admin-units', hierarchyController.getAdminUnitsByLocality);
router.post('/admin-units', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY']), hierarchyController.createAdminUnit);
router.put('/admin-units/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY']), hierarchyController.updateAdminUnit);
router.delete('/admin-units/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY']), hierarchyController.deleteAdminUnit);

// District management routes
router.get('/admin-units/:adminUnitId/districts', hierarchyController.getDistrictsByAdminUnit);
router.post('/districts', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.createDistrict);
router.put('/districts/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.updateDistrict);
router.delete('/districts/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.deleteDistrict);

export default router;

