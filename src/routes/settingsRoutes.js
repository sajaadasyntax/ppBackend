const express = require('express');
const settingsController = require('../controllers/settingsController');
const settingsService = require('../services/settingsService');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes
router.get('/public', async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    
    // Filter for public settings only
    const publicSettings = {
      app_name: settings.app_name,
      theme: settings.theme,
      maintenance_mode: settings.maintenance_mode
    };
    
    res.json(publicSettings);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes - requires authentication and admin role
router.use(authenticate);
router.use(authorize(['ADMIN']));

// Settings routes - admin only
router.get('/', settingsController.getAllSettings);
router.get('/:key', settingsController.getSettingByKey);
router.put('/:key', settingsController.upsertSetting);
router.delete('/:key', settingsController.deleteSetting);
router.post('/bulk', settingsController.bulkUpdateSettings);

module.exports = router; 