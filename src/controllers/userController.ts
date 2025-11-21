import userService from '../services/userService';
import prisma from '../utils/prisma';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

// Get all users with pagination and hierarchical access control
export const getAllUsers = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const page = parseInt(String(req.query.page || '1')) || 1;
    const limit = parseInt(String(req.query.limit || '10')) || 10;
    const adminUser = req.user; // Get the admin user from authentication middleware

    const result = await userService.getAllUsers(page, limit, adminUser);
    res.json(result);
  } catch (error: any) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
export const getUserById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get detailed member data by ID
export const getMemberDetails = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const memberDetails = await userService.getMemberDetails(id);

    if (!memberDetails) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    res.json(memberDetails);
  } catch (error: any) {
    console.error('Get member details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new user
export const createUser = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { email, password, role, firstName, lastName, phoneNumber, avatarUrl } = req.body;

    // Validate inputs
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Prepare user data
    const userData = {
      email,
      password,
      role,
      profile: {
        firstName,
        lastName,
        phoneNumber,
        avatarUrl
      }
    };

    // Create user
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new member with detailed information
export const createMember = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { personalInfo, residenceInfo, educationAndWork, additionalInfo, politicalAndSocialActivity, hierarchyInfo, password, publicSignup } = req.body;
    
    // Validate required fields
    const missingFields: string[] = [];
    if (!personalInfo?.fullName) missingFields.push('fullName');
    if (!personalInfo?.nationalId) missingFields.push('nationalId');
    if (!residenceInfo?.mobile) missingFields.push('mobile');
    if (!residenceInfo?.email) missingFields.push('email');
    
    if (missingFields.length > 0) {
      res.status(400).json({ 
        error: `الحقول المطلوبة مفقودة: ${missingFields.join(', ')}` 
      });
      return;
    }
    
    // Validate hierarchy selection - districtId is REQUIRED
    if (!hierarchyInfo || !hierarchyInfo.districtId) {
      res.status(400).json({ 
        error: 'يجب اختيار الحي (District) للعضو - المستخدمون يجب أن يكونوا في مستوى الحي فقط' 
      });
      return;
    }
    
    // Check if user already exists with the same email
    const existingUser = await userService.getUserByEmail(residenceInfo.email);
    if (existingUser) {
      res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
      return;
    }

    // Check if user already exists with the same mobile number
    const existingByMobile = await userService.getUserByMobileNumber(residenceInfo.mobile);
    if (existingByMobile) {
      res.status(409).json({ error: 'رقم الجوال مستخدم بالفعل' });
      return;
    }
    
    // Generate a random password (can be changed later) unless provided (public signup)
    const tempPassword = password && password.length >= 6 ? password : Math.random().toString(36).slice(-8);
    
    // Fetch district to get parent hierarchy IDs and names
    const district = await prisma.district.findUnique({
      where: { id: hierarchyInfo.districtId },
      include: {
        adminUnit: {
          include: {
            locality: {
              include: {
                region: true
              }
            }
          }
        }
      }
    });

    if (!district) {
      res.status(400).json({ error: 'الحي المحدد غير موجود' });
      return;
    }

    // Get names from district hierarchy for memberDetails
    const regionName = district.adminUnit.locality.region.name;
    const localityName = district.adminUnit.locality.name;
    
    // Prepare user data with basic information
    // Parent IDs will be auto-derived by userService.createUser from districtId
    const userData = {
      email: residenceInfo.email,
      password: tempPassword,
      role: 'USER', // Default role for new members
      mobileNumber: residenceInfo.mobile,
      // Only pass districtId - parent IDs will be auto-derived
      districtId: district.id,
      profile: {
        firstName: personalInfo.fullName.split(' ')[0] || '',
        lastName: personalInfo.fullName.split(' ').slice(1).join(' ') || '',
        phoneNumber: residenceInfo.mobile,
        // If it's a public signup, require admin activation
        status: publicSignup ? 'disabled' : 'active'
      },
      // Add the new memberDetails object
      memberDetails: {
        // Personal Information
        fullName: personalInfo.fullName,
        nickname: personalInfo.nickname,
        birthDate: personalInfo.birthDate,
        birthPlace: personalInfo.birthPlace,
        birthLocality: personalInfo.birthLocality,
        birthState: personalInfo.birthState,
        gender: personalInfo.gender,
        religion: personalInfo.religion,
        maritalStatus: personalInfo.maritalStatus,
        nationalId: personalInfo.nationalId,
        nationalIdIssueDate: personalInfo.nationalIdIssueDate,
        passportNumber: personalInfo.passportNumber,
        
        // Residence Information
        neighborhood: residenceInfo.neighborhood,
        locality: localityName,
        state: regionName,
        phone: residenceInfo.phone,
        mobile: residenceInfo.mobile,
        
        // Education and Work
        highestEducation: educationAndWork?.highestEducation,
        educationInstitution: educationAndWork?.educationInstitution,
        graduationYear: educationAndWork?.graduationYear,
        currentJob: educationAndWork?.currentJob,
        jobSector: educationAndWork?.jobSector,
        employmentStatus: educationAndWork?.employmentStatus,
        workAddress: educationAndWork?.workAddress,
        
        // Additional Information
        disability: additionalInfo?.disability,
        residenceAbroad: additionalInfo?.residenceAbroad,
        electoralDistrict: additionalInfo?.electoralDistrict,
        
        // Political and Social Activity
        previousCouncilMembership: politicalAndSocialActivity?.previousCouncilMembership,
        previousPartyMembership: politicalAndSocialActivity?.previousPartyMembership,
        civilSocietyParticipation: politicalAndSocialActivity?.civilSocietyParticipation,
        clubMembership: politicalAndSocialActivity?.clubMembership,
        professionalMembership: politicalAndSocialActivity?.professionalMembership
      }
    };
    
    // Create user with all the detailed information
    const user = await userService.createUser(userData);
    
    // Format the response to match the expected format
    const memberResponse = {
      id: user.id,
      userId: user.id,
      userName: personalInfo.fullName,
      level: user.role,
      status: 'active',
      email: residenceInfo.email,
      phone: residenceInfo.mobile,
      joinDate: new Date().toISOString().split('T')[0],
      // Include the temporary password in the response so it can be shared with the member
      tempPassword: tempPassword
    };
    
    res.status(201).json(memberResponse);
  } catch (error: any) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user
export const updateUser = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, password, role, firstName, lastName, phoneNumber, avatarUrl } = req.body;

    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prepare user data
    const userData = {
      email,
      password,
      role,
      profile: {
        firstName,
        lastName,
        phoneNumber,
        avatarUrl
      }
    };

    // Update user
    const updatedUser = await userService.updateUser(id, userData);
    res.json(updatedUser);
  } catch (error: any) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
