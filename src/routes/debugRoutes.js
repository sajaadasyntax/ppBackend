const express = require('express');
const debugController = require('../controllers/debugController');
const { authenticate, authorize } = require('../middlewares/auth');
const multer = require('multer');
const upload = multer(); // For parsing multipart/form-data

const router = express.Router();

// Public debug route
router.get('/regions', debugController.getRegions);

// Test bulletin creation
router.post('/test-bulletin', debugController.testBulletinCreate);

// Protected routes
router.use(authenticate);

// Debug route - log request
router.post('/debug-request', upload.single('file'), debugController.debugRequest);
router.get('/debug-request', debugController.debugRequest);

module.exports = router;
