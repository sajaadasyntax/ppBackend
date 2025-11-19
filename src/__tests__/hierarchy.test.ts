import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { PrismaClient } from '@prisma/client';
import * as hierarchyController from '../controllers/hierarchyController';
import * as expatriateHierarchyService from '../services/expatriateHierarchyService';
import * as sectorHierarchyService from '../services/sectorHierarchyService';

const prisma = new PrismaClient();

describe('Hierarchy Validation Tests', () => {
  let nationalLevel: any;
  let expatriateRegion: any;

  beforeAll(async () => {
    // Create test national level
    nationalLevel = await prisma.nationalLevel.create({
      data: {
        name: 'Test National Level',
        code: 'TEST-NAT',
        description: 'Test national level for unit tests',
        active: true
      }
    });

    // Create test expatriate region
    expatriateRegion = await prisma.expatriateRegion.create({
      data: {
        name: 'Test Expatriate Region',
        code: 'TEST-EXPAT',
        description: 'Test expatriate region for unit tests',
        active: true
      }
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.region.deleteMany({
      where: { code: { startsWith: 'TEST-' } }
    });
    await prisma.nationalLevel.deleteMany({
      where: { code: 'TEST-NAT' }
    });
    await prisma.expatriateRegion.deleteMany({
      where: { code: 'TEST-EXPAT' }
    });
    await prisma.$disconnect();
  });

  describe('Region Creation', () => {
    it('should fail when name is missing', async () => {
      const req: any = {
        body: {
          code: 'TEST-REG-1',
          nationalLevelId: nationalLevel.id
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.createRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Name is required' });
    });

    it('should fail when nationalLevelId is missing', async () => {
      const req: any = {
        body: {
          name: 'Test Region',
          code: 'TEST-REG-1'
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.createRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'National level ID is required' });
    });

    it('should fail when nationalLevelId is invalid', async () => {
      const req: any = {
        body: {
          name: 'Test Region',
          code: 'TEST-REG-1',
          nationalLevelId: 'invalid-id'
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.createRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid national level ID' });
    });

    it('should create region with valid data', async () => {
      const req: any = {
        body: {
          name: 'Test Region',
          code: 'TEST-REG-VALID',
          description: 'Test description',
          nationalLevelId: nationalLevel.id
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.createRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Region',
          code: 'TEST-REG-VALID',
          nationalLevelId: nationalLevel.id
        })
      );
    });

    it('should normalize code to uppercase', async () => {
      const req: any = {
        body: {
          name: 'Test Region Lowercase',
          code: 'test-reg-lower',
          nationalLevelId: nationalLevel.id
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.createRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const created = res.json.mock.calls[0][0];
      expect(created.code).toBe('TEST-REG-LOWER');
    });
  });

  describe('Region Update', () => {
    let testRegion: any;

    beforeEach(async () => {
      testRegion = await prisma.region.create({
        data: {
          name: 'Region for Update',
          code: 'TEST-REG-UPD',
          nationalLevelId: nationalLevel.id
        }
      });
    });

    it('should allow updating nationalLevelId', async () => {
      const newNationalLevel = await prisma.nationalLevel.create({
        data: {
          name: 'New National Level',
          code: 'TEST-NAT-2',
          active: true
        }
      });

      const req: any = {
        params: { id: testRegion.id },
        body: {
          nationalLevelId: newNationalLevel.id
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.updateRegion(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          nationalLevelId: newNationalLevel.id
        })
      );

      // Cleanup
      await prisma.nationalLevel.delete({ where: { id: newNationalLevel.id } });
    });

    it('should fail when updating to invalid nationalLevelId', async () => {
      const req: any = {
        params: { id: testRegion.id },
        body: {
          nationalLevelId: 'invalid-id'
        }
      };
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };

      await hierarchyController.updateRegion(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid national level ID' });
    });
  });

  describe('Expatriate Region Creation', () => {
    it('should fail when name is missing', async () => {
      await expect(
        expatriateHierarchyService.default.createExpatriateRegion({
          code: 'TEST-EXP-2'
        })
      ).rejects.toThrow('Name is required');
    });

    it('should create expatriate region with valid data', async () => {
      const result = await expatriateHierarchyService.default.createExpatriateRegion({
        name: 'Test Expat Region',
        code: 'TEST-EXP-VALID',
        description: 'Test description'
      });

      expect(result).toMatchObject({
        name: 'Test Expat Region',
        code: 'TEST-EXP-VALID'
      });
    });

    it('should normalize code to uppercase', async () => {
      const result = await expatriateHierarchyService.default.createExpatriateRegion({
        name: 'Test Expat Lowercase',
        code: 'test-exp-lower'
      });

      expect(result.code).toBe('TEST-EXP-LOWER');
    });
  });

  describe('Sector Hierarchy Validation', () => {
    it('should fail to create sector national level without expatriate region ID', async () => {
      await expect(
        sectorHierarchyService.default.createSectorNationalLevel({
          name: 'Test Sector National',
          sectorType: 'SOCIAL',
          code: 'TEST-SECT-NAT'
        })
      ).rejects.toThrow('Expatriate region ID is required');
    });

    it('should fail to create sector national level with invalid expatriate region ID', async () => {
      await expect(
        sectorHierarchyService.default.createSectorNationalLevel({
          name: 'Test Sector National',
          sectorType: 'SOCIAL',
          code: 'TEST-SECT-NAT',
          expatriateRegionId: 'invalid-id'
        })
      ).rejects.toThrow('Invalid expatriate region ID');
    });

    it('should create sector national level with valid data', async () => {
      const result = await sectorHierarchyService.default.createSectorNationalLevel({
        name: 'Test Sector National',
        sectorType: 'SOCIAL',
        code: 'TEST-SECT-NAT-VALID',
        expatriateRegionId: expatriateRegion.id
      });

      expect(result).toMatchObject({
        name: 'Test Sector National',
        sectorType: 'SOCIAL',
        code: 'TEST-SECT-NAT-VALID',
        expatriateRegionId: expatriateRegion.id
      });
    });
  });

  describe('Sector Hierarchy Drift Prevention', () => {
    let sectorNationalLevel: any;

    beforeAll(async () => {
      sectorNationalLevel = await prisma.sectorNationalLevel.create({
        data: {
          name: 'Test Sector National for Drift',
          code: 'TEST-DRIFT-NAT',
          sectorType: 'ECONOMIC',
          expatriateRegionId: expatriateRegion.id
        }
      });
    });

    afterAll(async () => {
      await prisma.sectorDistrict.deleteMany({
        where: { code: { startsWith: 'TEST-DRIFT-' } }
      });
      await prisma.sectorAdminUnit.deleteMany({
        where: { code: { startsWith: 'TEST-DRIFT-' } }
      });
      await prisma.sectorLocality.deleteMany({
        where: { code: { startsWith: 'TEST-DRIFT-' } }
      });
      await prisma.sectorRegion.deleteMany({
        where: { code: { startsWith: 'TEST-DRIFT-' } }
      });
      await prisma.sectorNationalLevel.delete({
        where: { id: sectorNationalLevel.id }
      });
    });

    it('should derive expatriateRegionId from parent sector national level', async () => {
      const result = await sectorHierarchyService.default.createSectorRegion({
        name: 'Test Sector Region',
        code: 'TEST-DRIFT-REG',
        sectorType: 'ECONOMIC',
        sectorNationalLevelId: sectorNationalLevel.id
      });

      expect(result.expatriateRegionId).toBe(expatriateRegion.id);
    });

    it('should reject conflicting expatriateRegionId', async () => {
      const otherExpatRegion = await prisma.expatriateRegion.create({
        data: {
          name: 'Other Expat Region',
          code: 'TEST-OTHER-EXPAT',
          active: true
        }
      });

      await expect(
        sectorHierarchyService.default.createSectorRegion({
          name: 'Test Sector Region Conflict',
          code: 'TEST-DRIFT-CONFLICT',
          sectorType: 'ECONOMIC',
          sectorNationalLevelId: sectorNationalLevel.id,
          expatriateRegionId: otherExpatRegion.id
        })
      ).rejects.toThrow('Expatriate region ID conflicts with parent sector national level');

      // Cleanup
      await prisma.expatriateRegion.delete({ where: { id: otherExpatRegion.id } });
    });

    it('should propagate expatriateRegionId through all sector levels', async () => {
      const sectorRegion = await sectorHierarchyService.default.createSectorRegion({
        name: 'Test Sector Region for Propagation',
        code: 'TEST-DRIFT-PROP-REG',
        sectorType: 'ECONOMIC',
        sectorNationalLevelId: sectorNationalLevel.id
      });

      const sectorLocality = await sectorHierarchyService.default.createSectorLocality({
        name: 'Test Sector Locality',
        code: 'TEST-DRIFT-PROP-LOC',
        sectorType: 'ECONOMIC',
        sectorRegionId: sectorRegion.id
      });

      const sectorAdminUnit = await sectorHierarchyService.default.createSectorAdminUnit({
        name: 'Test Sector Admin Unit',
        code: 'TEST-DRIFT-PROP-ADMIN',
        sectorType: 'ECONOMIC',
        sectorLocalityId: sectorLocality.id
      });

      const sectorDistrict = await sectorHierarchyService.default.createSectorDistrict({
        name: 'Test Sector District',
        code: 'TEST-DRIFT-PROP-DIST',
        sectorType: 'ECONOMIC',
        sectorAdminUnitId: sectorAdminUnit.id
      });

      // All should have the same expatriateRegionId
      expect(sectorRegion.expatriateRegionId).toBe(expatriateRegion.id);
      expect(sectorLocality.expatriateRegionId).toBe(expatriateRegion.id);
      expect(sectorAdminUnit.expatriateRegionId).toBe(expatriateRegion.id);
      expect(sectorDistrict.expatriateRegionId).toBe(expatriateRegion.id);
    });
  });
});

