import prisma from '../utils/prisma';
import path from 'path';
import fs from 'fs';
import { buildBulletinWhereClause, buildContentWhereClause } from './multiHierarchyFilterService';

// Helper functions for hierarchical access control (reserved for future use)
// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getLocalityIdsInRegion = async (_regionId: string): Promise<string[]> => {
  const localities = await prisma.locality.findMany({
    where: { regionId: _regionId },
    select: { id: true }
  });
  return localities.map(l => l.id);
};

// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getAdminUnitIdsInRegion = async (_regionId: string): Promise<string[]> => {
  const adminUnits = await prisma.adminUnit.findMany({
    where: { 
      locality: { regionId: _regionId }
    },
    select: { id: true }
  });
  return adminUnits.map(a => a.id);
};

// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getAdminUnitIdsInLocality = async (_localityId: string): Promise<string[]> => {
  const adminUnits = await prisma.adminUnit.findMany({
    where: { localityId: _localityId },
    select: { id: true }
  });
  return adminUnits.map(a => a.id);
};

// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getDistrictIdsInRegion = async (_regionId: string): Promise<string[]> => {
  const districts = await prisma.district.findMany({
    where: { 
      adminUnit: { 
        locality: { regionId: _regionId }
      }
    },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getDistrictIdsInLocality = async (_localityId: string): Promise<string[]> => {
  const districts = await prisma.district.findMany({
    where: { 
      adminUnit: { localityId: _localityId }
    },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

// Reserved for future use
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// @ts-ignore - Reserved for future use
const _getDistrictIdsInAdminUnit = async (_adminUnitId: string): Promise<string[]> => {
  const districts = await prisma.district.findMany({
    where: { adminUnitId: _adminUnitId },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

// Main content management
export const getAllContent = async ({ type, page, limit, publishedOnly }: { type?: string; page: number; limit: number; publishedOnly?: boolean }): Promise<any> => {
  const skip = (page - 1) * limit;
  
  const where: any = {};
  if (type) where.type = type;
  if (publishedOnly) where.published = true;

  const [total, data] = await Promise.all([
    prisma.content.count({ where }),
    prisma.content.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getContentById = async (id: string): Promise<any> => {
  return prisma.content.findUnique({
    where: { id },
  });
};

export const createContent = async (contentData: any): Promise<any> => {
  return prisma.content.create({
    data: contentData,
  });
};

export const updateContent = async (id: string, contentData: any): Promise<any> => {
  return prisma.content.update({
    where: { id },
    data: contentData,
  });
};

export const deleteContent = async (id: string): Promise<boolean> => {
  await prisma.content.delete({
    where: { id },
  });
  return true;
};

export const togglePublishContent = async (id: string): Promise<any> => {
  const content = await prisma.content.findUnique({
    where: { id },
  });
  
  if (!content) return null;
  
  return prisma.content.update({
    where: { id },
    data: { published: !content.published },
  });
};

// ===== Hierarchy Targeting Utilities =====
function determineHierarchyFromTargets(targets: any): string {
  const hasOriginal = !!(targets.targetNationalLevelId || targets.targetRegionId || targets.targetLocalityId || targets.targetAdminUnitId || targets.targetDistrictId);
  const hasExpatriate = !!targets.targetExpatriateRegionId;
  const hasSector = !!(targets.targetSectorNationalLevelId || targets.targetSectorRegionId || targets.targetSectorLocalityId || targets.targetSectorAdminUnitId || targets.targetSectorDistrictId);
  const categories = [hasOriginal, hasExpatriate, hasSector].filter(Boolean).length;
  if (categories > 1) return 'MIXED';
  if (hasExpatriate) return 'EXPATRIATE';
  if (hasSector) return 'SECTOR';
  if (hasOriginal) return 'ORIGINAL';
  return 'GLOBAL';
}

function validateExclusiveHierarchyTargets(payload: any): string {
  const targets = {
    targetNationalLevelId: payload.targetNationalLevelId,
    targetRegionId: payload.targetRegionId,
    targetLocalityId: payload.targetLocalityId,
    targetAdminUnitId: payload.targetAdminUnitId,
    targetDistrictId: payload.targetDistrictId,
    targetExpatriateRegionId: payload.targetExpatriateRegionId,
    targetSectorNationalLevelId: payload.targetSectorNationalLevelId,
    targetSectorRegionId: payload.targetSectorRegionId,
    targetSectorLocalityId: payload.targetSectorLocalityId,
    targetSectorAdminUnitId: payload.targetSectorAdminUnitId,
    targetSectorDistrictId: payload.targetSectorDistrictId,
  };
  const kind = determineHierarchyFromTargets(targets);
  if (kind === 'MIXED') {
    throw new Error('Invalid targeting: cannot mix ORIGINAL, EXPATRIATE, and SECTOR targets. Choose one hierarchy.');
  }
  return kind;
}

// Bulletins - Now supports multi-hierarchy filtering
export const getBulletins = async (adminUser: any = null): Promise<any[]> => {
  try {
    // Build where clause based on user's active hierarchy
    const whereClause = await buildBulletinWhereClause(adminUser);
    
    console.log("Bulletin filter criteria:", JSON.stringify(whereClause, null, 2));
    
    const bulletins = await prisma.bulletin.findMany({
      where: whereClause,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        title: true,
        content: true,
        date: true,
        image: true,
        // Original hierarchy fields
        targetNationalLevelId: true,
        targetRegionId: true,
        targetLocalityId: true,
        targetAdminUnitId: true,
        targetDistrictId: true,
        // Expatriate hierarchy fields
        targetExpatriateRegionId: true,
        // Sector hierarchy fields
        targetSectorNationalLevelId: true,
        targetSectorRegionId: true,
        targetSectorLocalityId: true,
        targetSectorAdminUnitId: true,
        targetSectorDistrictId: true
      }
    });

      return bulletins.map(bulletin => ({
        ...bulletin,
        date: bulletin.date.toISOString().split('T')[0],
        hierarchy: determineHierarchyFromTargets(bulletin)
      }));
  } catch (error: any) {
    console.error('Error in getBulletins service:', error);
    
    // Return empty array instead of throwing on connection errors
    if (error.name === 'PrismaClientInitializationError' || error.code === 'P1001') {
      console.warn('Database connection error, returning empty bulletins list');
      return [];
    }
    
    throw error;
  }
};

// Create a new bulletin
export const createBulletin = async (bulletinData: any): Promise<any> => {
  try {
    const { 
      title, 
      content, 
      date, 
      image, 
      // original
      targetNationalLevelId,
      targetRegionId, 
      targetLocalityId, 
      targetAdminUnitId, 
      targetDistrictId,
      // expatriate
      targetExpatriateRegionId,
      // sector
      targetSectorNationalLevelId,
      targetSectorRegionId,
      targetSectorLocalityId,
      targetSectorAdminUnitId,
      targetSectorDistrictId
    } = bulletinData;
    
    // Validate exclusive hierarchy targeting
    validateExclusiveHierarchyTargets(bulletinData);
    
    const result = await prisma.bulletin.create({
        data: {
          title,
          content,
          date: new Date(date),
          image: image || null,
          published: true,
          // ORIGINAL hierarchy targets
          targetNationalLevelId: targetNationalLevelId || null,
          targetRegionId: targetRegionId || null,
          targetLocalityId: targetLocalityId || null,
          targetAdminUnitId: targetAdminUnitId || null,
          targetDistrictId: targetDistrictId || null,
          // EXPATRIATE hierarchy target
          targetExpatriateRegionId: targetExpatriateRegionId || null,
          // SECTOR hierarchy targets
          targetSectorNationalLevelId: targetSectorNationalLevelId || null,
          targetSectorRegionId: targetSectorRegionId || null,
          targetSectorLocalityId: targetSectorLocalityId || null,
          targetSectorAdminUnitId: targetSectorAdminUnitId || null,
          targetSectorDistrictId: targetSectorDistrictId || null
        }
      });
      
      // Invalidate bulletins cache
      // Cache cleared
      
      return {
        ...result,
        date: result.date.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        hierarchy: determineHierarchyFromTargets(result)
      };
  } catch (error: any) {
    console.error('Error in createBulletin service:', error);
    throw error;
  }
};

// Update an existing bulletin
export const updateBulletin = async (id: string, bulletinData: any): Promise<any> => {
  try {
    const { 
      title, 
      content, 
      date, 
      image, 
      targetRegionId, 
      targetLocalityId, 
      targetAdminUnitId, 
      targetDistrictId 
    } = bulletinData;
    
    // Validate exclusive hierarchy targeting
    validateExclusiveHierarchyTargets(bulletinData);
    
    // Prepare update data - only include image if it was provided
    const updateData: any = {
      title,
      content,
      date: new Date(date),
      updatedAt: new Date(),
      // Include hierarchy targeting fields (single-hierarchy only)
      targetNationalLevelId: bulletinData.targetNationalLevelId || null,
      targetRegionId: targetRegionId || null,
      targetLocalityId: targetLocalityId || null,
      targetAdminUnitId: targetAdminUnitId || null,
      targetDistrictId: targetDistrictId || null,
      targetExpatriateRegionId: bulletinData.targetExpatriateRegionId || null,
      targetSectorNationalLevelId: bulletinData.targetSectorNationalLevelId || null,
      targetSectorRegionId: bulletinData.targetSectorRegionId || null,
      targetSectorLocalityId: bulletinData.targetSectorLocalityId || null,
      targetSectorAdminUnitId: bulletinData.targetSectorAdminUnitId || null,
      targetSectorDistrictId: bulletinData.targetSectorDistrictId || null
    };
    
    // Only update image if a new one was provided
    if (image !== undefined) {
      updateData.image = image;
    }
    
    const result = await prisma.bulletin.update({
        where: { id },
        data: updateData
      });
      
      // Invalidate bulletins cache
      // Cache cleared
      
      return {
        ...result,
        date: result.date.toISOString().split('T')[0],
        hierarchy: determineHierarchyFromTargets(result)
      };
  } catch (error: any) {
    console.error('Error in updateBulletin service:', error);
    throw error;
  }
};

// Delete a bulletin
export const deleteBulletin = async (id: string): Promise<boolean> => {
  try {
    // Get the bulletin to find image path
    const bulletin = await prisma.bulletin.findUnique({
        where: { id }
      });
      
      if (!bulletin) {
        return false;
      }
      
      // Delete from database
      await prisma.bulletin.delete({
        where: { id }
      });
      
      // TODO: Delete image file if exists (optional)
      
      // Invalidate bulletins cache
      // Cache cleared
      
      return true;
  } catch (error: any) {
    console.error('Error in deleteBulletin service:', error);
    
    // Don't throw for connection errors, just return false
    if (error.name === 'PrismaClientInitializationError' || error.code === 'P1001') {
      console.warn('Database connection error during bulletin deletion');
      return false;
    }
    
    throw error;
  }
};

// Archive documents
export const getArchiveDocuments = async (category?: string): Promise<any[]> => {
  try {
    const where: any = {};
    if (category && category !== "الكل") {
      where.category = category;
    }
    
    const documents = await prisma.archiveDocument.findMany({
      where: {
        ...where,
        published: true
      },
      orderBy: { date: 'desc' },
      select: {
        id: true,
        title: true,
        type: true,
        category: true,
        date: true,
        size: true,
        url: true
      }
    });

    return documents.map(doc => ({
      ...doc,
      date: doc.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
    }));
  } catch (error: any) {
    console.error('Error in getArchiveDocuments service:', error);
    throw error;
  }
};

// Create a new archive document
export const createArchiveDocument = async (documentData: any): Promise<any> => {
  try {
    console.log('Creating document with data in service:', documentData);
    const { title, category, url, type, size } = documentData;
    
    if (!url) {
      throw new Error('URL is required for archive document');
    }

    // Create the document
    const result = await prisma.archiveDocument.create({
      data: {
        title: title || 'Untitled Document',
        category: category || 'other',
        type: type || 'pdf',
        url,
        size: size || '0MB',
        date: new Date(),
        published: true
      }
    });
    
    console.log('Created document:', result);
    
    // Return with formatted date
    return {
      ...result,
      date: result.date.toISOString().split('T')[0]
    };
  } catch (error: any) {
    console.error('Error in createArchiveDocument service:', error);
    throw error;
  }
};

// Delete an archive document
export const deleteArchiveDocument = async (id: string): Promise<boolean> => {
  try {
    console.log('Attempting to delete document with ID in service:', id);
    
    // First, get the document to check if it exists and to get the file path
    const document = await prisma.archiveDocument.findUnique({
      where: { id }
    });
    
    console.log('Found document to delete:', document);
    
    if (!document) {
      console.log('Document not found');
      return false;
    }
    
    // Delete the document from the database
    const deleted = await prisma.archiveDocument.delete({
      where: { id }
    });
    
    console.log('Deleted document from database:', deleted);
    
    // If the file exists in the uploads folder, delete it
    if (document.url && document.url.startsWith('/uploads/')) {
      try {
        const filePath = path.join(__dirname, '../../public', document.url);
        console.log('Checking for file at path:', filePath);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Deleted file from disk');
        } else {
          console.log('File does not exist on disk');
        }
      } catch (fileError: any) {
        // Log but don't fail if file deletion fails
        console.error('Error deleting file from disk:', fileError);
      }
    }
    
    return true;
  } catch (error: any) {
    console.error('Error in deleteArchiveDocument service:', error);
    throw error;
  }
};

// Surveys - Now supports multi-hierarchy filtering
export const getSurveys = async (userId: string, adminUser: any = null): Promise<any[]> => {
  try {
    // Build where clause based on user's active hierarchy
    const whereClause = await buildContentWhereClause(adminUser);
    
    console.log("Survey filter criteria:", JSON.stringify(whereClause, null, 2));
    
    // Fetch surveys with hierarchical filtering
    const surveys = await prisma.survey.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });
    
    console.log(`Found ${surveys.length} surveys matching criteria`);

    // Transform data to match expected format
    return surveys.map(survey => {
      const isCompleted = survey.responses.length > 0;
      const questions = JSON.parse(survey.questions);
      const questionsCount = Array.isArray(questions) ? questions.length : 0;
      
      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        dueDate: survey.dueDate.toISOString().split('T')[0],
        questions: questions,
        questionsCount: questionsCount,
        isCompleted,
        // Add fields to match web schema/UI
        participants: Math.floor(Math.random() * 100) + 20, // Mock data for now
        type: survey.audience || 'public',
        audience: survey.audience || 'public',
        // Add all hierarchy information
        targetNationalLevelId: survey.targetNationalLevelId,
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId,
        targetExpatriateRegionId: survey.targetExpatriateRegionId,
        targetSectorNationalLevelId: survey.targetSectorNationalLevelId,
        targetSectorRegionId: survey.targetSectorRegionId,
        targetSectorLocalityId: survey.targetSectorLocalityId,
        targetSectorAdminUnitId: survey.targetSectorAdminUnitId,
        targetSectorDistrictId: survey.targetSectorDistrictId,
        hierarchy: determineHierarchyFromTargets(survey)
      };
    });
  } catch (error: any) {
    console.error('Error in getSurveys service:', error);
    throw error;
  }
};

// Get public surveys
export const getPublicSurveys = async (userId: string, adminUser: any = null): Promise<any[]> => {
  try {
    const baseClause = adminUser ? await buildContentWhereClause(adminUser) : { published: true };
    const whereClause = { ...baseClause, audience: 'public' };

    const surveys = await prisma.survey.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    console.log(`Found ${surveys.length} public surveys matching criteria`);

    return surveys.map(survey => {
      const isCompleted = survey.responses.length > 0;
      const questions = JSON.parse(survey.questions);
      const questionsCount = Array.isArray(questions) ? questions.length : 0;
      
      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        dueDate: survey.dueDate.toISOString().split('T')[0],
        questions: questions,
        questionsCount: questionsCount,
        isCompleted,
        participants: Math.floor(Math.random() * 100) + 20,
        type: survey.audience || 'public',
        audience: survey.audience || 'public',
        targetNationalLevelId: survey.targetNationalLevelId,
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId,
        targetExpatriateRegionId: survey.targetExpatriateRegionId,
        targetSectorNationalLevelId: survey.targetSectorNationalLevelId,
        targetSectorRegionId: survey.targetSectorRegionId,
        targetSectorLocalityId: survey.targetSectorLocalityId,
        targetSectorAdminUnitId: survey.targetSectorAdminUnitId,
        targetSectorDistrictId: survey.targetSectorDistrictId,
        hierarchy: determineHierarchyFromTargets(survey)
      };
    });
  } catch (error: any) {
    console.error('Error in getPublicSurveys service:', error);
    throw error;
  }
};

// Get member surveys
export const getMemberSurveys = async (userId: string, adminUser: any = null): Promise<any[]> => {
  try {
    const baseClause = adminUser ? await buildContentWhereClause(adminUser) : { published: true };
    const whereClause = { ...baseClause, audience: 'member' };

    const surveys = await prisma.survey.findMany({
      where: whereClause,
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    console.log(`Found ${surveys.length} member surveys matching criteria`);

    return surveys.map(survey => {
      const isCompleted = survey.responses.length > 0;
      const questions = JSON.parse(survey.questions);
      const questionsCount = Array.isArray(questions) ? questions.length : 0;
      
      return {
        id: survey.id,
        title: survey.title,
        description: survey.description,
        dueDate: survey.dueDate.toISOString().split('T')[0],
        questions: questions,
        questionsCount: questionsCount,
        isCompleted,
        participants: Math.floor(Math.random() * 100) + 20,
        type: survey.audience || 'public',
        audience: survey.audience || 'public',
        targetNationalLevelId: survey.targetNationalLevelId,
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId,
        targetExpatriateRegionId: survey.targetExpatriateRegionId,
        targetSectorNationalLevelId: survey.targetSectorNationalLevelId,
        targetSectorRegionId: survey.targetSectorRegionId,
        targetSectorLocalityId: survey.targetSectorLocalityId,
        targetSectorAdminUnitId: survey.targetSectorAdminUnitId,
        targetSectorDistrictId: survey.targetSectorDistrictId,
        hierarchy: determineHierarchyFromTargets(survey)
      };
    });
  } catch (error: any) {
    console.error('Error in getMemberSurveys service:', error);
    throw error;
  }
};

// Get single survey by ID
export const getSurveyById = async (surveyId: string, userId: string): Promise<any> => {
  try {
    const survey = await prisma.survey.findUnique({
      where: { id: surveyId },
      include: {
        responses: {
          where: { userId },
          select: { id: true, answers: true }
        }
      }
    });

    if (!survey) {
      return null;
    }

    const isCompleted = survey.responses.length > 0;
    const questions = JSON.parse(survey.questions);
    const questionsCount = Array.isArray(questions) ? questions.length : 0;
    
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      dueDate: survey.dueDate.toISOString().split('T')[0],
      questions: questions,
      questionsCount: questionsCount,
      isCompleted,
      userResponse: survey.responses.length > 0 ? JSON.parse(survey.responses[0].answers) : null,
      participants: Math.floor(Math.random() * 100) + 20, // Mock data for now
      type: survey.audience || 'public',
      audience: survey.audience || 'public',
      // Add all hierarchy information
      targetNationalLevelId: survey.targetNationalLevelId,
      targetRegionId: survey.targetRegionId,
      targetLocalityId: survey.targetLocalityId,
      targetAdminUnitId: survey.targetAdminUnitId,
      targetDistrictId: survey.targetDistrictId,
      targetExpatriateRegionId: survey.targetExpatriateRegionId,
      targetSectorNationalLevelId: survey.targetSectorNationalLevelId,
      targetSectorRegionId: survey.targetSectorRegionId,
      targetSectorLocalityId: survey.targetSectorLocalityId,
      targetSectorAdminUnitId: survey.targetSectorAdminUnitId,
      targetSectorDistrictId: survey.targetSectorDistrictId,
      hierarchy: determineHierarchyFromTargets(survey)
    };
  } catch (error: any) {
    console.error('Error in getSurveyById service:', error);
    throw error;
  }
};

export const submitSurveyResponse = async (surveyId: string, userId: string, answers: any): Promise<any> => {
  try {
    // Check if the user has already responded to this survey
    const existingResponse = await prisma.surveyResponse.findUnique({
      where: {
        surveyId_userId: {
          surveyId,
          userId
        }
      }
    });

    if (existingResponse) {
      throw new Error('You have already responded to this survey');
    }

    // Create new response
    const response = await prisma.surveyResponse.create({
      data: {
        surveyId,
        userId,
        // Store answers as JSON string per schema
        answers: typeof answers === 'string' ? answers : JSON.stringify(answers)
      }
    });

    return response;
  } catch (error: any) {
    console.error('Error in submitSurveyResponse service:', error);
    throw error;
  }
};

// Voting
export const getVotingItems = async (userId: string, adminUser: any = null): Promise<any[]> => {
  try {
    // Build where clause based on user's active hierarchy
    const whereClause = await buildContentWhereClause(adminUser);
    
    console.log("Voting items filter criteria:", JSON.stringify(whereClause, null, 2));
    
    // Fetch voting items with filtering
    const votingItems = await prisma.votingItem.findMany({
      where: whereClause,
      orderBy: { startDate: 'desc' },
      include: {
        votes: {
          where: { userId },
          select: { optionId: true }
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });

    console.log(`Found ${votingItems.length} voting items matching criteria`);

    // Get vote counts for each voting item and option
    const votingItemsWithResults = await Promise.all(
      votingItems.map(async (item) => {
        const allVotes = await prisma.vote.findMany({
          where: { votingId: item.id },
          select: { optionId: true }
        });

        const totalVotes = allVotes.length;
        const userVote = item.votes.length > 0 ? item.votes[0].optionId : null;
        const hasVoted = item.votes.length > 0;
        
        // Parse options from JSON string
        const parsedOptions = JSON.parse(item.options);
        
        // Calculate vote counts for each option
        const optionsWithVotes = parsedOptions.map((option: any) => {
          const votes = allVotes.filter(vote => vote.optionId === option.id).length;
          return {
            ...option,
            votes
          };
        });
        
        // Calculate results if the user has voted
        let results: any = null;
        if (hasVoted) {
          const counts: Record<string, number> = {};
          allVotes.forEach(vote => {
            counts[vote.optionId] = (counts[vote.optionId] || 0) + 1;
          });
          
          results = Object.keys(counts).map(optionId => ({
            optionId,
            percentage: Math.round((counts[optionId] / totalVotes) * 100)
          }));
        }

        // Determine voting status
        let status = "active";
        const now = new Date();
        if (now < item.startDate) {
          status = "upcoming";
        } else if (now > item.endDate) {
          status = "closed";
        }

        return {
          id: item.id,
          title: item.title,
          description: item.description,
          startDate: item.startDate.toISOString().split('T')[0],
          endDate: item.endDate.toISOString().split('T')[0],
          options: optionsWithVotes,
          targetLevel: item.targetLevel,
          voteType: item.voteType || "opinion", // Default to "opinion" for backward compatibility
          createdBy: {
            id: item.createdBy.id,
            name: item.createdBy.email || "مستخدم",
            level: item.createdBy.role
          },
          hasVoted,
          userVote,
          totalVotes,
          results,
          status,
          // Add all hierarchy information
          targetNationalLevelId: item.targetNationalLevelId,
          targetRegionId: item.targetRegionId,
          targetLocalityId: item.targetLocalityId,
          targetAdminUnitId: item.targetAdminUnitId,
          targetDistrictId: item.targetDistrictId,
          targetExpatriateRegionId: item.targetExpatriateRegionId,
          targetSectorNationalLevelId: item.targetSectorNationalLevelId,
          targetSectorRegionId: item.targetSectorRegionId,
          targetSectorLocalityId: item.targetSectorLocalityId,
          targetSectorAdminUnitId: item.targetSectorAdminUnitId,
          targetSectorDistrictId: item.targetSectorDistrictId
        };
      })
    );

    return votingItemsWithResults;
  } catch (error: any) {
    console.error('Error in getVotingItems service:', error);
    throw error;
  }
};

export const submitVote = async (votingId: string, userId: string, optionId: string): Promise<any> => {
  try {
    // Check if the user has already voted
    const existingVote = await prisma.vote.findFirst({
      where: {
        votingId,
        userId
      }
    });

    if (existingVote) {
      throw new Error('You have already voted in this poll');
    }

    // Check if the voting item exists and is active
    const votingItem = await prisma.votingItem.findUnique({
      where: { id: votingId }
    });

    if (!votingItem || !votingItem.published) {
      throw new Error('This voting poll is not available');
    }

    // Check if voting is within the active time period
    const now = new Date();
    if (now < votingItem.startDate || now > votingItem.endDate) {
      throw new Error('This voting poll is not currently active');
    }

    // Check if the option exists in the voting item
    const options = JSON.parse(votingItem.options);
    
    // Handle both formats - either with explicit IDs or with generated IDs like "option-0"
    const optionExists = options.some((option: any, index: number) => {
      return option.id === optionId || `option-${index}` === optionId;
    });

    // Log for debugging
    console.log('Options:', options);
    console.log('Option ID to check:', optionId);
    console.log('Option exists:', optionExists);

    if (!optionExists) {
      throw new Error('Invalid voting option');
    }

    // Create the vote
    const vote = await prisma.vote.create({
      data: {
        votingId,
        userId,
        optionId
      }
    });

    return vote;
  } catch (error: any) {
    console.error('Error in submitVote service:', error);
    throw error;
  }
};

// Subscriptions
export const getActiveSubscriptions = async (userId: string): Promise<any[]> => {
  try {
    const now = new Date();
    
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'active',
        endDate: { gte: now }
      },
      include: {
        plan: true
      },
      orderBy: { startDate: 'desc' }
    });

    return subscriptions.map(sub => ({
      id: sub.id,
      title: sub.plan.title,
      price: sub.plan.price,
      currency: sub.plan.currency,
      period: sub.plan.period,
      startDate: sub.startDate.toISOString().split('T')[0],
      endDate: sub.endDate.toISOString().split('T')[0],
      status: sub.status,
      features: sub.plan.features,
      receipt: sub.receipt,
      paymentStatus: sub.paymentStatus
    }));
  } catch (error: any) {
    console.error('Error in getActiveSubscriptions service:', error);
    throw error;
  }
};

export const getPreviousSubscriptions = async (userId: string): Promise<any[]> => {
  try {
    const now = new Date();
    
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        OR: [
          { status: { not: 'active' } },
          { endDate: { lt: now } }
        ]
      },
      include: {
        plan: true
      },
      orderBy: { endDate: 'desc' }
    });

    return subscriptions.map(sub => ({
      id: sub.id,
      title: sub.plan.title,
      price: sub.plan.price,
      currency: sub.plan.currency,
      period: sub.plan.period,
      startDate: sub.startDate.toISOString().split('T')[0],
      endDate: sub.endDate.toISOString().split('T')[0],
      status: sub.status,
      features: sub.plan.features
    }));
  } catch (error: any) {
    console.error('Error in getPreviousSubscriptions service:', error);
    throw error;
  }
};

export const subscribe = async (userId: string, planId: string): Promise<any> => {
  try {
    // Get the subscription plan
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId }
    });

    if (!plan || !plan.active) {
      throw new Error('Subscription plan not available');
    }

    // Check for existing active subscription to the same plan
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId: userId,
        planId: planId,
        status: 'active'
      }
    });

    if (existingSubscription) {
      throw new Error('User already has an active subscription to this plan');
    }

    // Calculate end date based on period
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    // Simple period handling - can be enhanced for more complex periods
    if (plan.period.includes('سنة')) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (plan.period.includes('شهر')) {
      const months = parseInt(plan.period) || 1;
      endDate.setMonth(endDate.getMonth() + months);
    } else if (plan.period.includes('يوم')) {
      const days = parseInt(plan.period) || 30;
      endDate.setDate(endDate.getDate() + days);
    }

    // Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        startDate,
        endDate,
        status: 'active',
        amount: plan.price,
        paymentStatus: 'pending'
      },
      include: {
        plan: true
      }
    });

    return {
      id: subscription.id,
      title: subscription.plan.title,
      startDate: subscription.startDate.toISOString().split('T')[0],
      endDate: subscription.endDate.toISOString().split('T')[0],
      status: subscription.status
    };
  } catch (error: any) {
    console.error('Error in subscribe service:', error);
    throw error;
  }
};

