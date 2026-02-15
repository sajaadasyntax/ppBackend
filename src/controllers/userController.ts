import userService from '../services/userService';
import prisma from '../utils/prisma';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { generateAccessToken } from '../utils/auth';
import { notify } from '../services/notificationService';
import { canAssignLevel } from '../utils/hierarchyRank';

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
    
    // Determine hierarchy type (default to GEOGRAPHIC for backward compatibility)
    const hierarchyType = hierarchyInfo?.hierarchyType || 'GEOGRAPHIC';
    
    // Validate hierarchy selection based on type
    if (hierarchyType === 'EXPATRIATE') {
      if (!hierarchyInfo || !hierarchyInfo.expatriateDistrictId) {
        res.status(400).json({ 
          error: 'يجب اختيار حي المغتربين للعضو - المستخدمون يجب أن يكونوا في مستوى الحي فقط' 
        });
        return;
      }
    } else {
      // GEOGRAPHIC hierarchy
      if (!hierarchyInfo || !hierarchyInfo.districtId) {
        res.status(400).json({ 
          error: 'يجب اختيار الحي (District) للعضو - المستخدمون يجب أن يكونوا في مستوى الحي فقط' 
        });
        return;
      }
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
    
    let regionName = '';
    let localityName = '';
    let userData: any;
    
    if (hierarchyType === 'EXPATRIATE') {
      // Fetch expatriate district to get parent hierarchy IDs and names
      const expatriateDistrict = await prisma.expatriateDistrict.findUnique({
        where: { id: hierarchyInfo.expatriateDistrictId },
        include: {
          expatriateAdminUnit: {
            include: {
              expatriateLocality: {
                include: {
                  expatriateRegion: true
                }
              }
            }
          }
        }
      });

      if (!expatriateDistrict) {
        res.status(400).json({ error: 'حي المغتربين المحدد غير موجود' });
        return;
      }

      // Get names from expatriate district hierarchy for memberDetails
      regionName = expatriateDistrict.expatriateAdminUnit.expatriateLocality.expatriateRegion.name;
      localityName = expatriateDistrict.expatriateAdminUnit.expatriateLocality.name;
      
      // Prepare user data for expatriate hierarchy
      userData = {
        email: residenceInfo.email,
        password: tempPassword,
        role: 'USER',
        mobileNumber: residenceInfo.mobile,
        // Set expatriate hierarchy IDs
        expatriateDistrictId: expatriateDistrict.id,
        expatriateAdminUnitId: expatriateDistrict.expatriateAdminUnitId,
        expatriateLocalityId: expatriateDistrict.expatriateAdminUnit.expatriateLocalityId,
        expatriateRegionId: expatriateDistrict.expatriateAdminUnit.expatriateLocality.expatriateRegionId,
        // Set active hierarchy to EXPATRIATE
        activeHierarchy: 'EXPATRIATE',
        profile: {
          firstName: personalInfo.fullName.split(' ')[0] || '',
          lastName: personalInfo.fullName.split(' ').slice(1).join(' ') || '',
          phoneNumber: residenceInfo.mobile,
          status: publicSignup ? 'disabled' : 'active'
        },
        memberDetails: {
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
          neighborhood: residenceInfo.neighborhood,
          locality: localityName,
          state: regionName,
          phone: residenceInfo.phone,
          mobile: residenceInfo.mobile,
          highestEducation: educationAndWork?.highestEducation,
          educationInstitution: educationAndWork?.educationInstitution,
          graduationYear: educationAndWork?.graduationYear,
          currentJob: educationAndWork?.currentJob,
          jobSector: educationAndWork?.jobSector,
          employmentStatus: educationAndWork?.employmentStatus,
          workAddress: educationAndWork?.workAddress,
          disability: additionalInfo?.disability,
          residenceAbroad: additionalInfo?.residenceAbroad,
          electoralDistrict: additionalInfo?.electoralDistrict,
          previousCouncilMembership: politicalAndSocialActivity?.previousCouncilMembership,
          previousPartyMembership: politicalAndSocialActivity?.previousPartyMembership,
          civilSocietyParticipation: politicalAndSocialActivity?.civilSocietyParticipation,
          clubMembership: politicalAndSocialActivity?.clubMembership,
          professionalMembership: politicalAndSocialActivity?.professionalMembership
        }
      };
    } else {
      // GEOGRAPHIC hierarchy
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
      regionName = district.adminUnit.locality.region.name;
      localityName = district.adminUnit.locality.name;
      
      // Prepare user data with basic information
      // Parent IDs will be auto-derived by userService.createUser from districtId
      userData = {
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
    }
    
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
    const { email, password, role, adminLevel, firstName, lastName, phoneNumber, avatarUrl } = req.body;

    // Check if user exists
    const user = await userService.getUserById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // ── SECURITY: Prevent privilege escalation on role/level changes ──
    const creatorLevel = req.user?.adminLevel || 'USER';
    if (adminLevel && adminLevel !== user.adminLevel) {
      if (!canAssignLevel(creatorLevel, adminLevel)) {
        res.status(403).json({
          error: 'لا يمكنك ترقية مستخدم إلى مستوى أعلى من صلاحياتك.',
          code: 'PRIVILEGE_ESCALATION_DENIED',
        });
        return;
      }
    }

    // Prepare user data
    const userData: any = {
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
    // Only include adminLevel if explicitly provided
    if (adminLevel) userData.adminLevel = adminLevel;

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

/**
 * Get pending registrations (profile.status === 'disabled') for admin approval.
 * Supports filtering by hierarchy type: ?hierarchyType=GEOGRAPHIC|EXPATRIATE|ALL
 * Supports search by name/mobile: ?search=keyword
 */
export const getPendingRegistrations = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const hierarchyTypeFilter = (req.query.hierarchyType as string) || 'ALL';
    const searchQuery = (req.query.search as string) || '';
    const page = parseInt(String(req.query.page || '1')) || 1;
    const limit = parseInt(String(req.query.limit || '50')) || 50;
    const skip = (page - 1) * limit;

    const adminUser = req.user;

    // Build where clause: only users with disabled status (pending activation)
    const where: any = {
      profile: { status: 'disabled' },
      role: 'USER', // Only regular users go through approval
    };

    // ── SECURITY: Scope to the requesting admin's hierarchy ─────────
    // ADMIN and GENERAL_SECRETARIAT see everything.
    // Lower-level admins only see registrations within their jurisdiction.
    const adminLevel = adminUser?.adminLevel;
    if (adminLevel && adminLevel !== 'ADMIN' && adminLevel !== 'GENERAL_SECRETARIAT' && adminLevel !== 'NATIONAL_LEVEL') {
      if (adminLevel === 'REGION' && adminUser?.regionId) {
        where.regionId = adminUser.regionId;
      } else if (adminLevel === 'LOCALITY' && adminUser?.localityId) {
        where.localityId = adminUser.localityId;
      } else if (adminLevel === 'ADMIN_UNIT' && adminUser?.adminUnitId) {
        where.adminUnitId = adminUser.adminUnitId;
      } else if (adminLevel === 'DISTRICT' && adminUser?.districtId) {
        where.districtId = adminUser.districtId;
      } else if (adminLevel?.startsWith('EXPATRIATE') && adminUser?.expatriateRegionId) {
        where.expatriateRegionId = adminUser.expatriateRegionId;
      }
    }

    // Filter by hierarchy type
    if (hierarchyTypeFilter === 'GEOGRAPHIC') {
      where.activeHierarchy = 'ORIGINAL';
      // Must have at least a districtId in the geographic hierarchy
      where.districtId = { not: null };
    } else if (hierarchyTypeFilter === 'EXPATRIATE') {
      where.activeHierarchy = 'EXPATRIATE';
      where.expatriateDistrictId = { not: null };
    }
    // 'ALL' = no extra filter

    // Search by name or mobile
    if (searchQuery.trim()) {
      where.OR = [
        { mobileNumber: { contains: searchQuery.trim() } },
        { email: { contains: searchQuery.trim(), mode: 'insensitive' } },
        { memberDetails: { fullName: { contains: searchQuery.trim(), mode: 'insensitive' } } },
        { profile: { firstName: { contains: searchQuery.trim(), mode: 'insensitive' } } },
        { profile: { lastName: { contains: searchQuery.trim(), mode: 'insensitive' } } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          memberDetails: { select: { fullName: true, nationalId: true, mobile: true, state: true, locality: true } },
          // Geographic hierarchy path
          region: { select: { id: true, name: true } },
          locality: { select: { id: true, name: true } },
          adminUnit: { select: { id: true, name: true } },
          district: { select: { id: true, name: true } },
          // Expatriate hierarchy path
          expatriateRegion: { select: { id: true, name: true } },
          expatriateLocality: { select: { id: true, name: true } },
          expatriateAdminUnit: { select: { id: true, name: true } },
          expatriateDistrict: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    // Format response
    const registrations = users.map((u) => ({
      id: u.id,
      fullName: u.memberDetails?.fullName || [u.profile?.firstName, u.profile?.lastName].filter(Boolean).join(' ') || u.email,
      nationalId: u.memberDetails?.nationalId || null,
      email: u.email,
      mobileNumber: u.mobileNumber,
      hierarchyType: u.activeHierarchy === 'EXPATRIATE' ? 'EXPATRIATE' : 'GEOGRAPHIC',
      registeredAt: u.createdAt,
      status: u.profile?.status || 'disabled',
      // Geographic path
      geographicPath: u.district
        ? [u.region?.name, u.locality?.name, u.adminUnit?.name, u.district?.name].filter(Boolean).join(' > ')
        : null,
      // Expatriate path
      expatriatePath: u.expatriateDistrict
        ? [u.expatriateRegion?.name, u.expatriateLocality?.name, u.expatriateAdminUnit?.name, u.expatriateDistrict?.name].filter(Boolean).join(' > ')
        : null,
    }));

    res.json({
      registrations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Get pending registrations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Approve a pending registration (activate user).
 */
export const approveRegistration = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.profile?.status === 'active') {
      res.status(409).json({ error: 'تم تفعيل هذا العضو مسبقاً' });
      return;
    }

    // Optimistic locking: only activate if still 'disabled' (prevents double-approve race)
    const result = await prisma.profile.updateMany({
      where: { userId: id, status: 'disabled' },
      data: { status: 'active' },
    });

    if (result.count === 0) {
      res.status(409).json({ error: 'تمت معالجة هذا الطلب من قبل مسؤول آخر' });
      return;
    }

    // Notify the user via WebSocket + DB
    await notify.registrationApproved(id);

    res.json({ message: 'تم تفعيل العضو بنجاح', userId: id });
  } catch (error: any) {
    console.error('Approve registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reject a pending registration (delete user).
 */
export const rejectRegistration = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Guard: if user is already active, they were approved by another admin
    if (user.profile?.status === 'active') {
      res.status(409).json({ error: 'تم تفعيل هذا العضو من قبل مسؤول آخر، لا يمكن رفضه' });
      return;
    }

    // Notify the user BEFORE deletion (WebSocket real-time only — DB record won't persist)
    await notify.registrationRejected(id, reason);

    // Delete the user and all related records (cascades via Prisma relations)
    // First delete profile and memberDetails, then user
    if (user.profile) {
      await prisma.profile.delete({ where: { userId: id } });
    }
    const memberDetails = await prisma.memberDetails.findUnique({ where: { userId: id } });
    if (memberDetails) {
      await prisma.memberDetails.delete({ where: { userId: id } });
    }
    // Clean up any notifications created for this user before deleting
    await prisma.notification.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    res.json({ message: 'تم رفض طلب التسجيل', userId: id, reason });
  } catch (error: any) {
    console.error('Reject registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

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

    // ── SECURITY: Prevent lower-level admin from resetting higher-level passwords ──
    const creatorLevel = req.user?.adminLevel || 'USER';
    const targetLevel = user.adminLevel || 'USER';
    if (!canAssignLevel(creatorLevel, targetLevel)) {
      res.status(403).json({
        error: 'لا يمكنك إعادة تعيين كلمة مرور مستخدم بصلاحيات أعلى من صلاحياتك.',
        code: 'HIERARCHY_ACCESS_DENIED',
      });
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

    // ── SECURITY: Prevent privilege escalation ──────────────────────
    // A DISTRICT admin must NOT be able to create a REGION-level admin.
    const creatorLevel = req.user?.adminLevel || 'USER';
    const requestedLevel = adminLevel || 'USER';
    if (!canAssignLevel(creatorLevel, requestedLevel)) {
      res.status(403).json({
        error: 'لا يمكنك إنشاء مستخدم بمستوى صلاحيات أعلى من صلاحياتك.',
        code: 'PRIVILEGE_ESCALATION_DENIED',
      });
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
// IMPORTANT: This function auto-derives parent IDs from the most specific level
// to ensure hierarchy consistency. Only the most specific ID needs to be provided.
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

    // Prepare update data - start with clearing all hierarchy fields
    const updateData: {
      nationalLevelId: string | null;
      regionId: string | null;
      localityId: string | null;
      adminUnitId: string | null;
      districtId: string | null;
    } = {
      nationalLevelId: null,
      regionId: null,
      localityId: null,
      adminUnitId: null,
      districtId: null
    };

    // Auto-derive parent IDs from the most specific level provided
    // This ensures hierarchy consistency by looking up the actual relationships in DB
    if (hierarchyLevel && hierarchyLevel !== 'none') {
      switch (hierarchyLevel) {
        case 'district': {
          if (!districtId) {
            res.status(400).json({ error: 'districtId is required for district level assignment' });
            return;
          }
          // Look up district and derive all parent IDs
          const district = await prisma.district.findUnique({
            where: { id: districtId },
            include: {
              adminUnit: {
                include: {
                  locality: {
                    include: {
                      region: {
                        select: { id: true, nationalLevelId: true }
                      }
                    }
                  }
                }
              }
            }
          });
          if (!district) {
            res.status(404).json({ error: 'District not found' });
            return;
          }
          // Auto-derive all parent IDs from the district's actual relationships
          updateData.districtId = districtId;
          updateData.adminUnitId = district.adminUnitId;
          updateData.localityId = district.adminUnit.localityId;
          updateData.regionId = district.adminUnit.locality.regionId;
          updateData.nationalLevelId = district.adminUnit.locality.region.nationalLevelId;
          break;
        }
        
        case 'adminUnit': {
          if (!adminUnitId) {
            res.status(400).json({ error: 'adminUnitId is required for admin unit level assignment' });
            return;
          }
          // Look up admin unit and derive parent IDs
          const adminUnit = await prisma.adminUnit.findUnique({
            where: { id: adminUnitId },
            include: {
              locality: {
                include: {
                  region: {
                    select: { id: true, nationalLevelId: true }
                  }
                }
              }
            }
          });
          if (!adminUnit) {
            res.status(404).json({ error: 'Admin unit not found' });
            return;
          }
          // Auto-derive parent IDs
          updateData.adminUnitId = adminUnitId;
          updateData.localityId = adminUnit.localityId;
          updateData.regionId = adminUnit.locality.regionId;
          updateData.nationalLevelId = adminUnit.locality.region.nationalLevelId;
          break;
        }
        
        case 'locality': {
          if (!localityId) {
            res.status(400).json({ error: 'localityId is required for locality level assignment' });
            return;
          }
          // Look up locality and derive parent IDs
          const locality = await prisma.locality.findUnique({
            where: { id: localityId },
            include: {
              region: {
                select: { id: true, nationalLevelId: true }
              }
            }
          });
          if (!locality) {
            res.status(404).json({ error: 'Locality not found' });
            return;
          }
          // Auto-derive parent IDs
          updateData.localityId = localityId;
          updateData.regionId = locality.regionId;
          updateData.nationalLevelId = locality.region.nationalLevelId;
          break;
        }
        
        case 'region': {
          if (!regionId) {
            res.status(400).json({ error: 'regionId is required for region level assignment' });
            return;
          }
          // Look up region to get national level
          const region = await prisma.region.findUnique({
            where: { id: regionId },
            select: { id: true, nationalLevelId: true }
          });
          if (!region) {
            res.status(404).json({ error: 'Region not found' });
            return;
          }
          updateData.regionId = regionId;
          updateData.nationalLevelId = region.nationalLevelId;
          break;
      }
        
        default:
          res.status(400).json({ error: 'Invalid hierarchy level. Must be one of: region, locality, adminUnit, district' });
          return;
    }
    }
    // If hierarchyLevel is 'none' or not provided, all IDs remain null (user removed from hierarchy)

    // Update user with validated hierarchy data
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        profile: true,
        nationalLevel: true,
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

    // Notify the user that their hierarchy assignment was changed by an admin
    await notify.system(id, 'تم تحديث موقعك الهرمي',
      `تم تغيير تعيينك في التسلسل الهرمي إلى مستوى "${hierarchyLevel || 'none'}".`,
      { action: 'HIERARCHY_ASSIGNMENT_CHANGED', level: hierarchyLevel },
    );

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
 * Switch the user's active hierarchy.
 *
 * This is the core "Profile Switcher" endpoint. It:
 *   1. Validates the target hierarchy exists for the user
 *   2. Checks the per-hierarchy suspension status
 *   3. Persists the new activeHierarchy in the DB
 *   4. Reissues a fresh JWT whose claims reflect the new hierarchy
 *   5. Returns the new token + user so the client can hot-swap seamlessly
 */
export const updateActiveHierarchy = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { activeHierarchy } = req.body;

    // --- 1. Validate value ---
    const validHierarchies = ['ORIGINAL', 'EXPATRIATE', 'SECTOR'];
    if (!validHierarchies.includes(activeHierarchy)) {
      res.status(400).json({
        error: 'Invalid hierarchy type. Must be ORIGINAL, EXPATRIATE, or SECTOR'
      });
      return;
    }

    // --- 2. Fetch full user with all hierarchy relations ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        memberDetails: true,
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true,
        expatriateRegion: true,
        sectorNationalLevel: true,
        sectorRegion: true,
        sectorLocality: true,
        sectorAdminUnit: true,
        sectorDistrict: true,
      }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // --- 3. Check membership in the target hierarchy ---
    const hasMembership = (() => {
      switch (activeHierarchy) {
        case 'ORIGINAL':
          return !!(user.districtId || user.adminUnitId || user.localityId || user.regionId || user.nationalLevelId);
        case 'EXPATRIATE':
          return !!user.expatriateRegionId;
        case 'SECTOR':
          return !!(user.sectorDistrictId || user.sectorAdminUnitId || user.sectorLocalityId || user.sectorRegionId || user.sectorNationalLevelId);
        default:
          return false;
      }
    })();

    if (!hasMembership) {
      res.status(400).json({
        error: 'أنت غير مسجل في هذا التسلسل الهرمي',
        code: 'NO_MEMBERSHIP'
      });
      return;
    }

    // --- 4. Edge-case: per-hierarchy suspension check ---
    // The profile.status tracks the user's status in the *current* hierarchy.
    // hierarchyStatuses (JSON) stores per-hierarchy overrides set by admin.
    // If the target hierarchy is explicitly suspended, block the switch.
    const hierarchyStatuses: Record<string, string> = (user as any).hierarchyStatuses || {};
    const targetStatus = hierarchyStatuses[activeHierarchy];

    if (targetStatus === 'suspended' || targetStatus === 'disabled') {
      res.status(403).json({
        error: 'حسابك موقوف في هذا التسلسل الهرمي. تواصل مع المسؤول.',
        code: 'HIERARCHY_SUSPENDED',
        hierarchy: activeHierarchy,
        status: targetStatus
      });
      return;
    }

    // --- 5. Persist the switch ---
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { activeHierarchy },
      include: {
        profile: true,
        nationalLevel: true,
        region: true,
        locality: true,
        adminUnit: true,
        district: true,
        expatriateRegion: true,
        sectorNationalLevel: true,
        sectorRegion: true,
        sectorLocality: true,
        sectorAdminUnit: true,
        sectorDistrict: true,
      }
    });

    // --- 6. Re-issue JWT with updated hierarchy claims ---
    const newToken = generateAccessToken({
      id: updatedUser.id,
      email: updatedUser.email ?? undefined,
      mobileNumber: updatedUser.mobileNumber ?? undefined,
      role: updatedUser.role,
      adminLevel: updatedUser.adminLevel,
      activeHierarchy: updatedUser.activeHierarchy,
      // Original hierarchy
      nationalLevelId: updatedUser.nationalLevelId,
      regionId: updatedUser.regionId,
      localityId: updatedUser.localityId,
      adminUnitId: updatedUser.adminUnitId,
      districtId: updatedUser.districtId,
      // Sector hierarchy
      sectorNationalLevelId: updatedUser.sectorNationalLevelId,
      sectorRegionId: updatedUser.sectorRegionId,
      sectorLocalityId: updatedUser.sectorLocalityId,
      sectorAdminUnitId: updatedUser.sectorAdminUnitId,
      sectorDistrictId: updatedUser.sectorDistrictId,
      // Expatriate hierarchy
      expatriateRegionId: updatedUser.expatriateRegionId,
    });

    res.json({
      message: 'تم تبديل التسلسل الهرمي بنجاح',
      accessToken: newToken,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        mobileNumber: updatedUser.mobileNumber,
        role: updatedUser.role,
        adminLevel: updatedUser.adminLevel,
        activeHierarchy: updatedUser.activeHierarchy,
        profile: updatedUser.profile,
        // Original
        nationalLevelId: updatedUser.nationalLevelId,
        regionId: updatedUser.regionId,
        localityId: updatedUser.localityId,
        adminUnitId: updatedUser.adminUnitId,
        districtId: updatedUser.districtId,
        nationalLevel: updatedUser.nationalLevel,
        region: updatedUser.region,
        locality: updatedUser.locality,
        adminUnit: updatedUser.adminUnit,
        district: updatedUser.district,
        // Expatriate
        expatriateRegionId: updatedUser.expatriateRegionId,
        expatriateRegion: updatedUser.expatriateRegion,
        // Sector
        sectorNationalLevelId: updatedUser.sectorNationalLevelId,
        sectorRegionId: updatedUser.sectorRegionId,
        sectorLocalityId: updatedUser.sectorLocalityId,
        sectorAdminUnitId: updatedUser.sectorAdminUnitId,
        sectorDistrictId: updatedUser.sectorDistrictId,
        sectorNationalLevel: updatedUser.sectorNationalLevel,
        sectorRegion: updatedUser.sectorRegion,
        sectorLocality: updatedUser.sectorLocality,
        sectorAdminUnit: updatedUser.sectorAdminUnit,
        sectorDistrict: updatedUser.sectorDistrict,
      }
    });
  } catch (error: any) {
    console.error('Update active hierarchy error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Helper to verify if a user has hierarchical access to a given level and entity
 */
async function verifyHierarchicalAccess(user: any, level: string, hierarchyId?: string): Promise<boolean> {
  if (!user) return false;
  
  // Super admins have access to everything
  if (['ADMIN', 'GENERAL_SECRETARIAT'].includes(user.adminLevel)) {
    return true;
  }
  
  // If no hierarchyId provided, allow (will be filtered later)
  if (!hierarchyId) return true;
  
  switch (user.adminLevel) {
    case 'NATIONAL_LEVEL': {
      // National level admins can access everything in their national level
      if (level === 'national' || level === 'nationalLevel') {
        return user.nationalLevelId === hierarchyId;
      }
      if (level === 'region') {
        const region = await prisma.region.findUnique({ where: { id: hierarchyId } });
        return region?.nationalLevelId === user.nationalLevelId;
      }
      if (level === 'locality') {
        const locality = await prisma.locality.findUnique({ 
          where: { id: hierarchyId }, 
          include: { region: true } 
        });
        return locality?.region?.nationalLevelId === user.nationalLevelId;
      }
      if (level === 'adminUnit') {
        const adminUnit = await prisma.adminUnit.findUnique({ 
          where: { id: hierarchyId }, 
          include: { locality: { include: { region: true } } } 
        });
        return adminUnit?.locality?.region?.nationalLevelId === user.nationalLevelId;
      }
      if (level === 'district') {
        const district = await prisma.district.findUnique({ 
          where: { id: hierarchyId }, 
          include: { adminUnit: { include: { locality: { include: { region: true } } } } } 
        });
        return district?.adminUnit?.locality?.region?.nationalLevelId === user.nationalLevelId;
      }
      return false;
    }
    
    case 'REGION': {
      if (level === 'region') return user.regionId === hierarchyId;
      if (level === 'locality') {
        const locality = await prisma.locality.findUnique({ where: { id: hierarchyId } });
        return locality?.regionId === user.regionId;
      }
      if (level === 'adminUnit') {
        const adminUnit = await prisma.adminUnit.findUnique({ 
          where: { id: hierarchyId }, 
          include: { locality: true } 
        });
        return adminUnit?.locality?.regionId === user.regionId;
      }
      if (level === 'district') {
        const district = await prisma.district.findUnique({ 
          where: { id: hierarchyId }, 
          include: { adminUnit: { include: { locality: true } } } 
        });
        return district?.adminUnit?.locality?.regionId === user.regionId;
      }
      return false;
    }
    
    case 'LOCALITY': {
      if (level === 'locality') return user.localityId === hierarchyId;
      if (level === 'adminUnit') {
        const adminUnit = await prisma.adminUnit.findUnique({ where: { id: hierarchyId } });
        return adminUnit?.localityId === user.localityId;
      }
      if (level === 'district') {
        const district = await prisma.district.findUnique({ 
          where: { id: hierarchyId }, 
          include: { adminUnit: true } 
        });
        return district?.adminUnit?.localityId === user.localityId;
      }
      return false;
    }
    
    case 'ADMIN_UNIT': {
      if (level === 'adminUnit') return user.adminUnitId === hierarchyId;
      if (level === 'district') {
        const district = await prisma.district.findUnique({ where: { id: hierarchyId } });
        return district?.adminUnitId === user.adminUnitId;
      }
      return false;
    }
    
    default:
      return false;
  }
}

/**
 * Get available users who can be assigned as admins for hierarchy levels
 */
export const getAvailableAdmins = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { level, hierarchyId } = req.query;
    const currentUser = req.user;
    
    if (!level) {
      res.status(400).json({ error: 'Level parameter is required' });
      return;
    }

    // Hierarchical scope validation for non-super admins
    // Users can only access admins in their hierarchy scope
    if (currentUser?.adminLevel && !['ADMIN', 'GENERAL_SECRETARIAT'].includes(currentUser.adminLevel)) {
      // For hierarchical admins, verify they have access to the requested hierarchy
      const canAccess = await verifyHierarchicalAccess(currentUser, level as string, hierarchyId as string);
      if (!canAccess) {
        res.status(403).json({ error: 'Forbidden - You do not have access to this hierarchy level' });
        return;
      }
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