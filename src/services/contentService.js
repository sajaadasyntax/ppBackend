const prisma = require('../utils/prisma');
const cacheManager = require('../utils/cacheManager');
const { withRetry } = require('../utils/dbRetry');
const path = require('path');
const fs = require('fs');

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
const getBulletins = async () => {
  try {
    // Try to get bulletins from cache first (30 seconds TTL)
    return await cacheManager.getOrSet('bulletins', async () => {
      const bulletins = await withRetry(() => prisma.bulletin.findMany({
        where: { published: true },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          title: true,
          content: true,
          date: true,
          image: true
        }
      }));

      return bulletins.map(bulletin => ({
        ...bulletin,
        date: bulletin.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
      }));
    }, 30000); // 30 seconds TTL for bulletins
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
    
    const bulletin = await withRetry(async () => {
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
      cacheManager.delete('bulletins');
      
      return result;
    });

    return {
      ...bulletin,
      date: bulletin.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
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
    
    const bulletin = await withRetry(async () => {
      const result = await prisma.bulletin.update({
        where: { id },
        data: updateData
      });
      
      // Invalidate bulletins cache
      cacheManager.delete('bulletins');
      
      return result;
    });

    return {
      ...bulletin,
      date: bulletin.date.toISOString().split('T')[0] // Format date as YYYY-MM-DD
    };
  } catch (error) {
    console.error('Error in updateBulletin service:', error);
    throw error;
  }
};

// Delete a bulletin
const deleteBulletin = async (id) => {
  try {
    return await withRetry(async () => {
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
      cacheManager.delete('bulletins');
      
      return true;
    });
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
const getSurveys = async (userId) => {
  try {
    // Fetch all surveys
    const surveys = await prisma.survey.findMany({
      where: { published: true },
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });

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
        participants: Math.floor(Math.random() * 100) + 20, // Mock data for now
        type: survey.id % 2 === 0 ? 'public' : 'member' // Mock type based on ID
      };
    });
  } catch (error) {
    console.error('Error in getSurveys service:', error);
    throw error;
  }
};

// Get public surveys
const getPublicSurveys = async (userId) => {
  try {
    // Fetch public surveys (even IDs for demo)
    const surveys = await prisma.survey.findMany({
      where: { 
        published: true,
        // In a real app, you would have a 'type' field to filter by
        // For demo, we'll use even IDs as public surveys
      },
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    // Filter to only even IDs (for demo purposes)
    const publicSurveys = surveys.filter(s => parseInt(s.id) % 2 === 0);

    // Transform data to match expected format
    return publicSurveys.map(survey => {
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
        participants: Math.floor(Math.random() * 100) + 20, // Mock data for now
        type: 'public'
      };
    });
  } catch (error) {
    console.error('Error in getPublicSurveys service:', error);
    throw error;
  }
};

// Get member surveys
const getMemberSurveys = async (userId) => {
  try {
    // Fetch member surveys (odd IDs for demo)
    const surveys = await prisma.survey.findMany({
      where: { 
        published: true,
        // In a real app, you would have a 'type' field to filter by
        // For demo, we'll use odd IDs as member surveys
      },
      orderBy: { dueDate: 'asc' },
      include: {
        responses: {
          where: { userId },
          select: { id: true }
        }
      }
    });

    // Filter to only odd IDs (for demo purposes)
    const memberSurveys = surveys.filter(s => parseInt(s.id) % 2 !== 0);

    // Transform data to match expected format
    return memberSurveys.map(survey => {
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
        participants: Math.floor(Math.random() * 50) + 10, // Mock data for now
        type: 'member'
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
        answers
      }
    });

    return response;
  } catch (error) {
    console.error('Error in submitSurveyResponse service:', error);
    throw error;
  }
};

// Voting
const getVotingItems = async (userId) => {
  try {
    // Fetch all active voting items
    const votingItems = await prisma.votingItem.findMany({
      where: { published: true },
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
          status
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
      features: sub.plan.features
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
    const { title, type, description, date, attachmentName } = reportData;
    
    const report = await prisma.report.create({
      data: {
        userId,
        title,
        type,
        description,
        date: new Date(date),
        attachmentName
      }
    });

    return {
      id: report.id,
      title: report.title,
      type: report.type,
      description: report.description,
      date: report.date.toISOString().split('T')[0],
      status: report.status,
      submittedAt: report.createdAt.toISOString()
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

const getAllReports = async (status) => {
  try {
    // Build where clause based on status filter
    const whereClause = status ? { status } : {};
    
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
      submittedAt: report.createdAt.toISOString()
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