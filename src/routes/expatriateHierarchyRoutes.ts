import express, { Router } from 'express';
import * as expatriateHierarchyController from '../controllers/expatriateHierarchyController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// Admin levels that can manage expatriate hierarchy
const adminOnly = authorize(['ADMIN', 'GENERAL_SECRETARIAT']);
const expatriateAdmins = authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'EXPATRIATE_GENERAL', 'EXPATRIATE_REGION']);

// All routes require authentication
router.use(authenticate);

// Expatriate region routes
router.get('/expatriate-regions', expatriateHierarchyController.getAllExpatriateRegions);
router.get('/expatriate-regions/:id', expatriateHierarchyController.getExpatriateRegionById);
router.post('/expatriate-regions', adminOnly, expatriateHierarchyController.createExpatriateRegion);
router.put('/expatriate-regions/:id', expatriateAdmins, expatriateHierarchyController.updateExpatriateRegion);
router.delete('/expatriate-regions/:id', adminOnly, expatriateHierarchyController.deleteExpatriateRegion);

// User management routes - allow expatriate admins to manage users in their regions
router.get('/expatriate-regions/:id/users', expatriateAdmins, expatriateHierarchyController.getUsersByExpatriateRegion);
router.put('/users/:userId/expatriate-region', expatriateAdmins, expatriateHierarchyController.assignUserToExpatriateRegion);

export default router;