// Reports
export const submitReport = async (userId: string, reportData: any): Promise<any> => {
  try {
    const { title, type, description, date, attachmentName, regionId, localityId, adminUnitId, districtId } = reportData;
    
    // Get the user first to ensure it exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Prepare data with mandatory relations
    const data: any = {
        title,
        type,
        description,
        date: new Date(date),
      attachmentName,
      user: {
        connect: { id: userId }
      }
    };
    
    // Add hierarchical targeting based on provided IDs
    if (regionId) {
      data.targetRegion = {
        connect: { id: regionId }
      };
    }
    
    if (localityId) {
      data.targetLocality = {
        connect: { id: localityId }
      };
    }
    
    if (adminUnitId) {
      data.targetAdminUnit = {
        connect: { id: adminUnitId }
      };
    }
    
    if (districtId) {
      data.targetDistrict = {
        connect: { id: districtId }
      };
    }
    
    // If no region is provided, use the user's region
    if (!regionId && user.regionId) {
      data.targetRegion = {
        connect: { id: user.regionId }
      };
    }
    
    console.log("Creating report with data:", JSON.stringify(data, null, 2));
    
    const report = await prisma.report.create({
      data
    });

    return {
      id: report.id,
      title: report.title,
      type: report.type,
      description: report.description,
      date: report.date.toISOString().split('T')[0],
      status: report.status,
      submittedAt: report.createdAt.toISOString(),
      regionId: report.targetRegionId,
      localityId: report.targetLocalityId,
      adminUnitId: report.targetAdminUnitId,
      districtId: report.targetDistrictId
    };
  } catch (error: any) {
    console.error('Error in submitReport service:', error);
    throw error;
  }
};

