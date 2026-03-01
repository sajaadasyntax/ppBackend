import { describe, it, expect } from '@jest/globals';
import HierarchyService from '../services/hierarchyService';

/**
 * Tests for HierarchyService.validateAdminContentScope
 *
 * Validates that content creation scope enforcement works correctly
 * for every admin level × hierarchy combination.
 */

function makeAdmin(overrides: Record<string, any> = {}): any {
  return {
    id: 'admin-1',
    adminLevel: 'REGION',
    regionId: 'r1',
    localityId: null,
    adminUnitId: null,
    districtId: null,
    expatriateRegionId: null,
    sectorRegionId: null,
    sectorLocalityId: null,
    sectorAdminUnitId: null,
    sectorDistrictId: null,
    ...overrides,
  };
}

describe('HierarchyService.validateAdminContentScope', () => {

  // ── Root admin bypass ────────────────────────────────────────────

  describe('Root admins (ADMIN, GENERAL_SECRETARIAT, NATIONAL_LEVEL)', () => {
    const rootLevels = ['ADMIN', 'GENERAL_SECRETARIAT', 'NATIONAL_LEVEL'];

    rootLevels.forEach(level => {
      it(`${level} can create GLOBAL content`, () => {
        const admin = makeAdmin({ adminLevel: level });
        const payload = {};
        expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
      });

      it(`${level} can create ORIGINAL content at any region`, () => {
        const admin = makeAdmin({ adminLevel: level });
        const payload = { targetRegionId: 'any-region' };
        expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
      });

      it(`${level} can create EXPATRIATE content`, () => {
        const admin = makeAdmin({ adminLevel: level });
        const payload = { targetExpatriateRegionId: 'any-expat' };
        expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
      });

      it(`${level} can create SECTOR content`, () => {
        const admin = makeAdmin({ adminLevel: level });
        const payload = { targetSectorRegionId: 'any-sector' };
        expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
      });
    });
  });

  // ── GLOBAL content restrictions ──────────────────────────────────

  describe('Non-root admins cannot create GLOBAL content', () => {
    const nonRootLevels = ['REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT'];

    nonRootLevels.forEach(level => {
      it(`${level} admin is BLOCKED from creating GLOBAL content`, () => {
        const admin = makeAdmin({ adminLevel: level });
        const payload = {};
        expect(() => HierarchyService.validateAdminContentScope(admin, payload))
          .toThrow('Only root admins can create global content.');
      });
    });
  });

  // ── ORIGINAL hierarchy scope ─────────────────────────────────────

  describe('ORIGINAL hierarchy scope enforcement', () => {
    it('REGION admin can target their own region', () => {
      const admin = makeAdmin({ adminLevel: 'REGION', regionId: 'r1' });
      const payload = { targetRegionId: 'r1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('REGION admin is BLOCKED from targeting another region', () => {
      const admin = makeAdmin({ adminLevel: 'REGION', regionId: 'r1' });
      const payload = { targetRegionId: 'r2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned region.');
    });

    it('LOCALITY admin can target their own locality', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', regionId: 'r1', localityId: 'l1',
      });
      const payload = { targetRegionId: 'r1', targetLocalityId: 'l1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('LOCALITY admin is BLOCKED from targeting another locality', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', regionId: 'r1', localityId: 'l1',
      });
      const payload = { targetRegionId: 'r1', targetLocalityId: 'l2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned locality.');
    });

    it('ADMIN_UNIT admin can target their own admin unit', () => {
      const admin = makeAdmin({
        adminLevel: 'ADMIN_UNIT', regionId: 'r1', localityId: 'l1', adminUnitId: 'au1',
      });
      const payload = { targetRegionId: 'r1', targetLocalityId: 'l1', targetAdminUnitId: 'au1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('ADMIN_UNIT admin is BLOCKED from targeting another admin unit', () => {
      const admin = makeAdmin({
        adminLevel: 'ADMIN_UNIT', regionId: 'r1', localityId: 'l1', adminUnitId: 'au1',
      });
      const payload = { targetRegionId: 'r1', targetLocalityId: 'l1', targetAdminUnitId: 'au2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned admin unit.');
    });

    it('DISTRICT admin can target their own district', () => {
      const admin = makeAdmin({
        adminLevel: 'DISTRICT', regionId: 'r1', localityId: 'l1',
        adminUnitId: 'au1', districtId: 'd1',
      });
      const payload = {
        targetRegionId: 'r1', targetLocalityId: 'l1',
        targetAdminUnitId: 'au1', targetDistrictId: 'd1',
      };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('DISTRICT admin is BLOCKED from targeting another district', () => {
      const admin = makeAdmin({
        adminLevel: 'DISTRICT', regionId: 'r1', localityId: 'l1',
        adminUnitId: 'au1', districtId: 'd1',
      });
      const payload = {
        targetRegionId: 'r1', targetLocalityId: 'l1',
        targetAdminUnitId: 'au1', targetDistrictId: 'd2',
      };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned district.');
    });
  });

  // ── EXPATRIATE hierarchy scope ───────────────────────────────────

  describe('EXPATRIATE hierarchy scope enforcement', () => {
    it('admin with matching expatriateRegionId can target their expatriate region', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', expatriateRegionId: 'exp-r1',
      });
      const payload = { targetExpatriateRegionId: 'exp-r1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('admin is BLOCKED from targeting a different expatriate region', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', expatriateRegionId: 'exp-r1',
      });
      const payload = { targetExpatriateRegionId: 'exp-r2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned expatriate region.');
    });

    it('admin without expatriateRegionId is BLOCKED from expatriate content', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', expatriateRegionId: null,
      });
      const payload = { targetExpatriateRegionId: 'exp-r1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You do not have permission to create expatriate content.');
    });
  });

  // ── SECTOR hierarchy scope ───────────────────────────────────────

  describe('SECTOR hierarchy scope enforcement', () => {
    it('admin can target their own sector region', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', sectorRegionId: 'sr1',
      });
      const payload = { targetSectorRegionId: 'sr1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('admin is BLOCKED from targeting different sector region', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', sectorRegionId: 'sr1',
      });
      const payload = { targetSectorRegionId: 'sr2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned sector region.');
    });

    it('admin can target their own sector locality', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
      });
      const payload = { targetSectorRegionId: 'sr1', targetSectorLocalityId: 'sl1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });

    it('admin is BLOCKED from targeting different sector locality', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
      });
      const payload = { targetSectorRegionId: 'sr1', targetSectorLocalityId: 'sl2' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned sector locality.');
    });

    it('admin is BLOCKED from targeting different sector admin unit', () => {
      const admin = makeAdmin({
        adminLevel: 'ADMIN_UNIT', sectorRegionId: 'sr1',
        sectorLocalityId: 'sl1', sectorAdminUnitId: 'sau1',
      });
      const payload = {
        targetSectorRegionId: 'sr1', targetSectorLocalityId: 'sl1',
        targetSectorAdminUnitId: 'sau2',
      };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned sector admin unit.');
    });

    it('admin is BLOCKED from targeting different sector district', () => {
      const admin = makeAdmin({
        adminLevel: 'DISTRICT', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
        sectorAdminUnitId: 'sau1', sectorDistrictId: 'sd1',
      });
      const payload = {
        targetSectorRegionId: 'sr1', targetSectorLocalityId: 'sl1',
        targetSectorAdminUnitId: 'sau1', targetSectorDistrictId: 'sd2',
      };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload))
        .toThrow('You can only target content within your assigned sector district.');
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('null user does not crash', () => {
      expect(() => HierarchyService.validateAdminContentScope(null, {}))
        .toThrow('Only root admins can create global content.');
    });

    it('undefined adminLevel is treated as non-root', () => {
      const admin = makeAdmin({ adminLevel: undefined });
      expect(() => HierarchyService.validateAdminContentScope(admin, {}))
        .toThrow('Only root admins can create global content.');
    });

    it('payload with mixed ORIGINAL + SECTOR should not crash', () => {
      const admin = makeAdmin({ adminLevel: 'ADMIN' });
      const payload = { targetRegionId: 'r1', targetSectorRegionId: 'sr1' };
      expect(() => HierarchyService.validateAdminContentScope(admin, payload)).not.toThrow();
    });
  });
});
