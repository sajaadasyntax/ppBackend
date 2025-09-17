const prisma = require('../utils/prisma');
const path = require('path');
const fs = require('fs');

// Helper functions for hierarchical access control
const getLocalityIdsInRegion = async (regionId) => {
  const localities = await prisma.locality.findMany({
    where: { regionId },
    select: { id: true }
  });
  return localities.map(l => l.id);
};

const getAdminUnitIdsInRegion = async (regionId) => {
  const adminUnits = await prisma.adminUnit.findMany({
    where: { 
      locality: { regionId }
    },
    select: { id: true }
  });
  return adminUnits.map(a => a.id);
};

const getAdminUnitIdsInLocality = async (localityId) => {
  const adminUnits = await prisma.adminUnit.findMany({
    where: { localityId },
    select: { id: true }
  });
  return adminUnits.map(a => a.id);
};

const getDistrictIdsInRegion = async (regionId) => {
  const districts = await prisma.district.findMany({
    where: { 
      adminUnit: { 
        locality: { regionId }
      }
    },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

const getDistrictIdsInLocality = async (localityId) => {
  const districts = await prisma.district.findMany({
    where: { 
      adminUnit: { localityId }
    },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

const getDistrictIdsInAdminUnit = async (adminUnitId) => {
  const districts = await prisma.district.findMany({
    where: { adminUnitId },
    select: { id: true }
  });
  return districts.map(d => d.id);
};

// Main content management
const getAllContent = async ({ type, page, limit, publishedOnly }) => {
  const skip = (page - 1) * limit;
  
  const where = {};
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

const getContentById = async (id) => {
  return prisma.content.findUnique({
    where: { id },
  });
};

const createContent = async (contentData) => {
  return prisma.content.create({
    data: contentData,
  });
};

const updateContent = async (id, contentData) => {
  return prisma.content.update({
    where: { id },
    data: contentData,
  });
};

const deleteContent = async (id) => {
  await prisma.content.delete({
    where: { id },
  });
  return true;
};

const togglePublishContent = async (id) => {
  const content = await prisma.content.findUnique({
    where: { id },
  });
  
  if (!content) return null;
  
  return prisma.content.update({
    where: { id },
    data: { published: !content.published },
  });
};

// Bulletins
const getBulletins = async (adminUser = null) => {
  try {
    // Build where clause based on hierarchical access control
    let whereClause = { published: true };
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all bulletins
          console.log("Admin/General Secretariat user - showing all bulletins");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering
          console.log("Applying direct ID comparison filtering for bulletins");
          
          // Start with an empty OR array
          whereClause.OR = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level bulletins (where regionId matches AND lower levels are not targeted)
            whereClause.OR.push({
              targetRegionId: regionId,
              AND: [
                {
                  OR: [
                    { targetLocalityId: null },
                    { targetLocalityId: localityId }
                  ]
                },
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add locality-level bulletins only if user has a locality
          if (localityId) {
            whereClause.OR.push({
              targetLocalityId: localityId,
              AND: [
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add admin unit-level bulletins only if user has an admin unit
          if (adminUnitId) {
            whereClause.OR.push({
              targetAdminUnitId: adminUnitId,
              AND: [
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add district-level bulletins only if user has a district
          if (districtId) {
            whereClause.OR.push({
              targetDistrictId: districtId
            });
          }
          
          // If no conditions were added, return no results
          if (whereClause.OR.length === 0) {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no bulletins");
          }
          
          console.log("Final filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
    const bulletins = await prisma.bulletin.findMany({
        where: whereClause,
        orderBy: { date: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          date: true,
          image: true,
          targetRegionId: true,
          targetLocalityId: true,
          targetAdminUnitId: true,
          targetDistrictId: true
        }
      });

      return bulletins.map(bulletin => ({
        ...bulletin,
        date: bulletin.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
      }));
  } catch (error) {
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
const createBulletin = async (bulletinData) => {
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
    
    // Validate required hierarchy field
    if (!targetRegionId) {
      throw new Error('targetRegionId is required for creating bulletins');
    }
    
    const result = await prisma.bulletin.create({
        data: {
          title,
          content,
          date: new Date(date),
          image: image || null,
          published: true,
          // Add hierarchy targeting
          targetRegionId,
          targetLocalityId: targetLocalityId || null,
          targetAdminUnitId: targetAdminUnitId || null,
          targetDistrictId: targetDistrictId || null
        }
      });
      
      // Invalidate bulletins cache
      // Cache cleared
      
      return {
        ...result,
        date: result.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
      };
  } catch (error) {
    console.error('Error in createBulletin service:', error);
    throw error;
  }
};

// Update an existing bulletin
const updateBulletin = async (id, bulletinData) => {
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
    
    // Validate required hierarchy field
    if (!targetRegionId) {
      throw new Error('targetRegionId is required for updating bulletins');
    }
    
    // Prepare update data - only include image if it was provided
    const updateData = {
      title,
      content,
      date: new Date(date),
      updatedAt: new Date(),
      // Include hierarchy targeting fields
      targetRegionId,
      targetLocalityId: targetLocalityId || null,
      targetAdminUnitId: targetAdminUnitId || null,
      targetDistrictId: targetDistrictId || null
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
        date: result.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
      };
  } catch (error) {
    console.error('Error in updateBulletin service:', error);
    throw error;
  }
};

// Delete a bulletin
const deleteBulletin = async (id) => {
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
  } catch (error) {
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
const getArchiveDocuments = async (category) => {
  try {
    const where = {};
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
  } catch (error) {
    console.error('Error in getArchiveDocuments service:', error);
    throw error;
  }
};

// Create a new archive document
const createArchiveDocument = async (documentData) => {
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
  } catch (error) {
    console.error('Error in createArchiveDocument service:', error);
    throw error;
  }
};

// Delete an archive document
const deleteArchiveDocument = async (id) => {
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
      } catch (fileError) {
        // Log but don't fail if file deletion fails
        console.error('Error deleting file from disk:', fileError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in deleteArchiveDocument service:', error);
    throw error;
  }
};

// Surveys
const getSurveys = async (userId, adminUser = null) => {
  try {
    // Start with basic filter
    let whereClause = { published: true };
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info for surveys:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all surveys
          console.log("Admin/General Secretariat user - showing all surveys");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering similar to bulletins
          console.log("Applying hierarchical filtering for surveys");
          
          // Start with an empty OR array
          whereClause.OR = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level surveys (where regionId matches AND lower levels are not targeted)
            whereClause.OR.push({
              targetRegionId: regionId,
              AND: [
                {
                  OR: [
                    { targetLocalityId: null },
                    { targetLocalityId: localityId }
                  ]
                },
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add locality-level surveys only if user has a locality
          if (localityId) {
            whereClause.OR.push({
              targetLocalityId: localityId,
              AND: [
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add admin unit-level surveys only if user has an admin unit
          if (adminUnitId) {
            whereClause.OR.push({
              targetAdminUnitId: adminUnitId,
              AND: [
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add district-level surveys only if user has a district
          if (districtId) {
            whereClause.OR.push({
              targetDistrictId: districtId
            });
          }
          
          // If no conditions were added, return no results
          if (whereClause.OR.length === 0) {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no surveys");
          }
          
          console.log("Final surveys filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
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
        // Add hierarchy information
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId
      };
    });
  } catch (error) {
    console.error('Error in getSurveys service:', error);
    throw error;
  }
};

// Get public surveys
const getPublicSurveys = async (userId, adminUser = null) => {
  try {
    // Start with basic filter for public surveys
    let whereClause = { 
        published: true,
        audience: 'public'
    };
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info for public surveys:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all public surveys
          console.log("Admin/General Secretariat user - showing all public surveys");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering
          console.log("Applying hierarchical filtering for public surveys");
          
          // Start with an empty OR array
          const hierarchyFilter = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level surveys (where regionId matches AND lower levels are not targeted)
            hierarchyFilter.push({
              targetRegionId: regionId,
              AND: [
                {
                  OR: [
                    { targetLocalityId: null },
                    { targetLocalityId: localityId }
                  ]
                },
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add locality-level surveys only if user has a locality
          if (localityId) {
            hierarchyFilter.push({
              targetLocalityId: localityId,
              AND: [
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add admin unit-level surveys only if user has an admin unit
          if (adminUnitId) {
            hierarchyFilter.push({
              targetAdminUnitId: adminUnitId,
              AND: [
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add district-level surveys only if user has a district
          if (districtId) {
            hierarchyFilter.push({
              targetDistrictId: districtId
            });
          }
          
          // If hierarchy filters were added, include them in the where clause
          if (hierarchyFilter.length > 0) {
            whereClause.OR = hierarchyFilter;
          } else {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no public surveys");
          }
          
          console.log("Final public surveys filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
    // Fetch public surveys with hierarchical filtering
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
        // Add fields to match web schema
        participants: Math.floor(Math.random() * 100) + 20,
        type: survey.audience || 'public',
        audience: survey.audience || 'public',
        // Add hierarchy information
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId
      };
    });
  } catch (error) {
    console.error('Error in getPublicSurveys service:', error);
    throw error;
  }
};

// Get member surveys
const getMemberSurveys = async (userId, adminUser = null) => {
  try {
    // Start with basic filter for member surveys
    let whereClause = { 
        published: true,
        audience: 'member'
    };
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info for member surveys:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all member surveys
          console.log("Admin/General Secretariat user - showing all member surveys");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering
          console.log("Applying hierarchical filtering for member surveys");
          
          // Start with an empty OR array
          const hierarchyFilter = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level surveys (where regionId matches AND lower levels are not targeted)
            hierarchyFilter.push({
              targetRegionId: regionId,
              AND: [
                {
                  OR: [
                    { targetLocalityId: null },
                    { targetLocalityId: localityId }
                  ]
                },
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add locality-level surveys only if user has a locality
          if (localityId) {
            hierarchyFilter.push({
              targetLocalityId: localityId,
              AND: [
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add admin unit-level surveys only if user has an admin unit
          if (adminUnitId) {
            hierarchyFilter.push({
              targetAdminUnitId: adminUnitId,
              AND: [
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add district-level surveys only if user has a district
          if (districtId) {
            hierarchyFilter.push({
              targetDistrictId: districtId
            });
          }
          
          // If hierarchy filters were added, include them in the where clause
          if (hierarchyFilter.length > 0) {
            whereClause.OR = hierarchyFilter;
          } else {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no member surveys");
          }
          
          console.log("Final member surveys filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
    // Fetch member surveys with hierarchical filtering
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
        // Add fields to match web schema
        participants: Math.floor(Math.random() * 100) + 20,
        type: survey.audience || 'public',
        audience: survey.audience || 'public',
        // Add hierarchy information
        targetRegionId: survey.targetRegionId,
        targetLocalityId: survey.targetLocalityId,
        targetAdminUnitId: survey.targetAdminUnitId,
        targetDistrictId: survey.targetDistrictId
      };
    });
  } catch (error) {
    console.error('Error in getMemberSurveys service:', error);
    throw error;
  }
};

const submitSurveyResponse = async (surveyId, userId, answers) => {
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
  } catch (error) {
    console.error('Error in submitSurveyResponse service:', error);
    throw error;
  }
};

// Voting
const getVotingItems = async (userId, adminUser = null) => {
  try {
    // Build where clause based on hierarchical access control
    let whereClause = { published: true };
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info for voting items:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all voting items
          console.log("Admin/General Secretariat user - showing all voting items");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering similar to bulletins
          console.log("Applying hierarchical filtering for voting items");
          
          // Start with an empty OR array
          whereClause.OR = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level voting items (where regionId matches AND lower levels are not targeted)
            whereClause.OR.push({
              targetRegionId: regionId,
              AND: [
                {
                  OR: [
                    { targetLocalityId: null },
                    { targetLocalityId: localityId }
                  ]
                },
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add locality-level voting items only if user has a locality
          if (localityId) {
            whereClause.OR.push({
              targetLocalityId: localityId,
              AND: [
                {
                  OR: [
                    { targetAdminUnitId: null },
                    { targetAdminUnitId: adminUnitId }
                  ]
                },
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add admin unit-level voting items only if user has an admin unit
          if (adminUnitId) {
            whereClause.OR.push({
              targetAdminUnitId: adminUnitId,
              AND: [
                {
                  OR: [
                    { targetDistrictId: null },
                    { targetDistrictId: districtId }
                  ]
                }
              ]
            });
          }
          
          // Add district-level voting items only if user has a district
          if (districtId) {
            whereClause.OR.push({
              targetDistrictId: districtId
            });
          }
          
          // If no conditions were added, return no results
          if (whereClause.OR.length === 0) {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no voting items");
          }
          
          console.log("Final voting items filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
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
        const optionsWithVotes = parsedOptions.map(option => {
          const votes = allVotes.filter(vote => vote.optionId === option.id).length;
          return {
            ...option,
            votes
          };
        });
        
        // Calculate results if the user has voted
        let results = null;
        if (hasVoted) {
          const counts = {};
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
          // Add hierarchy information
          targetRegionId: item.targetRegionId,
          targetLocalityId: item.targetLocalityId,
          targetAdminUnitId: item.targetAdminUnitId,
          targetDistrictId: item.targetDistrictId
        };
      })
    );

    return votingItemsWithResults;
  } catch (error) {
    console.error('Error in getVotingItems service:', error);
    throw error;
  }
};

const submitVote = async (votingId, userId, optionId) => {
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
    const optionExists = options.some((option, index) => {
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
  } catch (error) {
    console.error('Error in submitVote service:', error);
    throw error;
  }
};

// Subscriptions
const getActiveSubscriptions = async (userId) => {
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
  } catch (error) {
    console.error('Error in getActiveSubscriptions service:', error);
    throw error;
  }
};

const getPreviousSubscriptions = async (userId) => {
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
  } catch (error) {
    console.error('Error in getPreviousSubscriptions service:', error);
    throw error;
  }
};

const subscribe = async (userId, planId) => {
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
        status: 'active'
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
  } catch (error) {
    console.error('Error in subscribe service:', error);
    throw error;
  }
};

// Reports
const submitReport = async (userId, reportData) => {
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
    const data = {
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
  } catch (error) {
    console.error('Error in submitReport service:', error);
    throw error;
  }
};

const getUserReports = async (userId) => {
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
  } catch (error) {
    console.error('Error in getUserReports service:', error);
    throw error;
  }
};

const getAllReports = async (status, adminUser = null) => {
  try {
    // Start with status filter if provided
    const whereClause = status ? { status } : {};
    
    // Apply hierarchical access control if adminUser is provided
    if (adminUser) {
      const { adminLevel, regionId, localityId, adminUnitId, districtId } = adminUser;
      
      console.log("User hierarchy info for reports:", { adminLevel, regionId, localityId, adminUnitId, districtId });
      
      switch (adminLevel) {
        case 'GENERAL_SECRETARIAT':
        case 'ADMIN':
          // General Secretariat and Admin can see all reports
          console.log("Admin/General Secretariat user - showing all reports");
          break;
          
        default:
          // For all other users, apply direct ID comparison filtering similar to bulletins
          console.log("Applying hierarchical filtering for reports");
          
          // We need to filter reports based on their target hierarchy
          whereClause.OR = [];
          
          // Add conditions based on user's hierarchy level
          if (regionId) {
            // Region-level users - show reports targeted to their region or below
            whereClause.OR.push({
              targetRegionId: regionId
            });
          }
          
          // Add locality-level filter only if user has a locality
          if (localityId) {
            whereClause.OR.push({
              targetLocalityId: localityId
            });
          }
          
          // Add admin unit-level filter only if user has an admin unit
          if (adminUnitId) {
            whereClause.OR.push({
              targetAdminUnitId: adminUnitId
            });
          }
          
          // Add district-level filter only if user has a district
          if (districtId) {
            whereClause.OR.push({
              targetDistrictId: districtId
            });
          }
          
          // If no conditions were added, return no results
          if (whereClause.OR.length === 0) {
            whereClause.id = 'none'; // This will return no results
            console.log("No hierarchy information available for user, returning no reports");
          }
          
          console.log("Final report filter criteria:", JSON.stringify(whereClause, null, 2));
      }
    }
    
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
      // Add hierarchy information
      regionId: report.user.regionId,
      localityId: report.user.localityId,
      adminUnitId: report.user.adminUnitId,
      districtId: report.user.districtId
    }));
  } catch (error) {
    console.error('Error in getAllReports service:', error);
    throw error;
  }
};

const getReportById = async (reportId) => {
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
  } catch (error) {
    console.error('Error in getReportById service:', error);
    throw error;
  }
};

// Create a new voting item
const createVotingItem = async (userId, votingData) => {
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
    
    // Validate required hierarchy field
    if (!targetRegionId) {
      throw new Error('targetRegionId is required for creating voting items');
    }
    
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
        // Add hierarchy targeting
        targetRegionId,
        targetLocalityId: targetLocalityId || null,
        targetAdminUnitId: targetAdminUnitId || null,
        targetDistrictId: targetDistrictId || null
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
      options: options.map(opt => ({ ...opt, votes: 0 })),
      targetLevel: votingItem.targetLevel,
      voteType: votingItem.voteType,
      createdBy: {
        id: votingItem.createdBy.id,
        name: votingItem.createdBy.email || "مستخدم",
        level: votingItem.createdBy.role
      },
      status
    };
  } catch (error) {
    console.error('Error in createVotingItem service:', error);
    throw error;
  }
};

// Create a new survey
const createSurvey = async (userId, surveyData) => {
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
    
    // Validate required hierarchy field
    if (!targetRegionId) {
      throw new Error('targetRegionId is required for creating surveys');
    }
    
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
        // Add hierarchy targeting
        targetRegionId,
        targetLocalityId: targetLocalityId || null,
        targetAdminUnitId: targetAdminUnitId || null,
        targetDistrictId: targetDistrictId || null
      }
    });
    
    // Format the response
    return {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      dueDate: survey.dueDate.toISOString().split('T')[0],
      questions: questions,
      published: survey.published
    };
  } catch (error) {
    console.error('Error in createSurvey service:', error);
    throw error;
  }
};

module.exports = {
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
  deleteArchiveDocument,
  getSurveys,
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
  getReportById
}; 