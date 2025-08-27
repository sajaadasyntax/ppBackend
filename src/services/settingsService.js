const prisma = require('../utils/prisma');

// Get a setting by key
async function getSettingByKey(key) {
  return prisma.settings.findUnique({
    where: { key }
  });
}

// Get all settings
async function getAllSettings() {
  const settings = await prisma.settings.findMany();
  
  // Convert array to object with key-value pairs
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

// Upsert a setting (create or update)
async function upsertSetting(key, value) {
  return prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// Delete a setting
async function deleteSetting(key) {
  return prisma.settings.delete({
    where: { key }
  });
}

// Bulk upsert settings
async function bulkUpsertSettings(settings) {
  const operations = Object.entries(settings).map(([key, value]) => {
    return prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  });

  return prisma.$transaction(operations);
}

module.exports = {
  getSettingByKey,
  getAllSettings,
  upsertSetting,
  deleteSetting,
  bulkUpsertSettings
}; 