export const deleteUser = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Delete user
    await userService.deleteUser(id);
    res.status(204).end();
  } catch (error: any) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
export const getCurrentUser = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await userService.getUserById(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Alias for getCurrentUser
export const getUserProfile = getCurrentUser;

// Get all memberships for admin panel with hierarchical access control
export const getMemberships = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { status, role } = req.query;
    const adminUser = req.user; // Get the admin user from authentication middleware
    
    const memberships = await userService.getMemberships(status as string, role as string, adminUser);
    res.json(memberships);
  } catch (error: any) {
    console.error('Get memberships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update membership status
export const updateMembershipStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['active', 'disabled'].includes(status)) {
      res.status(400).json({ error: 'Invalid status value. Must be "active" or "disabled"' });
      return;
    }
    
    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Update user profile with new status
    const updatedUser = await userService.updateUser(id, {
      profile: {
        ...(user.profile || {}),
        status
      }
    });
    
    // Format response as membership
    const membership = {
      id: updatedUser.id,
      userId: updatedUser.id,
      userName: updatedUser.profile ? 
        `${updatedUser.profile.firstName || ''} ${updatedUser.profile.lastName || ''}`.trim() || updatedUser.email : 
        updatedUser.email,
      level: updatedUser.role || "USER",
      status: updatedUser.profile?.status || 'active',
      email: updatedUser.email,
      phone: updatedUser.profile?.phoneNumber || '',
      joinDate: updatedUser.createdAt.toISOString().split('T')[0]
    };
    
    res.json(membership);
  } catch (error: any) {
    console.error('Update membership status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset user password (admin only)
export const resetPassword = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    // Check if the requester is an admin
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Unauthorized. Only administrators can reset passwords.' });
      return;
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long' });
      return;
    }
    
    // Update user with new password
    await userService.updateUser(id, {
      password: newPassword
    });
    
    // Return success message
    res.json({ 
      message: 'Password reset successfully',
      userId: id,
      email: user.email
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Step-by-step hierarchy selection endpoints for user creation

// Get all regions for initial selection
export const getRegionsForUserCreation = async (_req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const regions = await prisma.region.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        code: true,
        description: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(regions);
  } catch (error: any) {
    console.error('Error fetching regions for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

// Get localities by region for user creation
export const getLocalitiesForUserCreation = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { regionId } = req.params;
    
    const localities = await prisma.locality.findMany({
      where: { 
        regionId,
        active: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        regionId: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(localities);
  } catch (error: any) {
    console.error('Error fetching localities for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch localities' });
  }
};

// Get admin units by locality for user creation
export const getAdminUnitsForUserCreation = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { localityId } = req.params;
    
    const adminUnits = await prisma.adminUnit.findMany({
      where: { 
        localityId,
        active: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        localityId: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(adminUnits);
  } catch (error: any) {
    console.error('Error fetching admin units for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch admin units' });
  }
};

// Get districts by admin unit for user creation
export const getDistrictsForUserCreation = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { adminUnitId } = req.params;
    
    const districts = await prisma.district.findMany({
      where: { 
        adminUnitId,
        active: true 
      },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        adminUnitId: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(districts);
  } catch (error: any) {
    console.error('Error fetching districts for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
};

// Create user with hierarchy assignment
export const createUserWithHierarchy = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { 
      email, 
      password, 
      role, 
      adminLevel,
      firstName, 
      lastName, 
      phoneNumber, 
      avatarUrl,
      districtId
    } = req.body;

    console.log('Create user with hierarchy - Request body:', req.body);

    // Validate inputs
    if (!email || !password) {
      console.log('Validation failed: Email or password missing');
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!firstName || !lastName) {
      console.log('Validation failed: First name or last name missing', { firstName, lastName });
      res.status(400).json({ error: 'First name and last name are required' });
      return;
    }

    // IMPORTANT: All users (except root admins) MUST have districtId
    const isRootAdmin = adminLevel === 'GENERAL_SECRETARIAT' || adminLevel === 'ADMIN' || role === 'ADMIN';
    
    if (!isRootAdmin && !districtId) {
      res.status(400).json({ error: 'District selection is required for all users (except root admins). Users must exist at district level.' });
      return;
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: 'Email already in use' });
      return;
    }

    // Prepare user data with hierarchy assignment
    const userData: any = {
      email,
      password,
      role: role || 'USER',
      adminLevel: adminLevel || 'USER',
      profile: {
        firstName,
        lastName,
        phoneNumber,
        avatarUrl
      }
    };

    // Fetch region and locality names to ensure consistency
    let regionName = '';
    let localityName = '';
    
    // Add hierarchy assignment - only pass districtId, parent IDs will be auto-derived
    if (districtId && !isRootAdmin) {
      // Fetch district to get parent hierarchy names
      const district = await prisma.district.findUnique({
        where: { id: districtId },
        include: {
          adminUnit: {
            include: {
              locality: {
                include: {
                  region: true
                }
              }
            }
          }
        }
      });

      if (district) {
        regionName = district.adminUnit.locality.region.name;
        localityName = district.adminUnit.locality.name;
        // Only pass districtId - userService.createUser will auto-derive parent IDs
        userData.districtId = districtId;
      }
    }
    
    // Add memberDetails to maintain consistency with hierarchy
    userData.memberDetails = {
      fullName: `${firstName} ${lastName}`.trim(),
      locality: localityName,
      state: regionName,
      mobile: phoneNumber
    };

    // Create user
    const user = await userService.createUser(userData);
    
    // Fetch the created user with hierarchy information
    const userWithHierarchy = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        region: true,
        locality: {
          include: { region: true }
        },
        adminUnit: {
          include: {
            locality: { include: { region: true } }
          }
        },
        district: {
          include: {
            adminUnit: {
              include: {
                locality: { include: { region: true } }
              }
            }
          }
        }
      }
    });
    
    res.status(201).json(userWithHierarchy);
  } catch (error: any) {
    console.error('Create user with hierarchy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user hierarchy assignment
export const updateUserHierarchy = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { 
      hierarchyLevel,
      regionId,
      localityId,
      adminUnitId,
      districtId
    } = req.body;

    // Prepare update data
    const updateData = {
      regionId: null,
      localityId: null,
      adminUnitId: null,
      districtId: null
    };

    // Add hierarchy assignment based on selected level
    if (hierarchyLevel && hierarchyLevel !== 'none') {
      switch (hierarchyLevel) {
        case 'region':
          updateData.regionId = regionId;
          break;
        case 'locality':
          updateData.regionId = regionId;
          updateData.localityId = localityId;
          break;
        case 'adminUnit':
          updateData.regionId = regionId;
          updateData.localityId = localityId;
          updateData.adminUnitId = adminUnitId;
          break;
        case 'district':
          updateData.regionId = regionId;
          updateData.localityId = localityId;
          updateData.adminUnitId = adminUnitId;
          updateData.districtId = districtId;
          break;
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        profile: true,
        region: true,
        locality: {
          include: { region: true }
        },
        adminUnit: {
          include: {
            locality: { include: { region: true } }
          }
        },
        district: {
          include: {
            adminUnit: {
              include: {
                locality: { include: { region: true } }
              }
            }
          }
        }
      }
    });

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Update user hierarchy error:', error);
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's full hierarchy path
export const getUserHierarchyPath = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        region: true,
        locality: {
          include: { region: true }
        },
        adminUnit: {
          include: {
            locality: { include: { region: true } }
          }
        },
        district: {
          include: {
            adminUnit: {
              include: {
                locality: { include: { region: true } }
              }
            }
          }
        }
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Build hierarchy path
    interface HierarchyPathItem {
      level: string;
      id: string;
      name: string;
      code: string | null;
    }
    const hierarchyPath: HierarchyPathItem[] = [];
    
    if (user.district) {
      hierarchyPath.push({
        level: 'region',
        id: user.district.adminUnit.locality.region.id,
        name: user.district.adminUnit.locality.region.name,
        code: user.district.adminUnit.locality.region.code
      });
      hierarchyPath.push({
        level: 'locality',
        id: user.district.adminUnit.locality.id,
        name: user.district.adminUnit.locality.name,
        code: user.district.adminUnit.locality.code
      });
      hierarchyPath.push({
        level: 'adminUnit',
        id: user.district.adminUnit.id,
        name: user.district.adminUnit.name,
        code: user.district.adminUnit.code
      });
      hierarchyPath.push({
        level: 'district',
        id: user.district.id,
        name: user.district.name,
        code: user.district.code
      });
    } else if (user.adminUnit) {
      hierarchyPath.push({
        level: 'region',
        id: user.adminUnit.locality.region.id,
        name: user.adminUnit.locality.region.name,
        code: user.adminUnit.locality.region.code
      });
      hierarchyPath.push({
        level: 'locality',
        id: user.adminUnit.locality.id,
        name: user.adminUnit.locality.name,
        code: user.adminUnit.locality.code
      });
      hierarchyPath.push({
        level: 'adminUnit',
        id: user.adminUnit.id,
        name: user.adminUnit.name,
        code: user.adminUnit.code
      });
    } else if (user.locality) {
      hierarchyPath.push({
        level: 'region',
        id: user.locality.region.id,
        name: user.locality.region.name,
        code: user.locality.region.code
      });
      hierarchyPath.push({
        level: 'locality',
        id: user.locality.id,
        name: user.locality.name,
        code: user.locality.code
      });
    } else if (user.region) {
      hierarchyPath.push({
        level: 'region',
        id: user.region.id,
        name: user.region.name,
        code: user.region.code
      });
    }

    res.json({
      userId: user.id,
      email: user.email,
      hierarchyPath,
      currentLevel: hierarchyPath.length > 0 ? hierarchyPath[hierarchyPath.length - 1].level : 'none'
    });
  } catch (error: any) {
    console.error('Get user hierarchy path error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user's active hierarchy preference
 */
export const updateActiveHierarchy = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { activeHierarchy } = req.body;
    
    // Validate activeHierarchy value
    const validHierarchies = ['ORIGINAL', 'EXPATRIATE', 'SECTOR'];
    if (!validHierarchies.includes(activeHierarchy)) {
      res.status(400).json({ 
        error: 'Invalid hierarchy type. Must be ORIGINAL, EXPATRIATE, or SECTOR' 
      });
      return;
    }
    
    // Update user's active hierarchy
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activeHierarchy },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        activeHierarchy: true,
        profile: true
      }
    });
    
    res.json({
      message: 'Active hierarchy updated successfully',
      user: updatedUser
    });
  } catch (error: any) {
    console.error('Update active hierarchy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get available users who can be assigned as admins for hierarchy levels
 */
export const getAvailableAdmins = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { level, hierarchyId } = req.query;
    
    if (!level) {
      res.status(400).json({ error: 'Level parameter is required' });
      return;
    }

    // IMPORTANT: Users only exist at district level
    // We need to find all districts under the requested hierarchy level
    let districtIds: string[] = [];

    switch (level) {
      case 'national':
      case 'nationalLevel':
        if (hierarchyId) {
          // Get all districts under all regions in this national level
          const regions = await prisma.region.findMany({
            where: { nationalLevelId: hierarchyId as string },
            select: { id: true }
          });
          
          const regionIds = regions.map(r => r.id);
          
          const localities = await prisma.locality.findMany({
            where: { regionId: { in: regionIds } },
            select: { id: true }
          });
          
          const localityIds = localities.map(l => l.id);
          
          const adminUnits = await prisma.adminUnit.findMany({
            where: { localityId: { in: localityIds } },
            select: { id: true }
          });
          
          const adminUnitIds = adminUnits.map(au => au.id);
          
          const districts = await prisma.district.findMany({
            where: { adminUnitId: { in: adminUnitIds } },
            select: { id: true }
          });
          
          districtIds = districts.map(d => d.id);
        }
        break;
        
      case 'region':
        if (hierarchyId) {
          // Get all districts under all localities in this region
          const localities = await prisma.locality.findMany({
            where: { regionId: hierarchyId as string },
            select: { id: true }
          });
          
          const localityIds = localities.map(l => l.id);
          
          const adminUnits = await prisma.adminUnit.findMany({
            where: { localityId: { in: localityIds } },
            select: { id: true }
          });
          
          const adminUnitIds = adminUnits.map(au => au.id);
          
          const districts = await prisma.district.findMany({
            where: { adminUnitId: { in: adminUnitIds } },
            select: { id: true }
          });
          
          districtIds = districts.map(d => d.id);
        }
        break;
        
      case 'locality':
        if (hierarchyId) {
          // Get all districts under all admin units in this locality
          const adminUnits = await prisma.adminUnit.findMany({
            where: { localityId: hierarchyId as string },
            select: { id: true }
          });
          
          const adminUnitIds = adminUnits.map(au => au.id);
          
          const districts = await prisma.district.findMany({
            where: { adminUnitId: { in: adminUnitIds } },
            select: { id: true }
          });
          
          districtIds = districts.map(d => d.id);
        }
        break;
        
      case 'adminUnit':
        if (hierarchyId) {
          // Get all districts under this admin unit
          const districts = await prisma.district.findMany({
            where: { adminUnitId: hierarchyId as string },
            select: { id: true }
          });
          
          districtIds = districts.map(d => d.id);
        }
        break;
        
      case 'district':
        if (hierarchyId) {
          // Users from this specific district
          districtIds = [hierarchyId as string];
        }
        break;
        
      case 'expatriateRegion':
        // For expatriate regions, users might not have districts
        // Allow users with expatriateRegionId or root admins
        const whereClause: any = {
          OR: [
            { expatriateRegionId: hierarchyId ? (hierarchyId as string) : { not: null } },
            { adminLevel: 'EXPATRIATE_GENERAL' },
            { adminLevel: 'GENERAL_SECRETARIAT' },
            { adminLevel: 'ADMIN' }
          ]
        };
        
        const expatriateUsers = await prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            adminLevel: true,
            profile: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            memberDetails: {
              select: {
                fullName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        const formattedExpatriateUsers = expatriateUsers.map(user => ({
          id: user.id,
          name: user.profile?.firstName && user.profile?.lastName 
            ? `${user.profile.firstName} ${user.profile.lastName}`
            : user.memberDetails?.fullName || user.email || user.mobileNumber,
          email: user.email,
          mobileNumber: user.mobileNumber,
          adminLevel: user.adminLevel
        }));

        res.json(formattedExpatriateUsers);
        return;
        
      default:
        res.status(400).json({ error: 'Invalid level parameter' });
        return;
    }

    // If no districts found, return empty array
    if (districtIds.length === 0) {
      res.json([]);
      return;
    }

    // Get users from these districts (users MUST have districtId)
    // Also include root admins who can be assigned anywhere
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { districtId: { in: districtIds } },
          { adminLevel: 'GENERAL_SECRETARIAT' },
          { adminLevel: 'ADMIN' }
        ]
      },
      select: {
        id: true,
        email: true,
        mobileNumber: true,
        adminLevel: true,
        districtId: true,
        profile: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        memberDetails: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format the response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.profile?.firstName && user.profile?.lastName 
        ? `${user.profile.firstName} ${user.profile.lastName}`
        : user.memberDetails?.fullName || user.email || user.mobileNumber,
      email: user.email,
      mobileNumber: user.mobileNumber,
      adminLevel: user.adminLevel
    }));

    res.json(formattedUsers);
  } catch (error: any) {
    console.error('Get available admins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's current hierarchy memberships
 */
export const getUserHierarchyMemberships = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        activeHierarchy: true,
        // Original hierarchy
        nationalLevel: { select: { id: true, name: true, code: true } },
        region: { select: { id: true, name: true, code: true } },
        locality: { select: { id: true, name: true, code: true } },
        adminUnit: { select: { id: true, name: true, code: true } },
        district: { select: { id: true, name: true, code: true } },
        // Expatriate hierarchy
        expatriateRegion: { select: { id: true, name: true, code: true } },
        // Sector hierarchy
        sectorNationalLevel: { select: { id: true, name: true, code: true, sectorType: true } },
        sectorRegion: { select: { id: true, name: true, code: true, sectorType: true } },
        sectorLocality: { select: { id: true, name: true, code: true, sectorType: true } },
        sectorAdminUnit: { select: { id: true, name: true, code: true, sectorType: true } },
        sectorDistrict: { select: { id: true, name: true, code: true, sectorType: true } }
      }
    });
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json({
      activeHierarchy: user.activeHierarchy,
      originalHierarchy: {
        nationalLevel: user.nationalLevel,
        region: user.region,
        locality: user.locality,
        adminUnit: user.adminUnit,
        district: user.district
      },
      expatriateHierarchy: {
        region: user.expatriateRegion
      },
      sectorHierarchy: {
        nationalLevel: user.sectorNationalLevel,
        region: user.sectorRegion,
        locality: user.sectorLocality,
        adminUnit: user.sectorAdminUnit,
        district: user.sectorDistrict
      }
    });
  } catch (error: any) {
    console.error('Get user hierarchy memberships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 