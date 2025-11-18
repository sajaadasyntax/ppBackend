import express, { Router } from 'express';
import * as adminController from '../controllers/adminController';
import { authenticate, restrictToAdminRole } from '../middlewares/auth';

const router: Router = express.Router();

// All routes require authentication and admin role
router.use(authenticate);
router.use(restrictToAdminRole);

// Create admin account with hierarchical validation
router.post('/create-admin', adminController.createAdminAccount);

// Get available admin levels that the creator can create
router.get('/available-levels', adminController.getAvailableAdminLevels);

// Get hierarchy options for admin creation based on creator's level
router.get('/hierarchy-options', adminController.getHierarchyOptions);

export default router;

