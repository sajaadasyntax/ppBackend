const prisma = require('../utils/prisma');
const { comparePassword, generateAccessToken, generateRefreshToken } = require('../utils/auth');
const userService = require('./userService');

// Login user
async function login(email, password) {
  try {
    // Find user by email
    const user = await userService.getUserByEmail(email);
    if (!user) {
      return { error: 'Invalid credentials' };
    }

    // Check password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return { error: 'Invalid credentials' };
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    // Return tokens and user data
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Login error:', error);
    return { error: 'Internal server error' };
  }
}

// Refresh access token
async function refreshToken(token) {
  try {
    // Find refresh token in database
    const savedToken = await prisma.refreshToken.findUnique({
      where: { token }
    });

    if (!savedToken) {
      return { error: 'Invalid refresh token' };
    }

    // Check if token is expired
    if (new Date() > savedToken.expiresAt) {
      // Delete expired token
      await prisma.refreshToken.delete({
        where: { id: savedToken.id }
      });
      return { error: 'Refresh token expired' };
    }

    // Get user
    const user = await userService.getUserById(savedToken.userId);
    if (!user) {
      return { error: 'User not found' };
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

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

    return {
      accessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    console.error('Refresh token error:', error);
    return { error: 'Internal server error' };
  }
}

// Logout user
async function logout(token) {
  try {
    // Delete refresh token from database
    await prisma.refreshToken.deleteMany({
      where: { token }
    });
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    return { error: 'Internal server error' };
  }
}

// Register user
async function register(userData) {
  try {
    // Check if email already exists
    const existingUser = await userService.getUserByEmail(userData.email);
    if (existingUser) {
      return { error: 'Email already in use' };
    }

    // Create user
    const user = await userService.createUser(userData);

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token to database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt
      }
    });

    return {
      user,
      accessToken,
      refreshToken
    };
  } catch (error) {
    console.error('Register error:', error);
    return { error: 'Internal server error' };
  }
}

module.exports = {
  login,
  refreshToken,
  logout,
  register
}; 