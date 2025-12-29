import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as userService from '../services/userService';
import { normalizeMobileNumber } from '../utils/mobileNormalization';
import { comparePassword } from '../utils/auth';
import prisma from '../utils/prisma';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      email, 
      password, 
      phone, 
      mobileNumber,
      firstName,
      lastName,
      fullName,
      regionId,
      localityId,
      adminUnitId,
      districtId,
      expatriateRegionId,
      activeHierarchy
    } = req.body;
    
    // Use mobileNumber if provided, otherwise fall back to phone
    const userMobileNumber = mobileNumber || phone;
    
    if (!userMobileNumber) {
      res.status(400).json({ error: 'Mobile number is required' });
      return;
    }
    
    // Check if user already exists by email (if provided)
    if (email) {
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        res.status(400).json({ error: 'Email already in use' });
        return;
      }
    }
    
    // Build user data object
    const userData: any = {
      email,
      password,
      mobileNumber: userMobileNumber,
      regionId,
      localityId,
      adminUnitId,
      districtId,
      expatriateRegionId,
      activeHierarchy
    };
    
    // Add profile data if provided
    if (firstName || lastName || fullName) {
      userData.profile = {
        firstName: firstName || '',
        lastName: lastName || '',
      };
    }
    
    // Add memberDetails if fullName is provided
    if (fullName) {
      userData.memberDetails = {
        fullName: fullName
      };
    }
    
    // Create new user
    const user = await userService.createUser(userData);
    
    // Generate JWT token with hierarchy information
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        nationalLevelId: user.nationalLevelId || null,
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '24h' }
    );
    
    res.status(201).json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        activeHierarchy: user.activeHierarchy || 'ORIGINAL',
        nationalLevelId: user.nationalLevelId || null,
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null,
        expatriateRegionId: user.expatriateRegionId || null,
        profile: user.profile,
        memberDetails: user.memberDetails
      } 
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Login user
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('========= LOGIN ATTEMPT =========');
    console.log('Client IP:', req.ip);
    
    const { mobileNumber, password } = req.body;
    
    // Check if required fields are provided
    if (!mobileNumber || !password) {
      console.log('Missing mobile number or password');
      res.status(400).json({ error: 'Mobile number and password are required' });
      return;
    }
    
    // Normalize mobile number to E.164 format
    let normalizedMobile: string;
    try {
      normalizedMobile = normalizeMobileNumber(mobileNumber);
      console.log(`Login attempt for normalized mobile: ${normalizedMobile.substring(0, 7)}***`);
    } catch (error: any) {
      console.log('Invalid mobile number format:', error.message);
      res.status(400).json({ error: 'Invalid mobile number format' });
      return;
    }
    
    // Find user by mobile number (normalized)
    let user = await userService.getUserByMobileNumber(normalizedMobile);
    
    // If not found with normalized, try with original format (for existing users created before normalization fix)
    if (!user && mobileNumber !== normalizedMobile) {
      console.log('User not found with normalized mobile, trying original format');
      user = await userService.getUserByMobileNumber(mobileNumber);
      
      // If found with original format, update to normalized format for future logins
      if (user) {
        console.log('Found user with original format, updating to normalized format');
        await userService.updateUser(user.id, { mobileNumber: normalizedMobile });
        // Also update in profile and memberDetails if they exist
        if (user.profile) {
          await prisma.profile.updateMany({
            where: { userId: user.id },
            data: { phoneNumber: normalizedMobile }
          });
        }
        if (user.memberDetails) {
          await prisma.memberDetails.updateMany({
            where: { userId: user.id },
            data: { mobile: normalizedMobile }
          });
        }
      }
    }
    
    if (!user) {
      console.log('User not found for mobile number (tried normalized and original)');
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Block login if profile is not active
    const status = (user as any).profile?.status || 'active';
    if (status !== 'active') {
      res.status(403).json({ error: 'الحساب غير مُفعل. يرجى انتظار تفعيل الحساب من المسؤول.' });
      return;
    }

    // Check password
    try {
      if (!user.password) {
        console.log('User has no password set:', user.email || user.mobileNumber);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      console.log('Comparing password for user:', user.email || user.mobileNumber, 'Password hash exists:', !!user.password);
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        console.log('Password comparison failed for user:', user.email || user.mobileNumber);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      
      console.log('Password verified successfully');
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      res.status(500).json({ error: 'Error validating credentials' });
      return;
    }
    
    // Create special override for default test credentials
    if (password === '123456') {
      console.log('Using special test password override');
      // Create a new hashed password with the special password
      const newHashedPassword = await bcrypt.hash('123456', 10);
      
      // Update the user's password in the database
      await userService.updateUserPassword(user.id, newHashedPassword);
      console.log('Password updated with override hash');
    }
    
    // Generate JWT token with hierarchy information
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        mobileNumber: user.mobileNumber,
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        nationalLevelId: user.nationalLevelId || null,
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null
      },
      process.env.JWT_SECRET || 'your-jwt-secret-key',
      { expiresIn: '24h' }
    );
    
    // Generate refresh token
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
      { expiresIn: '7d' }
    );
    
    // Save refresh token to RefreshToken table
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });
    
    console.log('Login successful for user:', user.email);
    console.log('======== LOGIN COMPLETE ========');
    
    res.json({
      token,
      refreshToken,
      user: {
        id: user.id,
        name: (user as any).profile ? `${(user as any).profile.firstName || ''} ${(user as any).profile.lastName || ''}`.trim() : '',
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        nationalLevelId: user.nationalLevelId || null,
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null,
        // Include hierarchy names if available
        nationalLevelName: (user as any).nationalLevel?.name || null,
        regionName: (user as any).region?.name || null,
        localityName: (user as any).locality?.name || null,
        adminUnitName: (user as any).adminUnit?.name || null,
        districtName: (user as any).district?.name || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token is required' });
      return;
    }
    
    try {
      // Verify refresh token JWT is valid (throws if invalid)
      jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key');
      
      // Find refresh token in database
      const savedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });
      
      if (!savedToken) {
        res.status(401).json({ error: 'Invalid refresh token' });
        return;
      }
      
      // Check if token is expired
      if (new Date() > savedToken.expiresAt) {
        await prisma.refreshToken.delete({
          where: { id: savedToken.id }
        });
        res.status(401).json({ error: 'Refresh token expired' });
        return;
      }
      
      // Get user
      const user = await userService.getUserById(savedToken.userId);
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      // Generate new access token with hierarchy information
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          adminLevel: user.adminLevel || 'USER',
          nationalLevelId: user.nationalLevelId || null,
          regionId: user.regionId || null,
          localityId: user.localityId || null,
          adminUnitId: user.adminUnitId || null,
          districtId: user.districtId || null
        },
        process.env.JWT_SECRET || 'your-jwt-secret-key',
        { expiresIn: '24h' }
      );
      
      // Generate new refresh token
      const newRefreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key',
        { expiresIn: '7d' }
      );
      
      // Update refresh token in database
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
      
      await prisma.refreshToken.update({
        where: { id: savedToken.id },
        data: {
          token: newRefreshToken,
          expiresAt
        }
      });
      
      res.json({ token, refreshToken: newRefreshToken });
    } catch (error) {
      res.status(401).json({ error: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
export const logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // If using refresh tokens, invalidate all refresh tokens for this user
    const userId = req.user!.id;
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify token validity
export const verifyToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body;
    
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-secret-key') as { id: string };
      
      // Check if user exists
      const user = await userService.getUserById(decoded.id);
      if (!user) {
        res.status(401).json({ valid: false, error: 'Invalid token - user not found' });
        return;
      }
      
      // Token is valid
      res.json({ valid: true });
    } catch (error: any) {
      console.log('Token verification failed:', error.message);
      res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
};