export const getUserReports = async (userId: string): Promise<any[]> => {
  try {
    const reports = await prisma.report.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return reports.map(report => ({
      id: report.id,
      title: report.title,
      type: report.type,
      status: report.status,
      date: report.date.toISOString().split('T')[0],
      submittedAt: report.createdAt.toISOString()
    }));
  } catch (error: any) {
    console.error('Error in getUserReports service:', error);
    throw error;
  }
};

export const getAllReports = async (status: string | null, adminUser: any = null): Promise<any[]> => {
  try {
    // Build where clause based on user's active hierarchy
    let baseWhereClause = await buildContentWhereClause(adminUser);
    
    // Add status filter if provided
    const whereClause = status ? { ...baseWhereClause, status } : baseWhereClause;
    
    console.log("Reports filter criteria:", JSON.stringify(whereClause, null, 2));
    
    const reports = await prisma.report.findMany({
      where: whereClause,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            regionId: true,
            localityId: true,
            adminUnitId: true,
            districtId: true,
            expatriateRegionId: true,
            sectorRegionId: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    console.log(`Found ${reports.length} reports matching criteria`);

    return reports.map(report => ({
      id: report.id,
      title: report.title,
      content: report.description,
      type: report.type,
      status: report.status,
      date: report.date.toISOString().split('T')[0],
      level: report.user.role || "USER",
      createdBy: report.user.profile ? 
        `${report.user.profile.firstName || ''} ${report.user.profile.lastName || ''}`.trim() || report.user.email : 
        report.user.email,
      createdById: report.userId,
      submittedAt: report.createdAt.toISOString(),
      // Add all hierarchy information (from user who created the report)
      regionId: report.user.regionId,
      localityId: report.user.localityId,
      adminUnitId: report.user.adminUnitId,
      districtId: report.user.districtId,
      expatriateRegionId: report.user.expatriateRegionId,
      sectorRegionId: report.user.sectorRegionId
    }));
  } catch (error: any) {
    console.error('Error in getAllReports service:', error);
    throw error;
  }
};

export const getReportById = async (reportId: string): Promise<any> => {
  try {
    const report = await prisma.report.findUnique({
      where: {
        id: reportId
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true
              }
            }
          }
        }
      }
    });

    if (!report) {
      throw new Error('Report not found');
    }

    return {
      id: report.id,
      title: report.title,
      content: report.description,
      type: report.type,
      status: report.status,
      date: report.date.toISOString().split('T')[0],
      level: report.user.role || "USER",
      createdBy: report.user.profile ? 
        `${report.user.profile.firstName || ''} ${report.user.profile.lastName || ''}`.trim() || report.user.email : 
        report.user.email,
      createdById: report.userId,
      submittedAt: report.createdAt.toISOString(),
      updatedAt: report.updatedAt.toISOString(),
      attachmentName: report.attachmentName || null
    };
  } catch (error: any) {
    console.error('Error in getReportById service:', error);
    throw error;
  }
};

