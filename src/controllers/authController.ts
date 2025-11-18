import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as userService from '../services/userService';
import { normalizeMobileNumber } from '../utils/mobileNormalization';

// Register a new user
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      res.status(400).json({ error: 'Email already in use' });
      return;
    }
    
    // Create new user
    const user = await userService.createUser({ name, email, password, phone });
    
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
        name: user.name, 
        email: user.email, 
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        nationalLevelId: user.nationalLevelId || null,
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null
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
    console.log('Login request received:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Client IP:', req.ip);
    
    const { mobileNumber, password } = req.body;
    
    // Check if required fields are provided
    if (!mobileNumber || !password) {
      console.log('Missing mobile number or password');
      res.status(400).json({ error: 'Mobile number and password are required' });
      return;
    }
    
    console.log(`Login attempt with mobile number: ${mobileNumber}, password: ${password}`);
    
    // Normalize mobile number to E.164 format
    let normalizedMobile: string;
    try {
      normalizedMobile = normalizeMobileNumber(mobileNumber);
      console.log(`Normalized mobile number: ${normalizedMobile}`);
    } catch (error: any) {
      console.log('Invalid mobile number format:', error.message);
      res.status(400).json({ error: 'Invalid mobile number format' });
      return;
    }
    
    // Find user by mobile number
    let user = await userService.getUserByMobileNumber(normalizedMobile);
    
    if (!user) {
      console.log('User not found by mobile number:', mobileNumber);
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    
    // Debug user found
    console.log('User found:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      hashedPassword: user.password ? user.password.substring(0, 10) + '...' : 'not set'
    });
    
    // Block login if profile is not active
    const status = (user as any).profile?.status || 'active';
    if (status !== 'active') {
      res.status(403).json({ error: 'الحساب غير مُفعل. يرجى انتظار تفعيل الحساب من المسؤول.' });
      return;
    }

    // Check password
    try {
      console.log(`Comparing password "${password}" with hash "${user.password}"`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid?', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('Invalid password for user:', user.email);
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
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
    
    // Save refresh token to user record
    await userService.updateUser(user.id, { refreshToken });
    
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
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-jwt-refresh-secret-key') as { id: string };
      
      // Find user by id and check if refresh token matches
      const user = await userService.getUserById(decoded.id);
      if (!user || (user as any).refreshToken !== refreshToken) {
        res.status(401).json({ error: 'Invalid refresh token' });
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
      
      res.json({ token });
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
    // If using refresh tokens, invalidate the refresh token
    const userId = req.user!.id;
    await userService.updateUser(userId, { refreshToken: null });
    
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

