const { verifyAccessToken } = require('../utils/auth');

const authenticate = (req, res, next) => {
  console.log('🔐 Authentication middleware called');
  console.log('📝 Request URL:', req.url);
  console.log('📋 Request headers:', req.headers);
  
  // Get the token from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No token provided in headers');
    
    // For testing purposes, use a default ADMIN user for hierarchy endpoints
    // REMOVE THIS IN PRODUCTION
    if (req.url.includes('hierarchy-management')) {
      console.log('🔧 Using default ADMIN test user for hierarchy endpoints');
      req.user = { 
        id: 'cb3ce8cb-251d-49a9-be47-e8573b5a856d',
        email: 'admin@pp.com',
        role: 'ADMIN',
        adminLevel: 'ADMIN',
        regionId: null,
        localityId: null,
        adminUnitId: null,
        districtId: null
      };
      return next();
    } else {
      console.log('🔧 Using default USER test user for other endpoints');
      req.user = { 
        id: 'cb3ce8cb-251d-49a9-be47-e8573b5a856d',
        email: '116461085@example.com',
        role: 'USER',
        adminLevel: 'USER',
        regionId: null,
        localityId: null,
        adminUnitId: null,
        districtId: null
      };
      return next();
    }
    
    // Uncomment this in production:
    // return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];
  console.log('🔑 Token extracted from headers:', token.substring(0, 20) + '...');
  
  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    console.log('❌ Token verification failed');
    
    // For development, if token verification fails, still allow with fallback user
    console.log('🔧 Token verification failed, using fallback ADMIN user for development');
    req.user = { 
      id: 'cb3ce8cb-251d-49a9-be47-e8573b5a856d',
      email: 'admin@pp.com',
      role: 'ADMIN',
      adminLevel: 'ADMIN',
      regionId: null,
      localityId: null,
      adminUnitId: null,
      districtId: null
    };
    return next();
    
    // Uncomment this in production:
    // return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
  
  console.log('✅ Token verified successfully, user:', decoded);
  
  // Set user on request object
  req.user = decoded;
  next();
};

// Check if user has required role (legacy support)
const authorize = (roles = []) => {
  return (req, res, next) => {
    // Check if user exists (should be set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If roles not provided as array, make it an array
    if (typeof roles === 'string') {
      roles = [roles];
    }

    // Check if user has required role
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

// Check if user has required adminLevel
const authorizeRoles = (allowedLevels = []) => {
  return (req, res, next) => {
    // Check if user exists (should be set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // If levels not provided as array, make it an array
    if (typeof allowedLevels === 'string') {
      allowedLevels = [allowedLevels];
    }
    
    // GENERAL_SECRETARIAT has access to everything
    if (req.user.adminLevel === 'GENERAL_SECRETARIAT' || req.user.role === 'GENERAL_SECRETARIAT') {
      return next();
    }
    
    // ADMIN has access to everything as well
    if (req.user.adminLevel === 'ADMIN' || req.user.role === 'ADMIN') {
      return next();
    }
    
    // Check if user has required admin level
    const userAdminLevel = req.user.adminLevel || req.user.role;
    if (allowedLevels.length && !allowedLevels.includes(userAdminLevel)) {
      return res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
    }

    next();
  };
};

// Check if user belongs to a specific region in the hierarchy
const authorizeHierarchy = (level, idParam) => {
  return (req, res, next) => {
    // Check if user exists (should be set by authenticate middleware)
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // GENERAL_SECRETARIAT and ADMIN have access to everything
    if (req.user.adminLevel === 'GENERAL_SECRETARIAT' || req.user.adminLevel === 'ADMIN' ||
        req.user.role === 'GENERAL_SECRETARIAT' || req.user.role === 'ADMIN') {
      return next();
    }
    
    const resourceId = req.params[idParam];
    
    // If no resource ID, skip the check
    if (!resourceId) {
      return next();
    }
    
    // Check based on level in hierarchy
    switch (level) {
      case 'region':
        // User must be in the same region
        if (req.user.regionId === resourceId) {
          return next();
        }
        break;
      case 'locality':
        // User must be in the same locality or be a region admin for the locality's region
        if (req.user.localityId === resourceId) {
          return next();
        }
        break;
      case 'adminUnit':
        // User must be in the same admin unit or higher in hierarchy
        if (req.user.adminUnitId === resourceId) {
          return next();
        }
        break;
      case 'district':
        // User must be in the same district or higher in hierarchy
        if (req.user.districtId === resourceId) {
          return next();
        }
        break;
      default:
        // If level is unknown, deny access
        return res.status(403).json({ error: 'Forbidden - Invalid hierarchy level' });
    }
    
    // If we got here, user doesn't have the necessary hierarchy access
    return res.status(403).json({ error: 'Forbidden - Insufficient hierarchy permissions' });
  };
};

module.exports = { authenticate, authorize, authorizeRoles, authorizeHierarchy }; 