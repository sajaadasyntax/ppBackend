import prisma from './prisma';
import { SectorType } from '@prisma/client';

// Fixed 4 sector types
const FIXED_SECTOR_TYPES: SectorType[] = ['SOCIAL', 'ECONOMIC', 'ORGANIZATIONAL', 'POLITICAL'];

const sectorTypeNames: Record<SectorType, string> = {
  SOCIAL: 'الاجتماعي',
  ECONOMIC: 'الاقتصادي',
  ORGANIZATIONAL: 'التنظيمي',
  POLITICAL: 'السياسي'
};

/**
 * Helper to encode source entity metadata in description field
 * This allows us to use ID-based lookups instead of fragile name matching
 */
function encodeSectorMetadata(sourceEntityId: string, sourceEntityType: string): string {
  return JSON.stringify({ sourceEntityId, sourceEntityType });
}

/**
 * Helper to find a sector by its source entity ID from description metadata
 */
async function findSectorBySourceId(
  sectorTable: 'sectorRegion' | 'sectorLocality' | 'sectorAdminUnit',
  sourceEntityId: string,
  sectorType: SectorType
): Promise<{ id: string } | null> {
  // Validate that the ID looks like a valid UUID to prevent injection
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(sourceEntityId)) {
    console.warn(`Invalid source entity ID format: ${sourceEntityId}`);
    return null;
  }
  
  const escapedId = sourceEntityId.replace(/"/g, '\\"');
  const metadataPattern = `"sourceEntityId":"${escapedId}"`;
  
  let sector: { id: string } | null = null;
  
  if (sectorTable === 'sectorRegion') {
    sector = await prisma.sectorRegion.findFirst({
      where: {
        sectorType,
        expatriateRegionId: null,
        description: { contains: metadataPattern }
      },
      select: { id: true }
    });
  } else if (sectorTable === 'sectorLocality') {
    sector = await prisma.sectorLocality.findFirst({
      where: {
        sectorType,
        expatriateRegionId: null,
        description: { contains: metadataPattern }
      },
      select: { id: true }
    });
  } else if (sectorTable === 'sectorAdminUnit') {
    sector = await prisma.sectorAdminUnit.findFirst({
      where: {
        sectorType,
        expatriateRegionId: null,
        description: { contains: metadataPattern }
      },
      select: { id: true }
    });
  }
  
  return sector;
}

/**
 * Automatically create sectors for a hierarchy level
 * This function creates the 4 standard sectors (SOCIAL, ECONOMIC, ORGANIZATIONAL, POLITICAL)
 * for regions, localities, admin units, and districts
 */
export async function createSectorsForLevel(
  level: 'region' | 'locality' | 'adminUnit' | 'district',
  entityId: string,
  entityName: string
): Promise<void> {
  try {
    switch (level) {
      case 'region': {
        // Create 4 sectors for the region
        for (const sectorType of FIXED_SECTOR_TYPES) {
          await prisma.sectorRegion.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              description: encodeSectorMetadata(entityId, 'region')
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'locality': {
        // Find the parent region to get its sectors
        const locality = await prisma.locality.findUnique({
          where: { id: entityId },
          select: { regionId: true, name: true, region: { select: { id: true, name: true } } }
        });

        if (!locality || !locality.regionId) {
          console.error(`⚠️ Locality ${entityId} not found or missing regionId`);
          break;
        }

        // Find the parent region's sectors using ID-based lookup
        for (const sectorType of FIXED_SECTOR_TYPES) {
          // Try ID-based lookup first, fallback to name-based for legacy data
          let sectorRegion = await findSectorBySourceId('sectorRegion', locality.regionId, sectorType);
          
          // Fallback to name-based lookup for legacy sectors without metadata
          if (!sectorRegion) {
            const regionName = locality.region?.name || '';
            sectorRegion = await prisma.sectorRegion.findFirst({
              where: {
                sectorType,
                expatriateRegionId: null,
                name: { startsWith: `${regionName} -` }
              },
              select: { id: true }
            });
          }

          await prisma.sectorLocality.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorRegionId: sectorRegion?.id || null,
              description: encodeSectorMetadata(entityId, 'locality')
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'adminUnit': {
        // Find the parent locality to get its sectors
        const adminUnit = await prisma.adminUnit.findUnique({
          where: { id: entityId },
          select: { localityId: true, name: true, locality: { select: { id: true, name: true } } }
        });

        if (!adminUnit || !adminUnit.localityId) {
          console.error(`⚠️ Admin unit ${entityId} not found or missing localityId`);
          break;
        }

        // Find the parent locality's sectors using ID-based lookup
        for (const sectorType of FIXED_SECTOR_TYPES) {
          // Try ID-based lookup first, fallback to name-based for legacy data
          let sectorLocality = await findSectorBySourceId('sectorLocality', adminUnit.localityId, sectorType);
          
          // Fallback to name-based lookup for legacy sectors without metadata
          if (!sectorLocality) {
            const localityName = adminUnit.locality?.name || '';
            sectorLocality = await prisma.sectorLocality.findFirst({
              where: {
                sectorType,
                expatriateRegionId: null,
                name: { startsWith: `${localityName} -` }
              },
              select: { id: true }
            });
          }

          await prisma.sectorAdminUnit.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorLocalityId: sectorLocality?.id || null,
              description: encodeSectorMetadata(entityId, 'adminUnit')
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }

      case 'district': {
        // Find the parent admin unit to get its sectors
        const district = await prisma.district.findUnique({
          where: { id: entityId },
          select: { adminUnitId: true, name: true, adminUnit: { select: { id: true, name: true } } }
        });

        if (!district || !district.adminUnitId) {
          console.error(`⚠️ District ${entityId} not found or missing adminUnitId`);
          break;
        }

        // Find the parent admin unit's sectors using ID-based lookup
        for (const sectorType of FIXED_SECTOR_TYPES) {
          // Try ID-based lookup first, fallback to name-based for legacy data
          let sectorAdminUnit = await findSectorBySourceId('sectorAdminUnit', district.adminUnitId, sectorType);
          
          // Fallback to name-based lookup for legacy sectors without metadata
          if (!sectorAdminUnit) {
            const adminUnitName = district.adminUnit?.name || '';
            sectorAdminUnit = await prisma.sectorAdminUnit.findFirst({
              where: {
                sectorType,
                expatriateRegionId: null,
                name: { startsWith: `${adminUnitName} -` }
              },
              select: { id: true }
            });
          }

          await prisma.sectorDistrict.create({
            data: {
              name: `${entityName} - ${sectorTypeNames[sectorType]}`,
              sectorType,
              active: true,
              sectorAdminUnitId: sectorAdminUnit?.id || null,
              description: encodeSectorMetadata(entityId, 'district')
              // No expatriateRegionId = original geographic hierarchy
            }
          });
        }
        break;
      }
    }

    console.log(`✅ Created 4 sectors for ${level}: ${entityName}`);
  } catch (error) {
    console.error(`⚠️ Error creating sectors for ${level} ${entityName}:`, error);
    // Don't throw - sector creation failure shouldn't block hierarchy creation
  }
}

