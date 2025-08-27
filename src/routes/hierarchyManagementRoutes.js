const express = require('express');
const hierarchyController = require('../controllers/hierarchyManagementController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Statistics and overview routes
router.get('/stats', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.getHierarchyStats);
router.get('/tree', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.getHierarchyTree);

// Region management routes
router.get('/regions', hierarchyController.getRegions);
router.post('/regions', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.createRegion);
router.put('/regions/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.updateRegion);
router.delete('/regions/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), hierarchyController.deleteRegion);

// Locality management routes
router.get('/regions/:regionId/localities', hierarchyController.getLocalitiesByRegion);
router.post('/localities', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.createLocality);
router.put('/localities/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.updateLocality);
router.delete('/localities/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION']), hierarchyController.deleteLocality);

// Admin Unit management routes
router.get('/localities/:localityId/admin-units', hierarchyController.getAdminUnitsByLocality);
router.post('/admin-units', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.createAdminUnit);
router.put('/admin-units/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.updateAdminUnit);
router.delete('/admin-units/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY']), hierarchyController.deleteAdminUnit);

// District management routes
router.get('/admin-units/:adminUnitId/districts', hierarchyController.getDistrictsByAdminUnit);
router.post('/districts', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.createDistrict);
router.put('/districts/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.updateDistrict);
router.delete('/districts/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT']), hierarchyController.deleteDistrict);

module.exports = router;
