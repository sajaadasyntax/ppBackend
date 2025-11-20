import express, { Router } from 'express';
import * as expatriateHierarchyController from '../controllers/expatriateHierarchyController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();
const adminOnly = authorize(['ADMIN', 'GENERAL_SECRETARIAT']);

// All routes require authentication
router.use(authenticate);

// Expatriate region routes
router.get('/expatriate-regions', expatriateHierarchyController.getAllExpatriateRegions);
router.get('/expatriate-regions/:id', expatriateHierarchyController.getExpatriateRegionById);
router.post('/expatriate-regions', adminOnly, expatriateHierarchyController.createExpatriateRegion);
router.put('/expatriate-regions/:id', adminOnly, expatriateHierarchyController.updateExpatriateRegion);
router.delete('/expatriate-regions/:id', adminOnly, expatriateHierarchyController.deleteExpatriateRegion);

// User management routes
router.get('/expatriate-regions/:id/users', adminOnly, expatriateHierarchyController.getUsersByExpatriateRegion);
router.put('/users/:userId/expatriate-region', adminOnly, expatriateHierarchyController.assignUserToExpatriateRegion);

export default router;

