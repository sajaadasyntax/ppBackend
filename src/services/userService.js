const prisma = require('../utils/prisma');
const { hashPassword } = require('../utils/auth');

// Create a new user
async function createUser(userData) {
  const { 
    email, 
    password, 
    role, 
    adminLevel, 
    profile, 
    memberDetails, 
    regionId,
    localityId,
    adminUnitId,
    districtId 
  } = userData;

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Map traditional role to adminLevel if not explicitly provided
  let resolvedAdminLevel = adminLevel;
  if (!resolvedAdminLevel) {
    // Default mapping from role string to AdminLevel enum
    if (role === 'ADMIN') {
      resolvedAdminLevel = 'ADMIN';
    } else if (role === 'GENERAL_SECRETARIAT') {
      resolvedAdminLevel = 'GENERAL_SECRETARIAT';
    } else if (role === 'REGION_ADMIN') {
      resolvedAdminLevel = 'REGION';
    } else if (role === 'LOCALITY_ADMIN') {
      resolvedAdminLevel = 'LOCALITY';
    } else if (role === 'ADMIN_UNIT_ADMIN') {
      resolvedAdminLevel = 'ADMIN_UNIT';
    } else if (role === 'DISTRICT_ADMIN') {
      resolvedAdminLevel = 'DISTRICT';
    } else {
      resolvedAdminLevel = 'USER';
    }
  }

  // Create user with profile and memberDetails in a transaction
  return prisma.$transaction(async (tx) => {
    // Create the user
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'USER', // For backward compatibility
        adminLevel: resolvedAdminLevel,
        
        // Add hierarchy references if provided
        regionId: regionId || undefined,
        localityId: localityId || undefined,
        adminUnitId: adminUnitId || undefined,
        districtId: districtId || undefined,
        
        profile: profile ? {
          create: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            phoneNumber: profile.phoneNumber,
            avatarUrl: profile.avatarUrl,
            status: profile.status || 'active'
          }
        } : undefined,
        memberDetails: memberDetails ? {
          create: {
            // Personal Information
            fullName: memberDetails.fullName,
            nickname: memberDetails.nickname,
            birthDate: memberDetails.birthDate,
            birthPlace: memberDetails.birthPlace,
            birthLocality: memberDetails.birthLocality,
            birthState: memberDetails.birthState,
            gender: memberDetails.gender,
            religion: memberDetails.religion,
            maritalStatus: memberDetails.maritalStatus,
            nationalId: memberDetails.nationalId,
            nationalIdIssueDate: memberDetails.nationalIdIssueDate,
            passportNumber: memberDetails.passportNumber,
            
            // Residence Information
            neighborhood: memberDetails.neighborhood,
            locality: memberDetails.locality,
            state: memberDetails.state,
            phone: memberDetails.phone,
            mobile: memberDetails.mobile,
            
            // Education and Work
            highestEducation: memberDetails.highestEducation,
            educationInstitution: memberDetails.educationInstitution,
            graduationYear: memberDetails.graduationYear,
            currentJob: memberDetails.currentJob,
            jobSector: memberDetails.jobSector,
            employmentStatus: memberDetails.employmentStatus,
            workAddress: memberDetails.workAddress,
            
            // Additional Information
            disability: memberDetails.disability,
            residenceAbroad: memberDetails.residenceAbroad,
            electoralDistrict: memberDetails.electoralDistrict,
            
            // Political and Social Activity
            previousCouncilMembership: memberDetails.previousCouncilMembership,
            previousPartyMembership: memberDetails.previousPartyMembership,
            civilSocietyParticipation: memberDetails.civilSocietyParticipation,
            clubMembership: memberDetails.clubMembership,
            professionalMembership: memberDetails.professionalMembership
          }
        } : undefined
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

// Get user by ID
async function getUserById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      profile: true,
      memberDetails: true,
      region: true,
      locality: true,
      adminUnit: true,
      district: true
    }
  });

  if (!user) {
    return null;
  }

  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Get detailed member data by ID
