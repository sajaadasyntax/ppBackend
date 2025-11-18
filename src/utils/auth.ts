import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { UserPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key';

export const generateAccessToken = (user: UserPayload): string => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      mobileNumber: user.mobileNumber,
      role: user.role,
      adminLevel: user.adminLevel,
      nationalLevelId: user.nationalLevelId,
      regionId: user.regionId,
      localityId: user.localityId,
      adminUnitId: user.adminUnitId,
      districtId: user.districtId
    }, 
    JWT_SECRET, 
    { expiresIn: '15m' }
  );
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

