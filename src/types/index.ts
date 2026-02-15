import { Request } from 'express';

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    mobileNumber?: string;
    role: string;
    adminLevel: string;
    activeHierarchy?: string | null;
    nationalLevelId?: string | null;
    regionId?: string | null;
    localityId?: string | null;
    adminUnitId?: string | null;
    districtId?: string | null;
    expatriateRegionId?: string | null;
    expatriateLocalityId?: string | null;
    expatriateAdminUnitId?: string | null;
    expatriateDistrictId?: string | null;
    expatriateNationalLevelId?: string | null;
    region?: { id: string; name: string } | null;
    locality?: { id: string; name: string } | null;
    adminUnit?: { id: string; name: string } | null;
    district?: { id: string; name: string } | null;
    nationalLevel?: { id: string; name: string } | null;
  };
}

// User payload for JWT
export interface UserPayload {
  id: string;
  email?: string;
  mobileNumber?: string;
  role: string;
  adminLevel: string;
  activeHierarchy?: string | null;
  nationalLevelId?: string | null;
  regionId?: string | null;
  localityId?: string | null;
  adminUnitId?: string | null;
  districtId?: string | null;
  // Sector hierarchy IDs (included when activeHierarchy is SECTOR)
  sectorNationalLevelId?: string | null;
  sectorRegionId?: string | null;
  sectorLocalityId?: string | null;
  sectorAdminUnitId?: string | null;
  sectorDistrictId?: string | null;
  // Expatriate hierarchy IDs (included when activeHierarchy is EXPATRIATE)
  expatriateRegionId?: string | null;
  expatriateLocalityId?: string | null;
  expatriateAdminUnitId?: string | null;
  expatriateDistrictId?: string | null;
  expatriateNationalLevelId?: string | null;
}

// Common response types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

