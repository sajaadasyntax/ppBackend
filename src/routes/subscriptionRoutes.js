const express = require('express');
const router = express.Router();
const multer = require('multer');
const subscriptionController = require('../controllers/subscriptionController');
const { authenticate } = require('../middlewares/auth');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
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

module.exports = router;
