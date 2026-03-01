import { describe, it, expect } from '@jest/globals';
import HierarchyService from '../services/hierarchyService';

/**
 * Tests for HierarchyService.determineContentHierarchy
 *
 * Validates the auto-targeting logic for every admin level ×
 * active hierarchy (ORIGINAL / EXPATRIATE / SECTOR) combination.
 */

function makeAdmin(overrides: Record<string, any> = {}): any {
  return {
    id: 'admin-1',
    adminLevel: 'REGION',
    activeHierarchy: 'ORIGINAL',
    nationalLevelId: null,
    regionId: null,
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

describe('HierarchyService.determineContentHierarchy', () => {

  // ── REGION admin ─────────────────────────────────────────────────

  describe('REGION admin', () => {
    it('ORIGINAL: targets their region, clears lower levels', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', regionId: 'r1', activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
      expect(result.targetLocalityId).toBeNull();
      expect(result.targetAdminUnitId).toBeNull();
      expect(result.targetDistrictId).toBeNull();
    });

    it('EXPATRIATE: targets their expatriate region', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', expatriateRegionId: 'exp-r1',
        activeHierarchy: 'EXPATRIATE',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetExpatriateRegionId).toBe('exp-r1');
      expect(result.targetRegionId).toBeUndefined();
    });

    it('SECTOR: targets their sector region, clears lower sector levels', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', sectorRegionId: 'sr1', activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetSectorRegionId).toBe('sr1');
      expect(result.targetSectorLocalityId).toBeNull();
      expect(result.targetSectorAdminUnitId).toBeNull();
      expect(result.targetSectorDistrictId).toBeNull();
    });
  });

  // ── LOCALITY admin ───────────────────────────────────────────────

  describe('LOCALITY admin', () => {
    it('ORIGINAL: targets region + locality, clears lower levels', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', regionId: 'r1', localityId: 'l1',
        activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
      expect(result.targetLocalityId).toBe('l1');
      expect(result.targetAdminUnitId).toBeNull();
      expect(result.targetDistrictId).toBeNull();
    });

    it('SECTOR: targets sector region + sector locality, clears lower levels', () => {
      const admin = makeAdmin({
        adminLevel: 'LOCALITY', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
        activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetSectorRegionId).toBe('sr1');
      expect(result.targetSectorLocalityId).toBe('sl1');
      expect(result.targetSectorAdminUnitId).toBeNull();
      expect(result.targetSectorDistrictId).toBeNull();
    });
  });

  // ── ADMIN_UNIT admin ─────────────────────────────────────────────

  describe('ADMIN_UNIT admin', () => {
    it('ORIGINAL: targets region + locality + adminUnit, clears district', () => {
      const admin = makeAdmin({
        adminLevel: 'ADMIN_UNIT', regionId: 'r1', localityId: 'l1',
        adminUnitId: 'au1', activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
      expect(result.targetLocalityId).toBe('l1');
      expect(result.targetAdminUnitId).toBe('au1');
      expect(result.targetDistrictId).toBeNull();
    });

    it('SECTOR: targets sector region + locality + adminUnit, clears district', () => {
      const admin = makeAdmin({
        adminLevel: 'ADMIN_UNIT', sectorRegionId: 'sr1',
        sectorLocalityId: 'sl1', sectorAdminUnitId: 'sau1',
        activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetSectorRegionId).toBe('sr1');
      expect(result.targetSectorLocalityId).toBe('sl1');
      expect(result.targetSectorAdminUnitId).toBe('sau1');
      expect(result.targetSectorDistrictId).toBeNull();
    });
  });

  // ── DISTRICT admin ───────────────────────────────────────────────

  describe('DISTRICT admin', () => {
    it('ORIGINAL: targets all 4 levels', () => {
      const admin = makeAdmin({
        adminLevel: 'DISTRICT', regionId: 'r1', localityId: 'l1',
        adminUnitId: 'au1', districtId: 'd1', activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
      expect(result.targetLocalityId).toBe('l1');
      expect(result.targetAdminUnitId).toBe('au1');
      expect(result.targetDistrictId).toBe('d1');
    });

    it('SECTOR: targets all 4 sector levels', () => {
      const admin = makeAdmin({
        adminLevel: 'DISTRICT', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
        sectorAdminUnitId: 'sau1', sectorDistrictId: 'sd1',
        activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetSectorRegionId).toBe('sr1');
      expect(result.targetSectorLocalityId).toBe('sl1');
      expect(result.targetSectorAdminUnitId).toBe('sau1');
      expect(result.targetSectorDistrictId).toBe('sd1');
    });
  });

  // ── National level handling ──────────────────────────────────────

  describe('National level', () => {
    it('sets targetNationalLevelId for ORIGINAL hierarchy', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', nationalLevelId: 'nl1', regionId: 'r1',
        activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetNationalLevelId).toBe('nl1');
    });

    it('does NOT set targetNationalLevelId for EXPATRIATE hierarchy', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', nationalLevelId: 'nl1',
        expatriateRegionId: 'exp-r1', activeHierarchy: 'EXPATRIATE',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetNationalLevelId).toBeUndefined();
    });

    it('does NOT set targetNationalLevelId for SECTOR hierarchy', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', nationalLevelId: 'nl1',
        sectorRegionId: 'sr1', activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetNationalLevelId).toBeUndefined();
    });
  });

  // ── Fallback / default admin (no specific adminLevel) ────────────

  describe('Default admin (no adminLevel match)', () => {
    it('ORIGINAL: uses most specific level (district)', () => {
      const admin = makeAdmin({
        adminLevel: 'USER', regionId: 'r1', localityId: 'l1',
        adminUnitId: 'au1', districtId: 'd1', activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetDistrictId).toBe('d1');
      expect(result.targetAdminUnitId).toBe('au1');
      expect(result.targetLocalityId).toBe('l1');
      expect(result.targetRegionId).toBe('r1');
    });

    it('ORIGINAL: uses region when only region exists', () => {
      const admin = makeAdmin({
        adminLevel: 'USER', regionId: 'r1', activeHierarchy: 'ORIGINAL',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
      expect(result.targetLocalityId).toBeNull();
    });

    it('SECTOR: uses most specific sector level', () => {
      const admin = makeAdmin({
        adminLevel: 'USER', sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
        activeHierarchy: 'SECTOR',
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetSectorLocalityId).toBe('sl1');
      expect(result.targetSectorRegionId).toBe('sr1');
      expect(result.targetSectorAdminUnitId).toBeNull();
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('admin with no hierarchy IDs returns empty object', () => {
      const admin = makeAdmin({ adminLevel: 'REGION', activeHierarchy: 'ORIGINAL' });
      const result = HierarchyService.determineContentHierarchy(admin);

      // Should return an object (may have null values set but no concrete IDs)
      expect(typeof result).toBe('object');
    });

    it('defaults to ORIGINAL when activeHierarchy is undefined', () => {
      const admin = makeAdmin({
        adminLevel: 'REGION', regionId: 'r1', activeHierarchy: undefined,
      });
      const result = HierarchyService.determineContentHierarchy(admin);

      expect(result.targetRegionId).toBe('r1');
    });
  });
});
