const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, restrictToAdminRole } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(restrictToAdminRole);

// Create admin account with hierarchical validation
router.post('/create-admin', adminController.createAdminAccount);

// Get available admin levels that the creator can create
router.get('/available-levels', adminController.getAvailableAdminLevels);

// Get hierarchy options for admin creation based on creator's level
router.get('/hierarchy-options', adminController.getHierarchyOptions);

module.exports = router;
