import { describe, it, expect } from '@jest/globals';
import HierarchyService from '../services/hierarchyService';

/**
 * Tests for HierarchyService.buildContentFilter
 *
 * Validates that content visibility works correctly for every hierarchy
 * combination: ORIGINAL (geographic), EXPATRIATE, SECTOR, GLOBAL, and
 * mixed-hierarchy users.
 */

// ── Helpers ──────────────────────────────────────────────────────────

function makeUser(overrides: Record<string, any> = {}): any {
  return {
    id: 'user-1',
    regionId: null,
    localityId: null,
    adminUnitId: null,
    districtId: null,
    nationalLevelId: null,
    expatriateRegionId: null,
    sectorRegionId: null,
    sectorLocalityId: null,
    sectorAdminUnitId: null,
    sectorDistrictId: null,
    sectorNationalLevelId: null,
    ...overrides,
  };
}

/** Flatten all OR conditions into a flat list for easy assertion */
function getORConditions(filter: any): any[] {
  return filter?.OR ?? [];
}

/** Check if a specific condition pattern exists in the OR array */
function hasCondition(conditions: any[], matcher: (c: any) => boolean): boolean {
  return conditions.some(matcher);
}

// ── Test suites ──────────────────────────────────────────────────────

describe('HierarchyService.buildContentFilter', () => {

  // ── GLOBAL content ───────────────────────────────────────────────

  describe('GLOBAL content visibility', () => {
    it('should always include GLOBAL content for user with no hierarchy', () => {
      const user = makeUser();
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      expect(ors.length).toBeGreaterThanOrEqual(1);
      // GLOBAL = all target fields null
      const globalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === null) &&
        c.AND.some((a: any) => a.targetExpatriateRegionId === null) &&
        c.AND.some((a: any) => a.targetSectorRegionId === null)
      );
      expect(globalCondition).toBeDefined();
    });

    it('should include GLOBAL content for user with ORIGINAL hierarchy', () => {
      const user = makeUser({ regionId: 'r1', localityId: 'l1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const globalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === null)
      );
      expect(globalCondition).toBeDefined();
    });

    it('should include GLOBAL content for user with EXPATRIATE hierarchy', () => {
      const user = makeUser({ expatriateRegionId: 'exp-r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const globalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === null)
      );
      expect(globalCondition).toBeDefined();
    });

    it('should include GLOBAL content for user with SECTOR hierarchy', () => {
      const user = makeUser({ sectorRegionId: 'sr1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const globalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === null)
      );
      expect(globalCondition).toBeDefined();
    });
  });

  // ── ORIGINAL hierarchy cascading ────────────────────────────────

  describe('ORIGINAL (geographic) hierarchy cascading', () => {
    it('region user sees region-level content', () => {
      const user = makeUser({ regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const regionCondition = ors.find((c: any) =>
        c.AND &&
        c.AND.some((a: any) => a.targetRegionId === 'r1') &&
        c.AND.some((a: any) => a.targetLocalityId === null)
      );
      expect(regionCondition).toBeDefined();
    });

    it('locality user sees both locality-level AND region-level content', () => {
      const user = makeUser({ regionId: 'r1', localityId: 'l1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      // Should see region-level
      const regionCondition = ors.find((c: any) =>
        c.AND &&
        c.AND.some((a: any) => a.targetRegionId === 'r1') &&
        c.AND.some((a: any) => a.targetLocalityId === null)
      );
      expect(regionCondition).toBeDefined();

      // Should see locality-level
      const localityCondition = ors.find((c: any) =>
        c.AND &&
        c.AND.some((a: any) => a.targetRegionId === 'r1') &&
        c.AND.some((a: any) => a.targetLocalityId === 'l1') &&
        c.AND.some((a: any) => a.targetAdminUnitId === null)
      );
      expect(localityCondition).toBeDefined();
    });

    it('adminUnit user sees adminUnit, locality, AND region-level content', () => {
      const user = makeUser({ regionId: 'r1', localityId: 'l1', adminUnitId: 'au1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      // 3 ORIGINAL conditions + 1 GLOBAL = at least 4
      const originalConditions = ors.filter((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === 'r1')
      );
      expect(originalConditions.length).toBe(3);
    });

    it('district user sees all 4 ORIGINAL levels', () => {
      const user = makeUser({
        regionId: 'r1', localityId: 'l1', adminUnitId: 'au1', districtId: 'd1',
      });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const originalConditions = ors.filter((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === 'r1')
      );
      expect(originalConditions.length).toBe(4);
    });

    it('user should NOT see content from a different region', () => {
      const user = makeUser({ regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const wrongRegion = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === 'r2')
      );
      expect(wrongRegion).toBeUndefined();
    });
  });

  // ── NATIONAL LEVEL ──────────────────────────────────────────────

  describe('NATIONAL_LEVEL hierarchy', () => {
    it('user with nationalLevelId sees national-level content', () => {
      const user = makeUser({ nationalLevelId: 'nl1', regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const nlCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetNationalLevelId === 'nl1')
      );
      expect(nlCondition).toBeDefined();
    });

    it('user without nationalLevelId does NOT see national-level content', () => {
      const user = makeUser({ regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const nlCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetNationalLevelId !== undefined && a.targetNationalLevelId !== null)
      );
      expect(nlCondition).toBeUndefined();
    });
  });

  // ── EXPATRIATE hierarchy ────────────────────────────────────────

  describe('EXPATRIATE hierarchy', () => {
    it('expatriate user sees content targeted at their expatriate region', () => {
      const user = makeUser({ expatriateRegionId: 'exp-r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const expatCondition = ors.find((c: any) =>
        c.targetExpatriateRegionId === 'exp-r1'
      );
      expect(expatCondition).toBeDefined();
    });

    it('expatriate user does NOT see content from another expatriate region', () => {
      const user = makeUser({ expatriateRegionId: 'exp-r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const wrongExpat = ors.find((c: any) =>
        c.targetExpatriateRegionId === 'exp-r2'
      );
      expect(wrongExpat).toBeUndefined();
    });

    it('non-expatriate user does NOT see expatriate content', () => {
      const user = makeUser({ regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const expatCondition = ors.find((c: any) =>
        c.targetExpatriateRegionId && c.targetExpatriateRegionId !== null
      );
      expect(expatCondition).toBeUndefined();
    });
  });

  // ── SECTOR hierarchy cascading ──────────────────────────────────

  describe('SECTOR hierarchy cascading', () => {
    it('sectorRegion user sees sector region-level content', () => {
      const user = makeUser({ sectorRegionId: 'sr1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const sectorCondition = ors.find((c: any) =>
        c.targetSectorRegionId === 'sr1' && c.targetSectorLocalityId === null
      );
      expect(sectorCondition).toBeDefined();
    });

    it('sectorLocality user sees both sectorLocality AND sectorRegion content', () => {
      const user = makeUser({ sectorRegionId: 'sr1', sectorLocalityId: 'sl1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const regionLevel = ors.find((c: any) =>
        c.targetSectorRegionId === 'sr1' && c.targetSectorLocalityId === null
      );
      const localityLevel = ors.find((c: any) =>
        c.targetSectorLocalityId === 'sl1' && c.targetSectorAdminUnitId === null
      );
      expect(regionLevel).toBeDefined();
      expect(localityLevel).toBeDefined();
    });

    it('sectorDistrict user sees all 4 sector levels', () => {
      const user = makeUser({
        sectorRegionId: 'sr1', sectorLocalityId: 'sl1',
        sectorAdminUnitId: 'sau1', sectorDistrictId: 'sd1',
      });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      // Should have sector conditions for each level
      const sectorConditions = ors.filter((c: any) =>
        c.targetSectorRegionId || c.targetSectorLocalityId ||
        c.targetSectorAdminUnitId || c.targetSectorDistrictId
      );
      expect(sectorConditions.length).toBe(4);
    });

    it('non-sector user does NOT see sector content', () => {
      const user = makeUser({ regionId: 'r1' });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      const sectorCondition = ors.find((c: any) =>
        c.targetSectorRegionId && c.targetSectorRegionId !== null
      );
      expect(sectorCondition).toBeUndefined();
    });
  });

  // ── Mixed hierarchy users ───────────────────────────────────────

  describe('Mixed hierarchy users (ORIGINAL + EXPATRIATE + SECTOR)', () => {
    it('user with ORIGINAL + EXPATRIATE sees content from both', () => {
      const user = makeUser({
        regionId: 'r1', localityId: 'l1',
        expatriateRegionId: 'exp-r1',
      });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      // ORIGINAL content
      const originalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === 'r1')
      );
      expect(originalCondition).toBeDefined();

      // EXPATRIATE content
      const expatCondition = ors.find((c: any) =>
        c.targetExpatriateRegionId === 'exp-r1'
      );
      expect(expatCondition).toBeDefined();

      // GLOBAL
      const globalCondition = ors.find((c: any) =>
        c.AND && c.AND.some((a: any) => a.targetRegionId === null)
      );
      expect(globalCondition).toBeDefined();
    });

    it('user with all 3 hierarchies sees content from all + GLOBAL', () => {
      const user = makeUser({
        regionId: 'r1',
        expatriateRegionId: 'exp-r1',
        sectorRegionId: 'sr1',
      });
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      // At least 4 conditions: 1 original + 1 expatriate + 1 sector + 1 global
      expect(ors.length).toBeGreaterThanOrEqual(4);
    });
  });

  // ── Edge cases ──────────────────────────────────────────────────

  describe('Edge cases', () => {
    it('user with absolutely no hierarchy still sees GLOBAL content', () => {
      const user = makeUser();
      const filter = HierarchyService.buildContentFilter(user);
      const ors = getORConditions(filter);

      expect(ors.length).toBeGreaterThanOrEqual(1);
    });

    it('filter always has OR array', () => {
      const user = makeUser();
      const filter = HierarchyService.buildContentFilter(user);
      expect(filter).toHaveProperty('OR');
      expect(Array.isArray(filter.OR)).toBe(true);
    });

    it('null user properties should not crash', () => {
      const user = makeUser({
        regionId: null, localityId: null, adminUnitId: null,
        districtId: null, expatriateRegionId: null, sectorRegionId: null,
      });

      expect(() => HierarchyService.buildContentFilter(user)).not.toThrow();
    });
  });
});
