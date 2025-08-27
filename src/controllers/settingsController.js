const settingsService = require('../services/settingsService');

// Get all settings
exports.getAllSettings = async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get setting by key
exports.getSettingByKey = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSettingByKey(key);

    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Get setting by key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upsert setting
exports.upsertSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ error: 'Value is required' });
    }

    const setting = await settingsService.upsertSetting(key, String(value));
    res.json({ key: setting.key, value: setting.value });
  } catch (error) {
    console.error('Upsert setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete setting
exports.deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    
    // Check if setting exists
    const setting = await settingsService.getSettingByKey(key);
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    await settingsService.deleteSetting(key);
    res.status(204).end();
  } catch (error) {
    console.error('Delete setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk update settings
exports.bulkUpdateSettings = async (req, res) => {
  try {
    const settings = req.body;

    if (!settings || typeof settings !== 'object' || Object.keys(settings).length === 0) {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    // Convert all values to strings
    const stringSettings = Object.entries(settings).reduce((acc, [key, value]) => {
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