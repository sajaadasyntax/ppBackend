import express, { Router, Request, Response } from 'express';
import * as settingsController from '../controllers/settingsController';
import * as settingsService from '../services/settingsService';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// Public routes
router.get('/public', async (_req: Request, res: Response) => {
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

export default router;

