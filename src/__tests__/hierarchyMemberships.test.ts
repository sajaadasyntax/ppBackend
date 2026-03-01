import { describe, it, expect } from '@jest/globals';

/**
 * Tests for the getUserHierarchyMemberships endpoint response shape.
 *
 * These tests simulate the backend logic (boolean flags + name mapping)
 * and validate that the mobile HierarchySelector will receive the correct
 * data shape for every user hierarchy combination.
 */

// ── Simulate the backend response logic ────────────────────────────
// (must match userController.ts getUserHierarchyMemberships)

function buildMembershipResponse(user: any): any {
  const hasOriginal = !!(user.nationalLevel || user.region || user.locality || user.adminUnit || user.district);
  const hasExpatriate = !!user.expatriateRegion;
  const hasSector = !!(user.sectorNationalLevel || user.sectorRegion || user.sectorLocality || user.sectorAdminUnit || user.sectorDistrict);

  return {
    activeHierarchy: user.activeHierarchy,
    hasOriginal,
    hasExpatriate,
    hasSector,
    originalHierarchy: hasOriginal ? {
      nationalLevelName: user.nationalLevel?.name,
      regionName: user.region?.name,
      localityName: user.locality?.name,
      adminUnitName: user.adminUnit?.name,
      districtName: user.district?.name,
    } : undefined,
    expatriateHierarchy: hasExpatriate ? {
      expatriateRegionName: user.expatriateRegion?.name,
    } : undefined,
    sectorHierarchy: hasSector ? {
      sectorNationalLevelName: user.sectorNationalLevel?.name,
      sectorRegionName: user.sectorRegion?.name,
      sectorLocalityName: user.sectorLocality?.name,
      sectorAdminUnitName: user.sectorAdminUnit?.name,
      sectorDistrictName: user.sectorDistrict?.name,
    } : undefined,
  };
}

// ── Test suites ────────────────────────────────────────────────────

