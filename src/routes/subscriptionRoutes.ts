import express, { Router, Request } from 'express';
import multer from 'multer';
import * as subscriptionController from '../controllers/subscriptionController';
import { authenticate } from '../middlewares/auth';

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

// Subscription plan routes
router.get('/plans', subscriptionController.getSubscriptionPlans);
router.get('/plans/:id', subscriptionController.getSubscriptionPlanById);
router.post('/plans', subscriptionController.createSubscriptionPlan);
router.patch('/plans/:id/approve', subscriptionController.approveSubscriptionPlan);
router.put('/plans/:id', subscriptionController.updateSubscriptionPlan);
router.delete('/plans/:id', subscriptionController.deleteSubscriptionPlan);

// Subscription routes
router.get('/', subscriptionController.getSubscriptions);
router.get('/stats', subscriptionController.getSubscriptionStats);
router.get('/check-expired', subscriptionController.checkExpiredSubscriptions);
router.get('/:id', subscriptionController.getSubscriptionById);
router.post('/', subscriptionController.createSubscription);
router.put('/:id', subscriptionController.updateSubscription);
router.patch('/:id/renew', subscriptionController.renewSubscription);
router.post('/:id/receipt', upload.single('receipt'), subscriptionController.uploadReceipt);
router.delete('/:id', subscriptionController.deleteSubscription);

export default router;

