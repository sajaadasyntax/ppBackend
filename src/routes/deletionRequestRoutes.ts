import express, { Router } from 'express';
import * as deletionRequestController from '../controllers/deletionRequestController';
import { authenticate, authorizeRoles } from '../middlewares/auth';

const router: Router = express.Router();

// Middleware to ensure only authenticated users can access these routes
router.use(authenticate);

// Get all deletion requests (root admin only)
router.get('/', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), deletionRequestController.getAllDeletionRequests);

// Create a deletion request (any admin)
router.post('/', deletionRequestController.createDeletionRequest);

// Approve a deletion request (root admin only)
router.post('/:id/approve', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), deletionRequestController.approveDeletionRequest);

// Reject a deletion request (root admin only)
router.post('/:id/reject', authorizeRoles(['ADMIN', 'GENERAL_SECRETARIAT']), deletionRequestController.rejectDeletionRequest);

export default router;