// Create a new voting item
export const createVotingItem = async (userId: string, votingData: any): Promise<any> => {
  try {
    const { 
      title, 
      description, 
      options, 
      startDate, 
      endDate, 
      targetLevel, 
      voteType,
      targetRegionId, 
      targetLocalityId, 
      targetAdminUnitId, 
      targetDistrictId 
    } = votingData;
    
    // Validate required fields
    if (!title || !description || !options || !startDate || !endDate || !targetLevel) {
      throw new Error('Missing required fields');
    }
    
    // Validate exclusive hierarchy targeting
    validateExclusiveHierarchyTargets(votingData);
    
    // Validate voteType if provided, otherwise default to "opinion"
    const validVoteType = voteType === "electoral" || voteType === "opinion" ? voteType : "opinion";
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create the voting item
    const votingItem = await prisma.votingItem.create({
      data: {
        title,
        description,
        options: JSON.stringify(options),
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        targetLevel,
        voteType: validVoteType,
        createdById: userId,
        published: true,
        // ORIGINAL hierarchy targets
        targetNationalLevelId: votingData.targetNationalLevelId || null,
        targetRegionId: targetRegionId || null,
        targetLocalityId: targetLocalityId || null,
        targetAdminUnitId: targetAdminUnitId || null,
        targetDistrictId: targetDistrictId || null,
        // EXPATRIATE
        targetExpatriateRegionId: votingData.targetExpatriateRegionId || null,
        // SECTOR
        targetSectorNationalLevelId: votingData.targetSectorNationalLevelId || null,
        targetSectorRegionId: votingData.targetSectorRegionId || null,
        targetSectorLocalityId: votingData.targetSectorLocalityId || null,
        targetSectorAdminUnitId: votingData.targetSectorAdminUnitId || null,
        targetSectorDistrictId: votingData.targetSectorDistrictId || null
      },
      include: {
        createdBy: {
          select: {
            id: true,
            email: true,
            role: true
          }
        }
      }
    });
    
    // Determine status
    const now = new Date();
    let status = "active";
    if (now < votingItem.startDate) {
      status = "upcoming";
    } else if (now > votingItem.endDate) {
      status = "closed";
    }
    
    // Format the response
    return {
      id: votingItem.id,
      title: votingItem.title,
      description: votingItem.description,
      startDate: votingItem.startDate.toISOString().split('T')[0],
      endDate: votingItem.endDate.toISOString().split('T')[0],
      options: options.map((opt: any) => ({ ...opt, votes: 0 })),
      targetLevel: votingItem.targetLevel,
      voteType: votingItem.voteType,
      createdBy: {
        id: votingItem.createdBy.id,
        name: votingItem.createdBy.email || "مستخدم",
        level: votingItem.createdBy.role
      },
      status,
      hierarchy: determineHierarchyFromTargets(votingItem)
    };
  } catch (error: any) {
    console.error('Error in createVotingItem service:', error);
    throw error;
  }
};

