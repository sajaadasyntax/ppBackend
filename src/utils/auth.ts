import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UserPayload } from '../types';

// ── SECURITY: Fail loudly if JWT secrets are missing or insecure in production ──
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-jwt-secret-key') {
    throw new Error('FATAL: JWT_SECRET must be set to a cryptographically random value in production.');
  }
  if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET === 'your-jwt-refresh-secret-key') {
    throw new Error('FATAL: JWT_REFRESH_SECRET must be set to a cryptographically random value in production.');
  }
}

export const generateAccessToken = (user: UserPayload): string => {
  // Build the payload with hierarchy-aware claims.
  // When activeHierarchy is SECTOR or EXPATRIATE, we include those IDs
  // so middleware can scope content to the currently-active hierarchy.
  const payload: Record<string, any> = {
    id: user.id,
    email: user.email,
    mobileNumber: user.mobileNumber,
    role: user.role,
    adminLevel: user.adminLevel,
    activeHierarchy: user.activeHierarchy || 'ORIGINAL',
    // Original (geographic) hierarchy IDs - always included
    nationalLevelId: user.nationalLevelId,
    regionId: user.regionId,
    localityId: user.localityId,
    adminUnitId: user.adminUnitId,
    districtId: user.districtId,
  };

  // Include sector hierarchy IDs when present
  if (user.sectorNationalLevelId) payload.sectorNationalLevelId = user.sectorNationalLevelId;
  if (user.sectorRegionId) payload.sectorRegionId = user.sectorRegionId;
  if (user.sectorLocalityId) payload.sectorLocalityId = user.sectorLocalityId;
  if (user.sectorAdminUnitId) payload.sectorAdminUnitId = user.sectorAdminUnitId;
  if (user.sectorDistrictId) payload.sectorDistrictId = user.sectorDistrictId;

  // Include expatriate hierarchy IDs when present
  if (user.expatriateRegionId) payload.expatriateRegionId = user.expatriateRegionId;

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
};

export const generateRefreshToken = (user: { id: string }): string => {
  return jwt.sign(
    { 
      id: user.id 
    }, 
    JWT_REFRESH_SECRET, 
    { expiresIn: '7d' }
  );
};

export const verifyAccessToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
    console.log('Token verified successfully:', decoded);
    return decoded;
  } catch (error: any) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

export const verifyRefreshToken = (token: string): { id: string } | null => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { id: string };
  } catch (error) {
    return null;
  }
};

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

