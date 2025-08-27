const express = require('express');
const adminHierarchyController = require('../controllers/adminHierarchyController');
const { authenticate, authorizeRoles } = require('../middlewares/auth');

const router = express.Router();

// Middleware to ensure only authenticated users can access these routes
router.use(authenticate);

// Restrict all routes to ADMIN and GENERAL_SECRETARIAT roles
router.use(authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']));

// Hierarchy overview for admin dashboard
router.get('/overview', adminHierarchyController.getHierarchyOverview);

// Bulk operations for regions
router.post('/regions/bulk', adminHierarchyController.bulkCreateRegions);

// Bulk operations for localities
router.post('/localities/bulk', adminHierarchyController.bulkCreateLocalities);

// Bulk operations for admin units
router.post('/admin-units/bulk', adminHierarchyController.bulkCreateAdminUnits);

// Bulk operations for districts
router.post('/districts/bulk', adminHierarchyController.bulkCreateDistricts);

// Bulk import entire hierarchy from CSV/JSON
router.post('/import', adminHierarchyController.bulkImportHierarchy);

module.exports = router;
