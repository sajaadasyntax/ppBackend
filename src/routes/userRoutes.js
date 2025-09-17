const express = require('express');
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
// Public signup for members (requires later admin activation)
router.post('/members/public-signup', userController.createMember);

// Protected routes
router.use(authenticate);

// User routes - requires authentication
router.get('/profile', userController.getUserProfile);

// Hierarchy selection routes for user creation
router.get('/hierarchy/regions', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.getRegionsForUserCreation);
router.get('/hierarchy/regions/:regionId/localities', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.getLocalitiesForUserCreation);
router.get('/hierarchy/localities/:localityId/admin-units', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.getAdminUnitsForUserCreation);
router.get('/hierarchy/admin-units/:adminUnitId/districts', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.getDistrictsForUserCreation);

// User hierarchy management routes
router.get('/:id/hierarchy-path', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.getUserHierarchyPath);
router.put('/:id/hierarchy', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.updateUserHierarchy);

// Admin routes - requires admin role
router.get('/', authorize(['ADMIN']), userController.getAllUsers);
router.get('/memberships', authorize(['ADMIN']), userController.getMemberships);
router.post('/members', authorize(['ADMIN']), userController.createMember);
router.get('/:id/details', authorize(['ADMIN']), userController.getMemberDetails);
router.get('/:id', authorize(['ADMIN']), userController.getUserById);
router.post('/', authorize(['ADMIN']), userController.createUser);
router.post('/with-hierarchy', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), userController.createUserWithHierarchy);
router.put('/:id', authorize(['ADMIN']), userController.updateUser);
router.patch('/:id/status', authorize(['ADMIN']), userController.updateMembershipStatus);
router.post('/:id/reset-password', authorize(['ADMIN']), userController.resetPassword);
router.delete('/:id', authorize(['ADMIN']), userController.deleteUser);

module.exports = router; 