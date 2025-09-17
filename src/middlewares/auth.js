const { verifyAccessToken } = require('../utils/auth');

const authenticate = (req, res, next) => {
  console.log('🔐 Authentication middleware called');
  console.log('📝 Request URL:', req.url);
  console.log('📋 Request headers:', JSON.stringify(req.headers));
  
  // Get the token from headers
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('❌ No token provided in headers');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  // Extract token
  const token = authHeader.split(' ')[1];
  console.log('🔑 Token extracted from headers:', token.substring(0, 20) + '...');
  
  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    console.log('❌ Token verification failed');
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
  
  // Print detailed user info
  console.log('✅ Token verified successfully, user:', JSON.stringify({
    id: decoded.id,
    email: decoded.email,
    adminLevel: decoded.adminLevel,
    role: decoded.role,
    regionId: decoded.regionId,
    localityId: decoded.localityId,
    adminUnitId: decoded.adminUnitId,
    districtId: decoded.districtId
  }, null, 2));
  
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

// Enforce role-based access restrictions for different applications
const restrictToUserRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
  }
  
  // Only allow USER role for mobile app and web app
  if (req.user.role !== 'USER') {
    return res.status(403).json({ 
      error: 'Forbidden - This application is only accessible to regular users. Please use the admin panel.' 
    });
  }
  
  next();
};

const restrictToAdminRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized - User not authenticated' });
  }
  
  // Only allow ADMIN role for admin panel
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ 
      error: 'Forbidden - This application is only accessible to administrators.' 
    });
  }
  
  next();
};

module.exports = { authenticate, authorize, authorizeRoles, authorizeHierarchy, restrictToUserRole, restrictToAdminRole }; 