// Create a new survey
export const createSurvey = async (userId: string, surveyData: any): Promise<any> => {
  try {
    const { 
      title, 
      description, 
      dueDate,
      questions,
      type,
      audience,
      targetRegionId, 
      targetLocalityId, 
      targetAdminUnitId, 
      targetDistrictId 
    } = surveyData;
    
    // Validate required fields
    if (!title || !description || !dueDate || !questions) {
      throw new Error('Missing required fields');
    }
    
    // Validate exclusive hierarchy targeting
    validateExclusiveHierarchyTargets(surveyData);
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Create the survey
    // Determine audience from either explicit audience or legacy type
    const resolvedAudience = audience === 'member' || type === 'member' ? 'member' : 'public';

    console.log('Creating survey with audience:', resolvedAudience, 'raw type:', type, 'raw audience:', audience);

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        questions: JSON.stringify(questions),
        published: true,
        audience: resolvedAudience,
        // ORIGINAL hierarchy targets
        targetNationalLevelId: surveyData.targetNationalLevelId || null,
        targetRegionId: targetRegionId || null,
        targetLocalityId: targetLocalityId || null,
        targetAdminUnitId: targetAdminUnitId || null,
        targetDistrictId: targetDistrictId || null,
        // EXPATRIATE
        targetExpatriateRegionId: surveyData.targetExpatriateRegionId || null,
        // SECTOR
        targetSectorNationalLevelId: surveyData.targetSectorNationalLevelId || null,
        targetSectorRegionId: surveyData.targetSectorRegionId || null,
        targetSectorLocalityId: surveyData.targetSectorLocalityId || null,
        targetSectorAdminUnitId: surveyData.targetSectorAdminUnitId || null,
        targetSectorDistrictId: surveyData.targetSectorDistrictId || null
      }
    });
    
    // Format the response
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      dueDate: survey.dueDate.toISOString().split('T')[0],
      questions: questions,
      published: survey.published,
      hierarchy: determineHierarchyFromTargets(survey)
    };
  } catch (error: any) {
    console.error('Error in createSurvey service:', error);
    throw error;
  }
};

