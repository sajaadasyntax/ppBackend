import prisma from '../utils/prisma';
import { hashPassword } from '../utils/auth';
import { normalizeMobileNumber } from '../utils/mobileNormalization';

// Create a new user
export async function createUser(userData: any): Promise<any> {
  const { 
    email, 
    password, 
    role, 
    adminLevel, 
    profile, 
    memberDetails, 
    mobileNumber,
    regionId,
    localityId,
    adminUnitId,
    districtId,
    expatriateRegionId,
    activeHierarchy
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
    // Determine primary mobile number for the user record
    const primaryMobileNumber = mobileNumber || profile?.phoneNumber || memberDetails?.mobile;
    
    if (!primaryMobileNumber) {
      throw new Error('Mobile number is required');
    }

    // Normalize mobile number to E.164 format
    const normalizedMobile = normalizeMobileNumber(primaryMobileNumber);

    // Check for duplicate mobile number
    const existingUser = await tx.user.findUnique({
      where: { mobileNumber: normalizedMobile }
    });

    if (existingUser) {
      throw new Error('Mobile number already in use');
    }

    // IMPORTANT: Users MUST exist at district level (except root admins and expatriate users)
    // If districtId is provided, auto-derive parent hierarchy IDs
    let finalRegionId = regionId;
    let finalLocalityId = localityId;
    let finalAdminUnitId = adminUnitId;
    let finalDistrictId = districtId;

    // Root admins (GENERAL_SECRETARIAT, ADMIN) don't need district
    // Expatriate users also don't need district (they use expatriateRegionId)
    const isRootAdmin = resolvedAdminLevel === 'GENERAL_SECRETARIAT' || resolvedAdminLevel === 'ADMIN' || role === 'ADMIN';
    const isExpatriateUser = expatriateRegionId && activeHierarchy === 'EXPATRIATE';
    
    if (!isRootAdmin && !isExpatriateUser) {
      // For all other users (original hierarchy), districtId is REQUIRED
      if (!districtId) {
        throw new Error('District ID is required for all users (except root admins and expatriate users)');
      }

      // Fetch district and auto-derive parent hierarchy IDs
      const district = await tx.district.findUnique({
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

      if (!district) {
        throw new Error('Invalid district ID');
      }

      // Auto-derive parent IDs from district
      finalDistrictId = district.id;
      finalAdminUnitId = district.adminUnitId;
      finalLocalityId = district.adminUnit.localityId;
      finalRegionId = district.adminUnit.locality.regionId;
    }

    // Determine activeHierarchy - use provided value or default based on what's set
    let finalActiveHierarchy = activeHierarchy;
    if (!finalActiveHierarchy) {
      if (expatriateRegionId) {
        finalActiveHierarchy = 'EXPATRIATE';
      } else if (finalDistrictId || finalAdminUnitId || finalLocalityId || finalRegionId) {
        finalActiveHierarchy = 'ORIGINAL';
      } else {
        finalActiveHierarchy = 'ORIGINAL'; // Default
      }
    }

    // Create the user
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'USER', // For backward compatibility
        adminLevel: resolvedAdminLevel,
        mobileNumber: normalizedMobile,
        activeHierarchy: finalActiveHierarchy,
        
        // Use auto-derived hierarchy IDs
        regionId: finalRegionId || undefined,
        localityId: finalLocalityId || undefined,
        adminUnitId: finalAdminUnitId || undefined,
        districtId: finalDistrictId || undefined,
        expatriateRegionId: expatriateRegionId || undefined,
        
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
        district: true,
        expatriateRegion: true
      }
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
}

// Get user by ID
export async function getUserById(id: string): Promise<any> {
  try {
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
  } catch (error: any) {
    // Fallback if Prisma client is out of sync - use raw SQL immediately
    console.error('Prisma query error (getUserById), using raw SQL fallback:', error.message);
    
    try {
      // Use raw SQL query as fallback - this bypasses the broken Prisma client
      const users = await prisma.$queryRaw<Array<any>>`
        SELECT 
          u.*,
          p.id as profile_id, p."firstName", p."lastName", p."phoneNumber", p."avatarUrl", p.status as profile_status,
          md.id as member_details_id, md."fullName", md.nickname, md."birthDate", md."birthPlace", 
          md."birthLocality", md."birthState", md.gender, md.religion, md."maritalStatus",
          r.id as region_id, r.name as region_name, r.code as region_code,
          l.id as locality_id, l.name as locality_name, l.code as locality_code,
          au.id as admin_unit_id, au.name as admin_unit_name, au.code as admin_unit_code,
          d.id as district_id, d.name as district_name, d.code as district_code
        FROM "User" u
        LEFT JOIN "Profile" p ON p."userId" = u.id
        LEFT JOIN "MemberDetails" md ON md."userId" = u.id
        LEFT JOIN "Region" r ON r.id = u."regionId"
        LEFT JOIN "Locality" l ON l.id = u."localityId"
        LEFT JOIN "AdminUnit" au ON au.id = u."adminUnitId"
        LEFT JOIN "District" d ON d.id = u."districtId"
        WHERE u.id = ${id}
        LIMIT 1
      `;
      
      if (!users || users.length === 0) {
        return null;
      }
      
      const user = users[0];
      
      // Transform raw SQL result to match Prisma format
      const userWithoutPassword = {
        id: user.id,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        adminLevel: user.adminLevel,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        regionId: user.regionId,
        localityId: user.localityId,
        adminUnitId: user.adminUnitId,
        districtId: user.districtId,
        nationalLevelId: user.nationalLevelId,
        activeHierarchy: user.activeHierarchy,
        expatriateRegionId: user.expatriateRegionId,
        profile: user.profile_id ? {
          id: user.profile_id,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          status: user.profile_status
        } : null,
        memberDetails: user.member_details_id ? {
          id: user.member_details_id,
          userId: user.id,
          fullName: user.fullName,
          nickname: user.nickname,
          birthDate: user.birthDate,
          birthPlace: user.birthPlace,
          birthLocality: user.birthLocality,
          birthState: user.birthState,
          gender: user.gender,
          religion: user.religion,
          maritalStatus: user.maritalStatus
        } : null,
        region: user.region_id ? {
          id: user.region_id,
          name: user.region_name,
          code: user.region_code
        } : null,
        locality: user.locality_id ? {
          id: user.locality_id,
          name: user.locality_name,
          code: user.locality_code
        } : null,
        adminUnit: user.admin_unit_id ? {
          id: user.admin_unit_id,
          name: user.admin_unit_name,
          code: user.admin_unit_code
        } : null,
        district: user.district_id ? {
          id: user.district_id,
          name: user.district_name,
          code: user.district_code
        } : null
      };
      
      return userWithoutPassword;
    } catch (rawError: any) {
      console.error('Raw SQL query also failed (getUserById):', rawError.message);
      throw new Error(`Database query failed: ${rawError.message}`);
    }
  }
}

// Get detailed member data by ID
export async function getMemberDetails(id: string): Promise<any> {
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
export async function getUserByEmail(email: string): Promise<any> {
  return prisma.user.findUnique({
    where: { email },
    include: { 
      profile: true,
      memberDetails: true
    }
  });
}

// Get user by mobile number (primary authentication method)
export async function getUserByMobileNumber(mobileNumber: string): Promise<any> {
  try {
    return await prisma.user.findUnique({
      where: { mobileNumber },
      include: { 
        profile: true,
        memberDetails: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });
  } catch (error: any) {
    // Fallback if Prisma client is out of sync - use raw SQL immediately
    console.error('Prisma query error (client likely out of sync), using raw SQL fallback:', error.message);
    console.error('ERROR: Please run "npx prisma generate" on the production server!');
    
    try {
      // Use raw SQL query as fallback - this bypasses the broken Prisma client
      const users = await prisma.$queryRaw<Array<any>>`
        SELECT 
          u.*,
          p.id as profile_id, p."firstName", p."lastName", p."phoneNumber", p."avatarUrl", p.status as profile_status,
          md.id as member_details_id, md."fullName", md.nickname, md."birthDate", md."birthPlace", 
          md."birthLocality", md."birthState", md.gender, md.religion, md."maritalStatus",
          r.id as region_id, r.name as region_name, r.code as region_code,
          l.id as locality_id, l.name as locality_name, l.code as locality_code,
          au.id as admin_unit_id, au.name as admin_unit_name, au.code as admin_unit_code,
          d.id as district_id, d.name as district_name, d.code as district_code
        FROM "User" u
        LEFT JOIN "Profile" p ON p."userId" = u.id
        LEFT JOIN "MemberDetails" md ON md."userId" = u.id
        LEFT JOIN "Region" r ON r.id = u."regionId"
        LEFT JOIN "Locality" l ON l.id = u."localityId"
        LEFT JOIN "AdminUnit" au ON au.id = u."adminUnitId"
        LEFT JOIN "District" d ON d.id = u."districtId"
        WHERE u."mobileNumber" = ${mobileNumber}
        LIMIT 1
      `;
      
      if (!users || users.length === 0) {
        return null;
      }
      
      const user = users[0];
      
      // Transform raw SQL result to match Prisma format
      return {
        id: user.id,
        email: user.email,
        mobileNumber: user.mobileNumber,
        password: user.password,
        role: user.role,
        adminLevel: user.adminLevel,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        regionId: user.regionId,
        localityId: user.localityId,
        adminUnitId: user.adminUnitId,
        districtId: user.districtId,
        nationalLevelId: user.nationalLevelId,
        activeHierarchy: user.activeHierarchy,
        expatriateRegionId: user.expatriateRegionId,
        profile: user.profile_id ? {
          id: user.profile_id,
          userId: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          avatarUrl: user.avatarUrl,
          status: user.profile_status
        } : null,
        memberDetails: user.member_details_id ? {
          id: user.member_details_id,
          userId: user.id,
          fullName: user.fullName,
          nickname: user.nickname,
          birthDate: user.birthDate,
          birthPlace: user.birthPlace,
          birthLocality: user.birthLocality,
          birthState: user.birthState,
          gender: user.gender,
          religion: user.religion,
          maritalStatus: user.maritalStatus
        } : null,
        region: user.region_id ? {
          id: user.region_id,
          name: user.region_name,
          code: user.region_code
        } : null,
        locality: user.locality_id ? {
          id: user.locality_id,
          name: user.locality_name,
          code: user.locality_code
        } : null,
        adminUnit: user.admin_unit_id ? {
          id: user.admin_unit_id,
          name: user.admin_unit_name,
          code: user.admin_unit_code
        } : null,
        district: user.district_id ? {
          id: user.district_id,
          name: user.district_name,
          code: user.district_code
        } : null
      };
    } catch (rawError: any) {
      console.error('Raw SQL query also failed:', rawError.message);
      console.error('This indicates a serious database connection or schema issue.');
      throw new Error(`Database query failed: ${rawError.message}. Please check database connection and run "npx prisma generate"`);
    }
  }
}

// Get user by phone number
export async function getUserByPhone(phoneNumber: string): Promise<any> {
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
export async function updateUser(id: string, userData: any): Promise<any> {
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
  const updateData: any = {};
  
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
export async function deleteUser(id: string): Promise<any> {
  return prisma.user.delete({
    where: { id }
  });
}

// Get all users
export async function getAllUsers(page: number = 1, limit: number = 10, adminUser: any = null): Promise<any> {
  const skip = (page - 1) * limit;
  
  // Build the where clause based on filters
  const where: any = {};
  
  // Apply hierarchical access control if adminUser is provided
  if (adminUser) {
    const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
    
    switch (adminLevel) {
      case 'ADMIN':
      case 'GENERAL_SECRETARIAT':
        // Admin and General Secretariat can see all users
        break;
        
      case 'NATIONAL_LEVEL':
        // National level admin can see users in their national level hierarchy
        if (nationalLevelId) {
          where.region = { nationalLevelId };
        }
        break;
        
      case 'REGION':
        // Region admin can see users in their region and all sub-levels
        if (regionId) where.regionId = regionId;
        break;
        
      case 'LOCALITY':
        // Locality admin can see users in their locality and all sub-levels
        if (localityId) where.localityId = localityId;
        break;
        
      case 'ADMIN_UNIT':
        // Admin unit admin can see users in their admin unit and all sub-levels
        if (adminUnitId) where.adminUnitId = adminUnitId;
        break;
        
      case 'DISTRICT':
        // District admin can only see users in their district
        if (districtId) where.districtId = districtId;
        break;
        
      default:
        // For other roles, restrict to their specific level
        // If no hierarchy assigned, return no users for security
        if (districtId) where.districtId = districtId;
        else if (adminUnitId) where.adminUnitId = adminUnitId;
        else if (localityId) where.localityId = localityId;
        else if (regionId) where.regionId = regionId;
        else where.id = 'none'; // Return no users if no hierarchy assigned
    }
  }
  
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
export async function getMemberships(status: string | null, role: string | null, adminUser: any = null): Promise<any[]> {
  try {
    // Build where clause based on filters
    const whereClause: any = {};
    
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
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, nationalLevelId, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      switch (adminLevel) {
        case 'ADMIN':
        case 'GENERAL_SECRETARIAT':
          // Admin and General Secretariat can see all users
          break;
          
        case 'NATIONAL_LEVEL':
          // National level admin can see users in their national level hierarchy
          if (nationalLevelId) {
            whereClause.region = { nationalLevelId };
          }
          break;
          
        case 'REGION':
          // Region admin can see users in their region and all sub-levels
          if (regionId) whereClause.regionId = regionId;
          break;
          
        case 'LOCALITY':
          // Locality admin can see users in their locality and all sub-levels
          if (localityId) whereClause.localityId = localityId;
          break;
          
        case 'ADMIN_UNIT':
          // Admin unit admin can see users in their admin unit and all sub-levels
          if (adminUnitId) whereClause.adminUnitId = adminUnitId;
          break;
          
        case 'DISTRICT':
          // District admin can only see users in their district
          if (districtId) whereClause.districtId = districtId;
          break;
          
        default:
          // For other roles, restrict to their specific level
          // If no hierarchy assigned, return no users for security
          if (districtId) whereClause.districtId = districtId;
          else if (adminUnitId) whereClause.adminUnitId = adminUnitId;
          else if (localityId) whereClause.localityId = localityId;
          else if (regionId) whereClause.regionId = regionId;
          else whereClause.id = 'none'; // Return no users if no hierarchy assigned
      }
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
      let hierarchyParts: string[] = [];
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
  } catch (error: any) {
    console.error('Error in getMemberships service:', error);
    throw error;
  }
}

// Update user password directly
export async function updateUserPassword(id: string, hashedPassword: string): Promise<boolean> {
  try {
    console.log(`Updating password for user: ${id}`);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    console.log('Password updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating user password:', error);
    throw error;
  }
}

// Get users by administrative hierarchy
export async function getUsersByHierarchy(hierarchyFilter: any, page: number = 1, limit: number = 10): Promise<any> {
  const skip = (page - 1) * limit;
  const where: any = {};
  
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
export async function getAdminHierarchy(): Promise<any[]> {
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

// Create admin account with hierarchical validation
export async function createAdminAccount(creatorAdmin: any, adminData: any): Promise<any> {
  const { 
    email, 
    mobileNumber,
    password, 
    adminLevel, 
    profile, 
    regionId,
    localityId,
    adminUnitId,
    districtId 
  } = adminData;

  // Validate that the creator can create this admin level
  if (!canCreateAdminAtLevel(creatorAdmin.adminLevel, adminLevel)) {
    throw new Error(`You don't have permission to create ${adminLevel} level admins`);
  }

  // Validate hierarchy assignment based on creator's level
  const validatedHierarchy = await validateHierarchyAssignment(creatorAdmin, {
    adminLevel,
    regionId,
    localityId,
    adminUnitId,
    districtId
  });

  // Hash the password
  const hashedPassword = await hashPassword(password);

  // Create admin user with profile in a transaction
  return prisma.$transaction(async (tx) => {
    // Create the admin user
    const user = await tx.user.create({
      data: {
        email,
        mobileNumber,
        password: hashedPassword,
        role: 'ADMIN',
        adminLevel: adminLevel,
        
        // Add validated hierarchy references
        regionId: validatedHierarchy.regionId,
        localityId: validatedHierarchy.localityId,
        adminUnitId: validatedHierarchy.adminUnitId,
        districtId: validatedHierarchy.districtId,
        
        profile: profile ? {
          create: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            phoneNumber: profile.phoneNumber || mobileNumber,
            avatarUrl: profile.avatarUrl,
            status: profile.status || 'active'
          }
        } : {
          create: {
            firstName: profile?.firstName || 'Admin',
            lastName: profile?.lastName || 'User',
            phoneNumber: mobileNumber,
            status: 'active'
          }
        }
      },
      include: {
        profile: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true
      }
    });

    return user;
  });
}

// Check if creator can create admin at specified level
function canCreateAdminAtLevel(creatorLevel: string, targetLevel: string): boolean {
  const hierarchy: Record<string, number> = {
    'GENERAL_SECRETARIAT': 5,
    'REGION': 4,
    'LOCALITY': 3,
    'ADMIN_UNIT': 2,
    'DISTRICT': 1
  };

  const creatorRank = hierarchy[creatorLevel] || 0;
  const targetRank = hierarchy[targetLevel] || 0;

  // Creator can only create admins at levels below them
  return creatorRank > targetRank;
}

// Validate hierarchy assignment based on creator's permissions
export async function validateHierarchyAssignment(creatorAdmin: any, targetData: any): Promise<any> {
  const { regionId, localityId, adminUnitId, districtId } = targetData;
  const { adminLevel: creatorLevel, regionId: creatorRegionId, localityId: creatorLocalityId, adminUnitId: creatorAdminUnitId, districtId: creatorDistrictId } = creatorAdmin;

  const validated: any = {};

  switch (creatorLevel) {
    case 'GENERAL_SECRETARIAT':
      // Can assign to any hierarchy level
      validated.regionId = regionId;
      validated.localityId = localityId;
      validated.adminUnitId = adminUnitId;
      validated.districtId = districtId;
      break;

    case 'REGION':
      // Can only assign within their region
      validated.regionId = creatorRegionId;
      validated.localityId = localityId && await isLocalityInRegion(localityId, creatorRegionId) ? localityId : null;
      validated.adminUnitId = adminUnitId && await isAdminUnitInRegion(adminUnitId, creatorRegionId) ? adminUnitId : null;
      validated.districtId = districtId && await isDistrictInRegion(districtId, creatorRegionId) ? districtId : null;
      break;

    case 'LOCALITY':
      // Can only assign within their locality
      validated.regionId = creatorRegionId;
      validated.localityId = creatorLocalityId;
      validated.adminUnitId = adminUnitId && await isAdminUnitInLocality(adminUnitId, creatorLocalityId) ? adminUnitId : null;
      validated.districtId = districtId && await isDistrictInLocality(districtId, creatorLocalityId) ? districtId : null;
      break;

    case 'ADMIN_UNIT':
      // Can only assign within their admin unit
      validated.regionId = creatorRegionId;
      validated.localityId = creatorLocalityId;
      validated.adminUnitId = creatorAdminUnitId;
      validated.districtId = districtId && await isDistrictInAdminUnit(districtId, creatorAdminUnitId) ? districtId : null;
      break;

    case 'DISTRICT':
      // Can only assign within their district
      validated.regionId = creatorRegionId;
      validated.localityId = creatorLocalityId;
      validated.adminUnitId = creatorAdminUnitId;
      validated.districtId = creatorDistrictId;
      break;

    default:
      throw new Error('Invalid creator admin level');
  }

  return validated;
}

// Helper functions to validate hierarchy relationships
async function isLocalityInRegion(localityId: string, regionId: string): Promise<boolean> {
  const locality = await prisma.locality.findFirst({
    where: { id: localityId, regionId }
  });
  return !!locality;
}

async function isAdminUnitInRegion(adminUnitId: string, regionId: string): Promise<boolean> {
  const adminUnit = await prisma.adminUnit.findFirst({
    where: { 
      id: adminUnitId,
      locality: { regionId }
    }
  });
  return !!adminUnit;
}

async function isAdminUnitInLocality(adminUnitId: string, localityId: string): Promise<boolean> {
  const adminUnit = await prisma.adminUnit.findFirst({
    where: { id: adminUnitId, localityId }
  });
  return !!adminUnit;
}

async function isDistrictInRegion(districtId: string, regionId: string): Promise<boolean> {
  const district = await prisma.district.findFirst({
    where: { 
      id: districtId,
      adminUnit: { 
        locality: { regionId }
      }
    }
  });
  return !!district;
}

async function isDistrictInLocality(districtId: string, localityId: string): Promise<boolean> {
  const district = await prisma.district.findFirst({
    where: { 
      id: districtId,
      adminUnit: { localityId }
    }
  });
  return !!district;
}

async function isDistrictInAdminUnit(districtId: string, adminUnitId: string): Promise<boolean> {
  const district = await prisma.district.findFirst({
    where: { id: districtId, adminUnitId }
  });
  return !!district;
}

export default {
  createUser,
  createAdminAccount,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  getUserByMobileNumber,
  updateUser,
  updateUserPassword,
  deleteUser,
  getAllUsers,
  getMemberships,
  getMemberDetails,
  getUsersByHierarchy,
  getAdminHierarchy
};