describe('Hierarchy Membership Response', () => {

  describe('User with ORIGINAL hierarchy only', () => {
    it('has hasOriginal=true, others false', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: { id: 'l1', name: 'East Nile', code: 'EN' },
        adminUnit: null,
        district: null,
        nationalLevel: null,
        expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(true);
      expect(response.hasExpatriate).toBe(false);
      expect(response.hasSector).toBe(false);
    });

    it('includes originalHierarchy with names', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: { id: 'l1', name: 'East Nile', code: 'EN' },
        adminUnit: null, district: null, nationalLevel: null,
        expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.originalHierarchy).toBeDefined();
      expect(response.originalHierarchy.regionName).toBe('Khartoum');
      expect(response.originalHierarchy.localityName).toBe('East Nile');
      expect(response.originalHierarchy.adminUnitName).toBeUndefined();
    });

    it('excludes expatriate and sector hierarchies', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: null, adminUnit: null, district: null, nationalLevel: null,
        expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.expatriateHierarchy).toBeUndefined();
      expect(response.sectorHierarchy).toBeUndefined();
    });
  });

  describe('User with EXPATRIATE hierarchy only', () => {
    it('has hasExpatriate=true, others false', () => {
      const user = {
        activeHierarchy: 'EXPATRIATE',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null,
        expatriateRegion: { id: 'exp-r1', name: 'Gulf Region', code: 'GR' },
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(false);
      expect(response.hasExpatriate).toBe(true);
      expect(response.hasSector).toBe(false);
    });

    it('includes expatriateHierarchy with name', () => {
      const user = {
        activeHierarchy: 'EXPATRIATE',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null,
        expatriateRegion: { id: 'exp-r1', name: 'Gulf Region', code: 'GR' },
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.expatriateHierarchy).toBeDefined();
      expect(response.expatriateHierarchy.expatriateRegionName).toBe('Gulf Region');
    });
  });

  describe('User with SECTOR hierarchy only', () => {
    it('has hasSector=true, others false', () => {
      const user = {
        activeHierarchy: 'SECTOR',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null, expatriateRegion: null,
        sectorNationalLevel: { id: 'snl1', name: 'Social Sector', code: 'SS' },
        sectorRegion: { id: 'sr1', name: 'Sector Region A', code: 'SRA' },
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(false);
      expect(response.hasExpatriate).toBe(false);
      expect(response.hasSector).toBe(true);
    });

    it('includes sectorHierarchy with names', () => {
      const user = {
        activeHierarchy: 'SECTOR',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null, expatriateRegion: null,
        sectorNationalLevel: { id: 'snl1', name: 'Social Sector', code: 'SS' },
        sectorRegion: { id: 'sr1', name: 'Sector Region A', code: 'SRA' },
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.sectorHierarchy).toBeDefined();
      expect(response.sectorHierarchy.sectorNationalLevelName).toBe('Social Sector');
      expect(response.sectorHierarchy.sectorRegionName).toBe('Sector Region A');
      expect(response.sectorHierarchy.sectorLocalityName).toBeUndefined();
    });
  });

  describe('User with ALL THREE hierarchies', () => {
    it('has all three flags true', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: null, adminUnit: null, district: null, nationalLevel: null,
        expatriateRegion: { id: 'exp-r1', name: 'Gulf Region', code: 'GR' },
        sectorNationalLevel: null,
        sectorRegion: { id: 'sr1', name: 'Sector A', code: 'SA' },
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(true);
      expect(response.hasExpatriate).toBe(true);
      expect(response.hasSector).toBe(true);
    });

    it('includes all three hierarchy detail objects', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: null, adminUnit: null, district: null, nationalLevel: null,
        expatriateRegion: { id: 'exp-r1', name: 'Gulf Region', code: 'GR' },
        sectorNationalLevel: null,
        sectorRegion: { id: 'sr1', name: 'Sector A', code: 'SA' },
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.originalHierarchy).toBeDefined();
      expect(response.expatriateHierarchy).toBeDefined();
      expect(response.sectorHierarchy).toBeDefined();
    });
  });

  describe('User with NO hierarchy', () => {
    it('has all flags false', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null, expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(false);
      expect(response.hasExpatriate).toBe(false);
      expect(response.hasSector).toBe(false);
    });

    it('excludes all hierarchy detail objects', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null, expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.originalHierarchy).toBeUndefined();
      expect(response.expatriateHierarchy).toBeUndefined();
      expect(response.sectorHierarchy).toBeUndefined();
    });
  });

  describe('Full depth ORIGINAL hierarchy (all 5 levels)', () => {
    it('includes all names from national to district', () => {
      const user = {
        activeHierarchy: 'ORIGINAL',
        nationalLevel: { id: 'nl1', name: 'Sudan National', code: 'SN' },
        region: { id: 'r1', name: 'Khartoum', code: 'KH' },
        locality: { id: 'l1', name: 'East Nile', code: 'EN' },
        adminUnit: { id: 'au1', name: 'Unit A', code: 'UA' },
        district: { id: 'd1', name: 'District 1', code: 'D1' },
        expatriateRegion: null,
        sectorNationalLevel: null, sectorRegion: null,
        sectorLocality: null, sectorAdminUnit: null, sectorDistrict: null,
      };
      const response = buildMembershipResponse(user);

      expect(response.hasOriginal).toBe(true);
      expect(response.originalHierarchy.nationalLevelName).toBe('Sudan National');
      expect(response.originalHierarchy.regionName).toBe('Khartoum');
      expect(response.originalHierarchy.localityName).toBe('East Nile');
      expect(response.originalHierarchy.adminUnitName).toBe('Unit A');
      expect(response.originalHierarchy.districtName).toBe('District 1');
    });
  });

  describe('Full depth SECTOR hierarchy (all 5 levels)', () => {
    it('includes all sector names', () => {
      const user = {
        activeHierarchy: 'SECTOR',
        region: null, locality: null, adminUnit: null,
        district: null, nationalLevel: null, expatriateRegion: null,
        sectorNationalLevel: { id: 'snl1', name: 'Social', code: 'SOC' },
        sectorRegion: { id: 'sr1', name: 'Sec Region', code: 'SR' },
        sectorLocality: { id: 'sl1', name: 'Sec Locality', code: 'SL' },
        sectorAdminUnit: { id: 'sau1', name: 'Sec Unit', code: 'SU' },
        sectorDistrict: { id: 'sd1', name: 'Sec District', code: 'SD' },
      };
      const response = buildMembershipResponse(user);

      expect(response.hasSector).toBe(true);
      expect(response.sectorHierarchy.sectorNationalLevelName).toBe('Social');
      expect(response.sectorHierarchy.sectorRegionName).toBe('Sec Region');
      expect(response.sectorHierarchy.sectorLocalityName).toBe('Sec Locality');
      expect(response.sectorHierarchy.sectorAdminUnitName).toBe('Sec Unit');
      expect(response.sectorHierarchy.sectorDistrictName).toBe('Sec District');
    });
  });
});