async function getMemberDetails(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { 
      profile: true,
      memberDetails: true,
      // Include other relations as needed
      reports: true,
      surveys: true,
      votes: true
    }
  });

  if (!user) {
    return null;
  }

  // Remove password from response
  const { password, ...userWithoutPassword } = user;
  
  // Format the response to match the form structure
  const memberDetails = {
    // Basic user info
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    
    // Personal Information
    personalInfo: {
      // Use memberDetails if available, otherwise fallback to profile or empty string
      fullName: user.memberDetails?.fullName || 
                (user.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : ''),
      firstName: user.profile?.firstName || '',
      lastName: user.profile?.lastName || '',
      nickname: user.memberDetails?.nickname || '',
      birthDate: user.memberDetails?.birthDate || '',
      birthPlace: user.memberDetails?.birthPlace || '',
      birthLocality: user.memberDetails?.birthLocality || '',
      birthState: user.memberDetails?.birthState || '',
      gender: user.memberDetails?.gender || '',
      religion: user.memberDetails?.religion || '',
      maritalStatus: user.memberDetails?.maritalStatus || '',
      nationalId: user.memberDetails?.nationalId || '',
      nationalIdIssueDate: user.memberDetails?.nationalIdIssueDate || '',
      passportNumber: user.memberDetails?.passportNumber || ''
    },
    
    // Residence Information
    residenceInfo: {
      neighborhood: user.memberDetails?.neighborhood || '',
      locality: user.memberDetails?.locality || '',
      state: user.memberDetails?.state || '',
      phone: user.memberDetails?.phone || '',
      mobile: user.memberDetails?.mobile || user.profile?.phoneNumber || '',
      email: user.email
    },
    
    // Education and Work
    educationAndWork: {
      highestEducation: user.memberDetails?.highestEducation || '',
      educationInstitution: user.memberDetails?.educationInstitution || '',
      graduationYear: user.memberDetails?.graduationYear || '',
      currentJob: user.memberDetails?.currentJob || '',
      jobSector: user.memberDetails?.jobSector || '',
      employmentStatus: user.memberDetails?.employmentStatus || '',
      workAddress: user.memberDetails?.workAddress || ''
    },
    
    // Additional Information
    additionalInfo: {
      disability: user.memberDetails?.disability || '',
      residenceAbroad: user.memberDetails?.residenceAbroad || '',
      electoralDistrict: user.memberDetails?.electoralDistrict || ''
    },
    
    // Political and Social Activity
    politicalAndSocialActivity: {
      previousCouncilMembership: user.memberDetails?.previousCouncilMembership || '',
      previousPartyMembership: user.memberDetails?.previousPartyMembership || '',
      civilSocietyParticipation: user.memberDetails?.civilSocietyParticipation || '',
      clubMembership: user.memberDetails?.clubMembership || '',
      professionalMembership: user.memberDetails?.professionalMembership || ''
    },
    
    // Activity statistics
    statistics: {
      reportsCount: user.reports?.length || 0,
      surveysCount: user.surveys?.length || 0,
      votesCount: user.votes?.length || 0
    },
    
    // Status
    status: user.profile?.status || 'active'
  };
  
  return memberDetails;
}

// Get user by email
async function getUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
    include: { 
      profile: true,
      memberDetails: true
    }
  });
}

// Get user by phone number
async function getUserByPhone(phoneNumber) {
  // First try to find by profile.phoneNumber
  const userByProfilePhone = await prisma.user.findFirst({
    where: { 
      profile: {
        phoneNumber: phoneNumber
      }
    },
    include: { 
      profile: true,
      memberDetails: true
    }
  });

  if (userByProfilePhone) {
    return userByProfilePhone;
  }

  // If not found, try to find by memberDetails.mobile
  return prisma.user.findFirst({
    where: { 
      memberDetails: {
        mobile: phoneNumber
      }
    },
    include: { 
      profile: true,
      memberDetails: true
    }
  });
}

