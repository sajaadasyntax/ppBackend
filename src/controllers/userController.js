const userService = require('../services/userService');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all users with pagination
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await userService.getAllUsers(page, limit);
    res.json(result);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get detailed member data by ID
exports.getMemberDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const memberDetails = await userService.getMemberDetails(id);

    if (!memberDetails) {
      return res.status(404).json({ error: 'Member not found' });
    }

    res.json(memberDetails);
  } catch (error) {
    console.error('Get member details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phoneNumber, avatarUrl } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
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
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new member with detailed information
exports.createMember = async (req, res) => {
  try {
    const { personalInfo, residenceInfo, educationAndWork, additionalInfo, politicalAndSocialActivity, hierarchyInfo } = req.body;
    
    // Validate required fields
    const missingFields = [];
    if (!personalInfo?.fullName) missingFields.push('fullName');
    if (!personalInfo?.nationalId) missingFields.push('nationalId');
    if (!residenceInfo?.mobile) missingFields.push('mobile');
    if (!residenceInfo?.email) missingFields.push('email');
    
    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: `الحقول المطلوبة مفقودة: ${missingFields.join(', ')}` 
      });
    }
    
    // Validate hierarchy selection
    if (!hierarchyInfo || !hierarchyInfo.level || !hierarchyInfo.regionId) {
      return res.status(400).json({ 
        error: 'يجب اختيار التسلسل الإداري للعضو' 
      });
    }
    
    // Check if user already exists with the same email
    const existingUser = await userService.getUserByEmail(residenceInfo.email);
    if (existingUser) {
      return res.status(409).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
    }
    
    // Generate a random password (can be changed later)
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Get region and locality names from hierarchy info or from their IDs
    let regionName = hierarchyInfo.regionName;
    let localityName = hierarchyInfo.localityName;
    
    // If we have IDs but no names, fetch them from the database
    if (!regionName && hierarchyInfo.regionId) {
      const region = await prisma.region.findUnique({
        where: { id: hierarchyInfo.regionId }
      });
      regionName = region?.name || '';
    }
    
    if (!localityName && hierarchyInfo.localityId) {
      const locality = await prisma.locality.findUnique({
        where: { id: hierarchyInfo.localityId }
      });
      localityName = locality?.name || '';
    }
    
    // Prepare user data with basic information
    const userData = {
      email: residenceInfo.email,
      password: tempPassword,
      role: 'USER', // Default role for new members
      // Add hierarchy fields to the user
      regionId: hierarchyInfo.regionId,
      localityId: hierarchyInfo.localityId || null,
      adminUnitId: hierarchyInfo.adminUnitId || null,
      districtId: hierarchyInfo.districtId || null,
      profile: {
        firstName: personalInfo.fullName.split(' ')[0] || '',
        lastName: personalInfo.fullName.split(' ').slice(1).join(' ') || '',
        phoneNumber: residenceInfo.mobile,
        status: 'active'
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
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, role, firstName, lastName, phoneNumber, avatarUrl } = req.body;

    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user
    await userService.deleteUser(id);
    res.status(204).end();
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get current user profile
exports.getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await userService.getUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Alias for getCurrentUser
exports.getUserProfile = exports.getCurrentUser;

// Get all memberships for admin panel
exports.getMemberships = async (req, res) => {
  try {
    const { status, role } = req.query;
    
    const memberships = await userService.getMemberships(status, role);
    res.json(memberships);
  } catch (error) {
    console.error('Get memberships error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update membership status
exports.updateMembershipStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be "active" or "disabled"' });
    }
    
    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
  } catch (error) {
    console.error('Update membership status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reset user password (admin only)
exports.resetPassword = async (req, res) => {
  try {
    // Check if the requester is an admin
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized. Only administrators can reset passwords.' });
    }

    const { id } = req.params;
    const { newPassword } = req.body;
    
    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
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
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Step-by-step hierarchy selection endpoints for user creation

// Get all regions for initial selection
exports.getRegionsForUserCreation = async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching regions for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

// Get localities by region for user creation
exports.getLocalitiesForUserCreation = async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching localities for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch localities' });
  }
};

// Get admin units by locality for user creation
exports.getAdminUnitsForUserCreation = async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching admin units for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch admin units' });
  }
};

// Get districts by admin unit for user creation
exports.getDistrictsForUserCreation = async (req, res) => {
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
  } catch (error) {
    console.error('Error fetching districts for user creation:', error);
    res.status(500).json({ error: 'Failed to fetch districts' });
  }
};

// Create user with hierarchy assignment
exports.createUserWithHierarchy = async (req, res) => {
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
      hierarchyLevel,
      regionId,
      localityId,
      adminUnitId,
      districtId
    } = req.body;

    // Validate inputs
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    // Validate hierarchy selection
    if (hierarchyLevel && hierarchyLevel !== 'none') {
      switch (hierarchyLevel) {
        case 'region':
          if (!regionId) {
            return res.status(400).json({ error: 'Region selection is required' });
          }
          break;
        case 'locality':
          if (!regionId || !localityId) {
            return res.status(400).json({ error: 'Region and locality selection are required' });
          }
          break;
        case 'adminUnit':
          if (!regionId || !localityId || !adminUnitId) {
            return res.status(400).json({ error: 'Region, locality, and admin unit selection are required' });
          }
          break;
        case 'district':
          if (!regionId || !localityId || !adminUnitId || !districtId) {
            return res.status(400).json({ error: 'Complete hierarchy selection is required' });
          }
          break;
      }
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Prepare user data with hierarchy assignment
    const userData = {
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
    
    // Add hierarchy assignment based on selected level
    if (hierarchyLevel && hierarchyLevel !== 'none') {
      switch (hierarchyLevel) {
        case 'region':
          userData.regionId = regionId;
          if (regionId) {
            const region = await prisma.region.findUnique({
              where: { id: regionId }
            });
            regionName = region?.name || '';
          }
          break;
        case 'locality':
          userData.regionId = regionId;
          userData.localityId = localityId;
          if (regionId) {
            const region = await prisma.region.findUnique({
              where: { id: regionId }
            });
            regionName = region?.name || '';
          }
          if (localityId) {
            const locality = await prisma.locality.findUnique({
              where: { id: localityId }
            });
            localityName = locality?.name || '';
          }
          break;
        case 'adminUnit':
          userData.regionId = regionId;
          userData.localityId = localityId;
          userData.adminUnitId = adminUnitId;
          if (regionId) {
            const region = await prisma.region.findUnique({
              where: { id: regionId }
            });
            regionName = region?.name || '';
          }
          if (localityId) {
            const locality = await prisma.locality.findUnique({
              where: { id: localityId }
            });
            localityName = locality?.name || '';
          }
          break;
        case 'district':
          userData.regionId = regionId;
          userData.localityId = localityId;
          userData.adminUnitId = adminUnitId;
          userData.districtId = districtId;
          if (regionId) {
            const region = await prisma.region.findUnique({
              where: { id: regionId }
            });
            regionName = region?.name || '';
          }
          if (localityId) {
            const locality = await prisma.locality.findUnique({
              where: { id: localityId }
            });
            localityName = locality?.name || '';
          }
          break;
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
  } catch (error) {
    console.error('Create user with hierarchy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update user hierarchy assignment
exports.updateUserHierarchy = async (req, res) => {
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
  } catch (error) {
    console.error('Update user hierarchy error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's full hierarchy path
exports.getUserHierarchyPath = async (req, res) => {
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Build hierarchy path
    const hierarchyPath = [];
    
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
  } catch (error) {
    console.error('Get user hierarchy path error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 