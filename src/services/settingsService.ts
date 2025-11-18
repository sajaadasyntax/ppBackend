import prisma from '../utils/prisma';

// Get a setting by key
export async function getSettingByKey(key: string): Promise<any> {
  return prisma.settings.findUnique({
    where: { key }
  });
}

// Get all settings
export async function getAllSettings(): Promise<any> {
  const settings = await prisma.settings.findMany();
  
  // Convert array to object with key-value pairs
  return settings.reduce((acc: any, setting: any) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {});
}

// Upsert a setting (create or update)
export async function upsertSetting(key: string, value: string): Promise<any> {
  return prisma.settings.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  });
}

// Delete a setting
export async function deleteSetting(key: string): Promise<any> {
  return prisma.settings.delete({
    where: { key }
  });
}

// Bulk upsert settings
export async function bulkUpsertSettings(settings: Record<string, string>): Promise<any> {
  const operations = Object.entries(settings).map(([key, value]) => {
    return prisma.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value }
    });
  });

  return prisma.$transaction(operations);
}

export default {
  getSettingByKey,
  getAllSettings,
  upsertSetting,
  deleteSetting,
  bulkUpsertSettings
};

