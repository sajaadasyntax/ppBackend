import { Request, Response } from 'express';
import * as settingsService from '../services/settingsService';

// Get all settings
export const getAllSettings = async (_req: Request, res: Response): Promise<void> => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get setting by key
export const getSettingByKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSettingByKey(key);

    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upsert setting
export const upsertSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      res.status(400).json({ error: 'Value is required' });
      return;
    }

    const setting = await settingsService.upsertSetting(key, String(value));
    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Upsert setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete setting
export const deleteSetting = async (req: Request, res: Response): Promise<void> => {
  try {
    const { key } = req.params;
    
    // Check if setting exists
    const setting = await settingsService.getSettingByKey(key);
    if (!setting) {
      res.status(404).json({ error: 'Setting not found' });
      return;
    }

    await settingsService.deleteSetting(key);
    res.status(204).end();
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk update settings
export const bulkUpdateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      res.status(400).json({ error: 'Settings object is required' });
      return;
    }

    // Convert all values to strings
    const stringSettings = Object.entries(settings).reduce((acc: Record<string, string>, [key, value]) => {
      acc[key] = String(value);
      return acc;
    }, {});

    await settingsService.bulkUpsertSettings(stringSettings);
    
    const updatedSettings = await settingsService.getAllSettings();
    res.json(updatedSettings);
  } catch (error) {
    console.error('Bulk update settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

