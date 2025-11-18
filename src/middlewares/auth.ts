import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/auth';
import { AuthenticatedRequest } from '../types';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔐 Authentication middleware called');
  console.log('📝 Request URL:', req.url);
  console.log('📋 Request headers:', JSON.stringify(req.headers));
  
  // Get the token from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No token provided in headers');
    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  // Extract token
  const token = authHeader.split(' ')[1];
  console.log('🔑 Token extracted from headers:', token.substring(0, 20) + '...');
  
  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    console.log('❌ Token verification failed');
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
    return;
  }
  
  // Print detailed user info
  console.log('✅ Token verified successfully, user:', JSON.stringify({
    id: decoded.id,
    email: decoded.email,
    adminLevel: decoded.adminLevel,
    role: decoded.role,
    nationalLevelId: decoded.nationalLevelId,
    regionId: decoded.regionId,
    localityId: decoded.localityId,
    adminUnitId: decoded.adminUnitId,
    districtId: decoded.districtId
  }, null, 2));
  
  // Set user on request object
  (req as AuthenticatedRequest).user = decoded;
  next();
};

// Check if user has required role (legacy support)
export const authorize = (roles: string | string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    // Check if user exists (should be set by authenticate middleware)
    if (!authReq.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // If roles not provided as array, make it an array
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    // Check if user has required role
    if (rolesArray.length && !rolesArray.includes(authReq.user.role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};

// Check if user has required adminLevel
export const authorizeRoles = (allowedLevels: string | string[] = []) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    // Check if user exists (should be set by authenticate middleware)
    if (!authReq.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // If levels not provided as array, make it an array
    const levelsArray = Array.isArray(allowedLevels) ? allowedLevels : [allowedLevels];
    
    // GENERAL_SECRETARIAT has access to everything
    if (authReq.user.adminLevel === 'GENERAL_SECRETARIAT' || authReq.user.role === 'GENERAL_SECRETARIAT') {
      next();
      return;
    }
    
    // ADMIN has access to everything as well
    if (authReq.user.adminLevel === 'ADMIN' || authReq.user.role === 'ADMIN') {
      next();
      return;
    }
    
    // Check if user has required admin level
    const userAdminLevel = authReq.user.adminLevel || authReq.user.role;
    if (levelsArray.length && !levelsArray.includes(userAdminLevel)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};

// Check if user belongs to a specific region in the hierarchy
export const authorizeHierarchy = (level: string, idParam: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    
    // Check if user exists (should be set by authenticate middleware)
    if (!authReq.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // GENERAL_SECRETARIAT and ADMIN have access to everything
    if (authReq.user.adminLevel === 'GENERAL_SECRETARIAT' || authReq.user.adminLevel === 'ADMIN' ||
        authReq.user.role === 'GENERAL_SECRETARIAT' || authReq.user.role === 'ADMIN') {
      next();
      return;
    }
    
    const resourceId = req.params[idParam];
    
    // If no resource ID, skip the check
    if (!resourceId) {
      next();
      return;
    }
    
    // Check based on level in hierarchy
    switch (level) {
      case 'region':
        // User must be in the same region
        if (authReq.user.regionId === resourceId) {
          next();
          return;
        }
        break;
      case 'locality':
        // User must be in the same locality or be a region admin for the locality's region
        if (authReq.user.localityId === resourceId) {
          next();
          return;
        }
        break;
      case 'adminUnit':
        // User must be in the same admin unit or higher in hierarchy
        if (authReq.user.adminUnitId === resourceId) {
          next();
          return;
        }
        break;
      case 'district':
        // User must be in the same district or higher in hierarchy
        if (authReq.user.districtId === resourceId) {
          next();
          return;
        }
        break;
      default:
        // If level is unknown, deny access
        res.status(403).json({ error: 'Forbidden - Invalid hierarchy level' });
        return;
    }
    
    // If we got here, user doesn't have the necessary hierarchy access
    res.status(403).json({ error: 'Forbidden - Insufficient hierarchy permissions' });
  };
};

// Enforce role-based access restrictions for different applications
export const restrictToUserRole = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    return;
  }
  
  // Only allow USER role for mobile app and web app
  if (authReq.user.role !== 'USER') {
    res.status(403).json({ 
      error: 'Forbidden - This application is only accessible to regular users. Please use the admin panel.' 
    });
    return;
  }
  
  next();
};

export const restrictToAdminRole = (req: Request, res: Response, next: NextFunction): void => {
  const authReq = req as AuthenticatedRequest;
  
  if (!authReq.user) {
    res.status(401).json({ error: 'Unauthorized - User not authenticated' });
    return;
  }
  
  // Only allow ADMIN role for admin panel
  if (authReq.user.role !== 'ADMIN') {
    res.status(403).json({ 
      error: 'Forbidden - This application is only accessible to administrators.' 
    });
    return;
  }
  
  next();
};

// Alias for restrictToAdminRole
export const requireAdmin = restrictToAdminRole;

