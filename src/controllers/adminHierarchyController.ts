import { Response, NextFunction } from 'express';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

/**
 * Admin controller for managing all hierarchy levels
 * Only accessible to ADMIN and GENERAL_SECRETARIAT roles
 */

// Get complete hierarchy structure with counts
export const getHierarchyOverview = async (_req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    // Get counts for each level
    const [regionsCount, localitiesCount, adminUnitsCount, districtsCount, usersCount] = await Promise.all([
      prisma.region.count(),
      prisma.locality.count(),
      prisma.adminUnit.count(),
      prisma.district.count(),
      prisma.user.count()
    ]);
    
    // Get latest entries from each level
    const [regions, localities, adminUnits, districts] = await Promise.all([
      prisma.region.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.locality.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { region: true }
      }),
      prisma.adminUnit.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { locality: true }
      }),
      prisma.district.findMany({
        take: 5,
        orderBy: { updatedAt: 'desc' },
        include: { adminUnit: true }
      })
    ]);
    
    res.json({
      counts: {
        regions: regionsCount,
        localities: localitiesCount,
        adminUnits: adminUnitsCount,
        districts: districtsCount,
        users: usersCount
      },
      recentItems: {
        regions,
        localities,
        adminUnits,
        districts
      }
    });
  } catch (error: any) {
    console.error('Error getting hierarchy overview:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get or create default national level
async function getOrCreateDefaultNationalLevel() {
  let nationalLevel = await prisma.nationalLevel.findFirst({
    where: { active: true }
  });
  
  if (!nationalLevel) {
    nationalLevel = await prisma.nationalLevel.create({
      data: {
        name: 'المستوى القومي',
        code: 'NATIONAL',
        description: 'المستوى القومي الأعلى',
        active: true
      }
    });
  }
  
  return nationalLevel;
}

// Bulk operations for regions
export const bulkCreateRegions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regions, nationalLevelId } = req.body;
    
    if (!Array.isArray(regions) || regions.length === 0) {
      res.status(400).json({ error: 'Invalid regions data. Expected non-empty array.' });
      return;
    }
    
    // Get or create default national level if not provided
    let targetNationalLevelId = nationalLevelId;
    if (!targetNationalLevelId) {
      const defaultNationalLevel = await getOrCreateDefaultNationalLevel();
      targetNationalLevelId = defaultNationalLevel.id;
    }
    
    const createdRegions = await prisma.$transaction(
      regions.map((region: any) => 
        prisma.region.create({
          data: {
            name: region.name,
            code: region.code,
            description: region.description,
            active: region.active !== undefined ? region.active : true,
            nationalLevelId: targetNationalLevelId
          }
        })
      )
    );
    
    res.status(201).json({ count: createdRegions.length, regions: createdRegions });
  } catch (error: any) {
    console.error('Error in bulk create regions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk operations for localities
export const bulkCreateLocalities = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId, localities } = req.body;
    
    if (!regionId) {
      res.status(400).json({ error: 'Region ID is required' });
      return;
    }
    
    if (!Array.isArray(localities) || localities.length === 0) {
      res.status(400).json({ error: 'Invalid localities data. Expected non-empty array.' });
      return;
    }
    
    // Verify region exists
    const region = await prisma.region.findUnique({ where: { id: regionId } });
    if (!region) {
      res.status(404).json({ error: 'Region not found' });
      return;
    }
    
    const createdLocalities = await prisma.$transaction(
      localities.map((locality: any) => 
        prisma.locality.create({
          data: {
            name: locality.name,
            code: locality.code,
            description: locality.description,
            regionId: regionId,
            active: locality.active !== undefined ? locality.active : true
          }
        })
      )
    );
    
    res.status(201).json({ count: createdLocalities.length, localities: createdLocalities });
  } catch (error: any) {
    console.error('Error in bulk create localities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk operations for admin units
export const bulkCreateAdminUnits = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId, adminUnits } = req.body;
    
    if (!localityId) {
      res.status(400).json({ error: 'Locality ID is required' });
      return;
    }
    
    if (!Array.isArray(adminUnits) || adminUnits.length === 0) {
      res.status(400).json({ error: 'Invalid admin units data. Expected non-empty array.' });
      return;
    }
    
    // Verify locality exists
    const locality = await prisma.locality.findUnique({ where: { id: localityId } });
    if (!locality) {
      res.status(404).json({ error: 'Locality not found' });
      return;
    }
    
    const createdAdminUnits = await prisma.$transaction(
      adminUnits.map((adminUnit: any) => 
        prisma.adminUnit.create({
          data: {
            name: adminUnit.name,
            code: adminUnit.code,
            description: adminUnit.description,
            localityId: localityId,
            active: adminUnit.active !== undefined ? adminUnit.active : true
          }
        })
      )
    );
    
    res.status(201).json({ count: createdAdminUnits.length, adminUnits: createdAdminUnits });
  } catch (error: any) {
    console.error('Error in bulk create admin units:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk operations for districts
export const bulkCreateDistricts = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId, districts } = req.body;
    
    if (!adminUnitId) {
      res.status(400).json({ error: 'Administrative Unit ID is required' });
      return;
    }
    
    if (!Array.isArray(districts) || districts.length === 0) {
      res.status(400).json({ error: 'Invalid districts data. Expected non-empty array.' });
      return;
    }
    
    // Verify admin unit exists
    const adminUnit = await prisma.adminUnit.findUnique({ where: { id: adminUnitId } });
    if (!adminUnit) {
      res.status(404).json({ error: 'Administrative Unit not found' });
      return;
    }
    
    const createdDistricts = await prisma.$transaction(
      districts.map((district: any) => 
        prisma.district.create({
          data: {
            name: district.name,
            code: district.code,
            description: district.description,
            adminUnitId: adminUnitId,
            active: district.active !== undefined ? district.active : true
          }
        })
      )
    );
    
    res.status(201).json({ count: createdDistricts.length, districts: createdDistricts });
  } catch (error: any) {
    console.error('Error in bulk create districts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulk import from CSV/JSON
export const bulkImportHierarchy = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { data, format } = req.body;
    
    if (!data || (format !== 'json' && format !== 'csv')) {
      res.status(400).json({ error: 'Invalid data or format. Expected "json" or "csv" format.' });
      return;
    }
    
    let hierarchyData: any;
    
    if (format === 'csv') {
      // Parse CSV data
      // This is a simplified example, you would need a proper CSV parser
      hierarchyData = parseCsvToHierarchy(data);
    } else {
      // JSON format
      hierarchyData = typeof data === 'string' ? JSON.parse(data) : data;
    }
    
    // Process the hierarchy data
    const result = await processHierarchyImport(hierarchyData);
    
    res.status(201).json(result);
  } catch (error: any) {
    console.error('Error in bulk import hierarchy:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Helper function to process hierarchy import
async function processHierarchyImport(data: any): Promise<any> {
  const results = {
    regions: [] as any[],
    localities: [] as any[],
    adminUnits: [] as any[],
    districts: [] as any[]
  };
  
  // Process regions
  for (const region of data.regions || []) {
    try {
      // Check if region already exists
      let regionEntity = await prisma.region.findFirst({
        where: {
          OR: [
            { name: region.name },
            { code: region.code }
          ]
        }
      });
      
      // Create region if it doesn't exist
      if (!regionEntity) {
        // Get or create default national level
        const defaultNationalLevel = await getOrCreateDefaultNationalLevel();
        
        regionEntity = await prisma.region.create({
          data: {
            name: region.name,
            code: region.code,
            description: region.description,
            active: region.active !== undefined ? region.active : true,
            nationalLevelId: region.nationalLevelId || defaultNationalLevel.id
          }
        });
        results.regions.push(regionEntity);
      }
      
      // Process localities for this region
      for (const locality of region.localities || []) {
        try {
          // Check if locality already exists
          let localityEntity = await prisma.locality.findFirst({
            where: {
              OR: [
                {
                  name: locality.name,
                  regionId: regionEntity.id
                },
                {
                  code: locality.code,
                  regionId: regionEntity.id
                }
              ]
            }
          });
          
          // Create locality if it doesn't exist
          if (!localityEntity) {
            localityEntity = await prisma.locality.create({
              data: {
                name: locality.name,
                code: locality.code,
                description: locality.description,
                regionId: regionEntity.id,
                active: locality.active !== undefined ? locality.active : true
              }
            });
            results.localities.push(localityEntity);
          }
          
          // Process admin units for this locality
          for (const adminUnit of locality.adminUnits || []) {
            try {
              // Check if admin unit already exists
              let adminUnitEntity = await prisma.adminUnit.findFirst({
                where: {
                  OR: [
                    {
                      name: adminUnit.name,
                      localityId: localityEntity.id
                    },
                    {
                      code: adminUnit.code,
                      localityId: localityEntity.id
                    }
                  ]
                }
              });
              
              // Create admin unit if it doesn't exist
              if (!adminUnitEntity) {
                adminUnitEntity = await prisma.adminUnit.create({
                  data: {
                    name: adminUnit.name,
                    code: adminUnit.code,
                    description: adminUnit.description,
                    localityId: localityEntity.id,
                    active: adminUnit.active !== undefined ? adminUnit.active : true
                  }
                });
                results.adminUnits.push(adminUnitEntity);
              }
              
              // Process districts for this admin unit
              for (const district of adminUnit.districts || []) {
                try {
                  // Check if district already exists
                  let districtEntity = await prisma.district.findFirst({
                    where: {
                      OR: [
                        {
                          name: district.name,
                          adminUnitId: adminUnitEntity.id
                        },
                        {
                          code: district.code,
                          adminUnitId: adminUnitEntity.id
                        }
                      ]
                    }
                  });
                  
                  // Create district if it doesn't exist
                  if (!districtEntity) {
                    districtEntity = await prisma.district.create({
                      data: {
                        name: district.name,
                        code: district.code,
                        description: district.description,
                        adminUnitId: adminUnitEntity.id,
                        active: district.active !== undefined ? district.active : true
                      }
                    });
                    results.districts.push(districtEntity);
                  }
                } catch (error: any) {
                  console.error(`Error processing district ${district.name}:`, error);
                }
              }
            } catch (error: any) {
              console.error(`Error processing admin unit ${adminUnit.name}:`, error);
            }
          }
        } catch (error: any) {
          console.error(`Error processing locality ${locality.name}:`, error);
        }
      }
    } catch (error: any) {
      console.error(`Error processing region ${region.name}:`, error);
    }
  }
  
  return {
    status: 'success',
    created: {
      regions: results.regions.length,
      localities: results.localities.length,
      adminUnits: results.adminUnits.length,
      districts: results.districts.length
    },
    details: results
  };
}

// Helper function to parse CSV to hierarchy (stub implementation)
function parseCsvToHierarchy(_csvData: string): any {
  // This would be implemented with a proper CSV parser library
  // For now, we'll just provide an error
  throw new Error('CSV parsing not implemented yet. Please use JSON format.');
}