// Update report status
export const updateReportStatus = async (reportId: string, status: string): Promise<any> => {
  try {
    const validStatuses = ['pending', 'resolved', 'rejected'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status. Must be: pending, resolved, or rejected');
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status }
    });

    return {
      id: report.id,
      title: report.title,
      status: report.status,
      updatedAt: report.updatedAt.toISOString()
    };
  } catch (error: any) {
    console.error('Error in updateReportStatus service:', error);
    throw error;
  }
};

// Update archive document
export const updateArchiveDocument = async (id: string, documentData: any): Promise<any> => {
  try {
    const { title, category } = documentData;
    
    const document = await prisma.archiveDocument.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(category && { category })
      }
    });

    return {
      ...document,
      date: document.date.toISOString().split('T')[0]
    };
  } catch (error: any) {
    console.error('Error in updateArchiveDocument service:', error);
    throw error;
  }
};

export default {
  getAllContent,
  getContentById,
  createContent,
  updateContent,
  deleteContent,
  togglePublishContent,
  getBulletins,
  createBulletin,
  updateBulletin,
  deleteBulletin,
  getArchiveDocuments,
  createArchiveDocument,
  updateArchiveDocument,
  deleteArchiveDocument,
  getSurveys,
  getSurveyById,
  getPublicSurveys,
  getMemberSurveys,
  createSurvey,
  submitSurveyResponse,
  getVotingItems,
  submitVote,
  createVotingItem,
  getActiveSubscriptions,
  getPreviousSubscriptions,
  subscribe,
  submitReport,
  getUserReports,
  getAllReports,
  getReportById,
  updateReportStatus,
  // Reserved for future use
  _getLocalityIdsInRegion,
  _getAdminUnitIdsInRegion,
  _getAdminUnitIdsInLocality,
  _getDistrictIdsInRegion,
  _getDistrictIdsInLocality,
  _getDistrictIdsInAdminUnit
};

