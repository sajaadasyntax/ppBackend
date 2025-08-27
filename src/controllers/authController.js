const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userService = require('../services/userService');

// Register a new user
exports.register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
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
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null
      },
      process.env.JWT_SECRET,
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
exports.login = async (req, res) => {
  try {
    console.log('========= LOGIN ATTEMPT =========');
    console.log('Login request received:', req.body);
    console.log('Request headers:', req.headers);
    console.log('Client IP:', req.ip);
    
    const { email, password } = req.body;
    
    // Check if required fields are provided
    if (!email || !password) {
      console.log('Missing email or password');
      return res.status(400).json({ error: 'Email/Phone and password are required' });
    }
    
    console.log(`Login attempt with identifier: ${email}, password: ${password}`);
    
    // Try to find user by email first, then by phone number if not found
    let user = await userService.getUserByEmail(email);
    
    // If user not found by email, try by phone number
    if (!user) {
      console.log('User not found by email, trying phone number:', email);
      user = await userService.getUserByPhone(email);
    }
    
    if (!user) {
      console.log('User not found by email or phone:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Debug user found
    console.log('User found:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      hashedPassword: user.password ? user.password.substring(0, 10) + '...' : 'not set'
    });
    
    // Check password
    try {
      console.log(`Comparing password "${password}" with hash "${user.password}"`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      console.log('Password valid?', isPasswordValid);
      
      if (!isPasswordValid) {
        console.log('Invalid password for user:', user.email);
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (passwordError) {
      console.error('Password comparison error:', passwordError);
      return res.status(500).json({ error: 'Error validating credentials' });
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
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
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
        name: user.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : '',
        email: user.email,
        role: user.role,
        adminLevel: user.adminLevel || 'USER',
        regionId: user.regionId || null,
        localityId: user.localityId || null,
        adminUnitId: user.adminUnitId || null,
        districtId: user.districtId || null,
        // Include region/locality names if available
        regionName: user.region?.name || null,
        localityName: user.locality?.name || null,
        adminUnitName: user.adminUnit?.name || null,
        districtName: user.district?.name || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }
    
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      
      // Find user by id and check if refresh token matches
      const user = await userService.getUserById(decoded.id);
      if (!user || user.refreshToken !== refreshToken) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }
      
      // Generate new access token with hierarchy information
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role,
          adminLevel: user.adminLevel || 'USER',
          regionId: user.regionId || null,
          localityId: user.localityId || null,
          adminUnitId: user.adminUnitId || null,
          districtId: user.districtId || null
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      res.json({ token });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Logout user
exports.logout = async (req, res) => {
  try {
    // If using refresh tokens, invalidate the refresh token
    const userId = req.user.id;
    await userService.updateUser(userId, { refreshToken: null });
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Verify token validity
exports.verifyToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Check if user exists
      const user = await userService.getUserById(decoded.id);
      if (!user) {
        return res.status(401).json({ valid: false, error: 'Invalid token - user not found' });
      }
      
      // Token is valid
      res.json({ valid: true });
    } catch (error) {
      console.log('Token verification failed:', error.message);
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ valid: false, error: 'Internal server error' });
  }
}; 