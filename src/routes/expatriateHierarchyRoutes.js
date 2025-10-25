const express = require('express');
const router = express.Router();
const expatriateHierarchyController = require('../controllers/expatriateHierarchyController');
const { authenticate } = require('../middlewares/auth');

// All routes require authentication
router.use(authenticate);

// Expatriate region routes
router.get('/expatriate-regions', expatriateHierarchyController.getAllExpatriateRegions);
router.get('/expatriate-regions/:id', expatriateHierarchyController.getExpatriateRegionById);
router.post('/expatriate-regions', expatriateHierarchyController.createExpatriateRegion);
router.put('/expatriate-regions/:id', expatriateHierarchyController.updateExpatriateRegion);
router.delete('/expatriate-regions/:id', expatriateHierarchyController.deleteExpatriateRegion);

// User management routes
router.get('/expatriate-regions/:id/users', expatriateHierarchyController.getUsersByExpatriateRegion);
router.put('/users/:userId/expatriate-region', expatriateHierarchyController.assignUserToExpatriateRegion);

module.exports = router;