// Update user
async function updateUser(id, userData) {
  const { 
    email, 
    password, 
    role, 
    adminLevel, 
    profile, 
    memberDetails,
    regionId,
    localityId,
    adminUnitId,
    districtId
  } = userData;

  // Prepare update data
  const updateData = {};
  
  if (email !== undefined) updateData.email = email;
  if (role !== undefined) updateData.role = role;
  if (adminLevel !== undefined) updateData.adminLevel = adminLevel;
  
  // Add hierarchy references if provided
  if (regionId !== undefined) updateData.regionId = regionId;
  if (localityId !== undefined) updateData.localityId = localityId;
  if (adminUnitId !== undefined) updateData.adminUnitId = adminUnitId;
  if (districtId !== undefined) updateData.districtId = districtId;
  
  // Hash password if provided
  if (password !== undefined) {
    updateData.password = await hashPassword(password);
  }

  // Update user, profile, and memberDetails in a transaction
  return prisma.$transaction(async (tx) => {
    // Update user
    const user = await tx.user.update({
      where: { id },
      data: {
        ...updateData,
        profile: profile ? {
          upsert: {
            create: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              phoneNumber: profile.phoneNumber,
              avatarUrl: profile.avatarUrl,
              status: profile.status || 'active'
            },
            update: {
              firstName: profile.firstName,
              lastName: profile.lastName,
              phoneNumber: profile.phoneNumber,
              avatarUrl: profile.avatarUrl,
              status: profile.status
            }
          }
        } : undefined,
        memberDetails: memberDetails ? {
          upsert: {
            create: {
              // Personal Information
              fullName: memberDetails.fullName,
              nickname: memberDetails.nickname,
              birthDate: memberDetails.birthDate,
              birthPlace: memberDetails.birthPlace,
              birthLocality: memberDetails.birthLocality,
              birthState: memberDetails.birthState,
              gender: memberDetails.gender,
              religion: memberDetails.religion,
              maritalStatus: memberDetails.maritalStatus,
              nationalId: memberDetails.nationalId,
              nationalIdIssueDate: memberDetails.nationalIdIssueDate,
              passportNumber: memberDetails.passportNumber,
              
              // Residence Information
              neighborhood: memberDetails.neighborhood,
              locality: memberDetails.locality,
              state: memberDetails.state,
              phone: memberDetails.phone,
              mobile: memberDetails.mobile,
              
              // Education and Work
              highestEducation: memberDetails.highestEducation,
              educationInstitution: memberDetails.educationInstitution,
              graduationYear: memberDetails.graduationYear,
              currentJob: memberDetails.currentJob,
              jobSector: memberDetails.jobSector,
              employmentStatus: memberDetails.employmentStatus,
              workAddress: memberDetails.workAddress,
              
              // Additional Information
              disability: memberDetails.disability,
              residenceAbroad: memberDetails.residenceAbroad,
              electoralDistrict: memberDetails.electoralDistrict,
              
              // Political and Social Activity
              previousCouncilMembership: memberDetails.previousCouncilMembership,
              previousPartyMembership: memberDetails.previousPartyMembership,
              civilSocietyParticipation: memberDetails.civilSocietyParticipation,
              clubMembership: memberDetails.clubMembership,
              professionalMembership: memberDetails.professionalMembership
            },
            update: {
              // Personal Information
              fullName: memberDetails.fullName,
              nickname: memberDetails.nickname,
              birthDate: memberDetails.birthDate,
              birthPlace: memberDetails.birthPlace,
              birthLocality: memberDetails.birthLocality,
              birthState: memberDetails.birthState,
              gender: memberDetails.gender,
              religion: memberDetails.religion,
              maritalStatus: memberDetails.maritalStatus,
              nationalId: memberDetails.nationalId,
              nationalIdIssueDate: memberDetails.nationalIdIssueDate,
              passportNumber: memberDetails.passportNumber,
              
              // Residence Information
              neighborhood: memberDetails.neighborhood,
              locality: memberDetails.locality,
              state: memberDetails.state,
              phone: memberDetails.phone,
              mobile: memberDetails.mobile,
              
              // Education and Work
              highestEducation: memberDetails.highestEducation,
              educationInstitution: memberDetails.educationInstitution,
              graduationYear: memberDetails.graduationYear,
              currentJob: memberDetails.currentJob,
              jobSector: memberDetails.jobSector,
              employmentStatus: memberDetails.employmentStatus,
              workAddress: memberDetails.workAddress,
              
              // Additional Information
              disability: memberDetails.disability,
              residenceAbroad: memberDetails.residenceAbroad,
              electoralDistrict: memberDetails.electoralDistrict,
              
              // Political and Social Activity
              previousCouncilMembership: memberDetails.previousCouncilMembership,
              previousPartyMembership: memberDetails.previousPartyMembership,
              civilSocietyParticipation: memberDetails.civilSocietyParticipation,
              clubMembership: memberDetails.clubMembership,
              professionalMembership: memberDetails.professionalMembership
            }
          }
        } : undefined
      },
      include: {
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

// Delete user
async function deleteUser(id) {
  return prisma.user.delete({
    where: { id }
  });
}

// Get all users
async function getAllUsers(page = 1, limit = 10, filters = {}) {
  const skip = (page - 1) * limit;
  
  // Build the where clause based on filters
  const where = {};
  
  // Apply administrative hierarchy filters if provided
  if (filters.regionId) where.regionId = filters.regionId;
  if (filters.localityId) where.localityId = filters.localityId;
  if (filters.adminUnitId) where.adminUnitId = filters.adminUnitId;
  if (filters.districtId) where.districtId = filters.districtId;
  if (filters.adminLevel) where.adminLevel = filters.adminLevel;
  if (filters.role) where.role = filters.role;
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: { 
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  // Remove passwords from response
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  return {
    users: usersWithoutPasswords,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

// Get all users formatted as memberships for the admin panel
async function getMemberships(status, role) {
  try {
    // Build where clause based on filters
    const whereClause = {};
    
    // Add status filter if provided
    if (status && (status === 'active' || status === 'disabled')) {
      whereClause.profile = {
        status: status
      };
    }
    
    // Add role filter if provided
    if (role) {
      whereClause.role = role;
    }
    
    const users = await prisma.user.findMany({
      where: whereClause,
      include: { 
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { 
        createdAt: 'desc' 
      }
    });

    // Format users as memberships
    return users.map(user => {
      // Default status to 'active' if not specified in profile
      const status = user.profile?.status || 'active';
      
      // Get name from memberDetails if available, otherwise from profile
      const userName = user.memberDetails?.fullName || 
        (user.profile ? 
          `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() || user.email : 
          user.email);
      
      // Get phone from memberDetails if available, otherwise from profile
      const phone = user.memberDetails?.mobile || user.profile?.phoneNumber || '';
      
      // Build complete hierarchy path text
      let hierarchyParts = [];
      let hierarchyText = 'غير محدد';
      
      if (user.region) {
        hierarchyParts.push(`ولاية ${user.region.name}`);
        
        if (user.locality) {
          hierarchyParts.push(`محلية ${user.locality.name}`);
          
          if (user.adminUnit) {
            hierarchyParts.push(`وحدة إدارية ${user.adminUnit.name}`);
            
            if (user.district) {
              hierarchyParts.push(`حي ${user.district.name}`);
            }
          }
        }
        
        hierarchyText = hierarchyParts.join(' / ');
      }
      
      // Make sure memberDetails and hierarchy data are consistent
      const state = user.memberDetails?.state || user.region?.name || '';
      const locality = user.memberDetails?.locality || user.locality?.name || '';

      return {
        id: user.id,
        userId: user.id,
        userName: userName,
        level: user.role || "USER",
        hierarchyText: hierarchyText, // Complete hierarchy path display
        status: status,
        email: user.email,
        phone: phone,
        joinDate: user.createdAt.toISOString().split('T')[0],
        // Additional fields that might be useful
        updatedAt: user.updatedAt.toISOString(),
        firstName: user.profile?.firstName || '',
        lastName: user.profile?.lastName || '',
        avatarUrl: user.profile?.avatarUrl || '',
        // Add memberDetails reference if available
        hasMemberDetails: !!user.memberDetails,
        // Use consistent state/locality data
        state: state,
        locality: locality,
        // Hierarchy details for potential use
        hierarchy: {
          regionId: user.regionId,
          regionName: user.region?.name || user.memberDetails?.state || '',
          localityId: user.localityId,
          localityName: user.locality?.name || user.memberDetails?.locality || '',
          adminUnitId: user.adminUnitId,
          adminUnitName: user.adminUnit?.name,
          districtId: user.districtId,
          districtName: user.district?.name
        }
      };
    });
  } catch (error) {
    console.error('Error in getMemberships service:', error);
    throw error;
  }
}

// Update user password directly
async function updateUserPassword(id, hashedPassword) {
  try {
    console.log(`Updating password for user: ${id}`);
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    console.log('Password updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

// Get users by administrative hierarchy
async function getUsersByHierarchy(hierarchyFilter, page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  const where = {};
  
  // Apply filters based on administrative hierarchy
  if (hierarchyFilter.regionId) where.regionId = hierarchyFilter.regionId;
  if (hierarchyFilter.localityId) where.localityId = hierarchyFilter.localityId;
  if (hierarchyFilter.adminUnitId) where.adminUnitId = hierarchyFilter.adminUnitId;
  if (hierarchyFilter.districtId) where.districtId = hierarchyFilter.districtId;
  
  // If the user is from العامة الأمانة (General Secretariat), they can view all users
  // So no additional filtering needed for them
  
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      include: { 
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  // Remove passwords from response
  const usersWithoutPasswords = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });

  return {
    users: usersWithoutPasswords,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
}

// Get administrative hierarchy data
async function getAdminHierarchy() {
  // Fetch all regions
  const regions = await prisma.region.findMany({
    include: {
      localities: {
        include: {
          adminUnits: {
            include: {
              districts: true
            }
          }
        }
      }
    }
  });
  
  return regions;
}

module.exports = {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  getMemberships,
  getMemberDetails,
  getUsersByHierarchy,
  getAdminHierarchy
}; 