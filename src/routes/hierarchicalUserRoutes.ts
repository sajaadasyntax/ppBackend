import express, { Router } from 'express';
import * as hierarchicalUserController from '../controllers/hierarchicalUserController';
import { authenticate } from '../middlewares/auth';
import { requireAdminLevel } from '../middlewares/hierarchicalAccess';

const router: Router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all manageable users (root endpoint for backwards compatibility)
router.get('/', hierarchicalUserController.getManageableUsers);

// Get users that the current admin can manage
router.get('/users', hierarchicalUserController.getManageableUsers);

// Get users by hierarchy level
router.get('/users/national-levels/:nationalLevelId/users', hierarchicalUserController.getUsersByNationalLevel);
router.get('/users/regions/:regionId/users', hierarchicalUserController.getUsersByRegion);
router.get('/users/localities/:localityId/users', hierarchicalUserController.getUsersByLocality);
router.get('/users/admin-units/:adminUnitId/users', hierarchicalUserController.getUsersByAdminUnit);
router.get('/users/districts/:districtId/users', hierarchicalUserController.getUsersByDistrict);

// Create user for specific hierarchy level
router.post('/users/national-levels/:nationalLevelId/users', hierarchicalUserController.createUserForNationalLevel);
router.post('/users/regions/:regionId/users', hierarchicalUserController.createUserForRegion);
router.post('/users/localities/:localityId/users', hierarchicalUserController.createUserForLocality);
router.post('/users/admin-units/:adminUnitId/users', hierarchicalUserController.createUserForAdminUnit);
router.post('/users/districts/:districtId/users', hierarchicalUserController.createUserForDistrict);

// Update user status
router.patch('/users/:userId/status', hierarchicalUserController.updateUserStatus);

// Get hierarchical statistics
router.get('/stats', hierarchicalUserController.getHierarchicalStats);

// Get admin's jurisdiction information
router.get('/jurisdiction', hierarchicalUserController.getJurisdictionInfo);

// Check if admin can manage a specific user
router.get('/users/:userId/access', hierarchicalUserController.checkUserAccess);

// Get content that the current admin can manage
router.get('/content/:contentType', hierarchicalUserController.getManageableContent);

// Check if admin can manage specific content
router.get('/content/:contentType/:contentId/access', hierarchicalUserController.checkContentAccess);

// Routes that require minimum admin levels
router.get('/users/district', requireAdminLevel('DISTRICT'), hierarchicalUserController.getManageableUsers);
router.get('/users/adminunit', requireAdminLevel('ADMIN_UNIT'), hierarchicalUserController.getManageableUsers);
router.get('/users/locality', requireAdminLevel('LOCALITY'), hierarchicalUserController.getManageableUsers);
router.get('/users/region', requireAdminLevel('REGION'), hierarchicalUserController.getManageableUsers);
router.get('/users/national-level', requireAdminLevel('NATIONAL_LEVEL'), hierarchicalUserController.getManageableUsers);

export default router;

