import express, { Router, Request } from 'express';
import multer from 'multer';
import * as subscriptionController from '../controllers/subscriptionController';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// All routes require authentication
router.use(authenticate);

// Subscription plan routes - admins can manage, users can view
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.get('/plans/:id', subscriptionController.getSubscriptionPlanById);
router.post('/plans', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.createSubscriptionPlan);
router.patch('/plans/:id/approve', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), subscriptionController.approveSubscriptionPlan);
router.put('/plans/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.updateSubscriptionPlan);
router.delete('/plans/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.deleteSubscriptionPlan);

// Subscription routes - admins can manage, users can view their own
router.get('/', subscriptionController.getSubscriptions);
router.get('/stats', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.getSubscriptionStats);
router.get('/check-expired', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), subscriptionController.checkExpiredSubscriptions);
router.get('/:id', subscriptionController.getSubscriptionById);
router.post('/', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.createSubscription);
router.put('/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.updateSubscription);
router.patch('/:id/renew', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), subscriptionController.renewSubscription);
router.post('/:id/receipt', upload.single('receipt'), subscriptionController.uploadReceipt);
router.delete('/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT']), subscriptionController.deleteSubscription);

export default router;

