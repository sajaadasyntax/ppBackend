import { Request } from 'express';

// Extended Express Request with user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    mobileNumber?: string;
    role: string;
    adminLevel: string;
    nationalLevelId?: string | null;
    regionId?: string | null;
    localityId?: string | null;
    adminUnitId?: string | null;
    districtId?: string | null;
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
  nationalLevelId?: string | null;
  regionId?: string | null;
  localityId?: string | null;
  adminUnitId?: string | null;
  districtId?: string | null;
}

// Common response types
export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
}

