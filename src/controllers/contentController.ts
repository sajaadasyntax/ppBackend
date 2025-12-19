import { Response, NextFunction } from 'express';
import contentService from '../services/contentService';
import HierarchyService from '../services/hierarchyService';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';
import { AuthenticatedRequest } from '../types';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/bulletins');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `bulletin-${uniqueSuffix}${ext}`);
  }
});

// Filter only images
const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Main content management
export const getAllContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const type = req.query.type as string;
    const publishedOnly = req.query.publishedOnly === 'true';
    
    const result = await contentService.getAllContent({ page, limit, type, publishedOnly });
    res.json(result);
  } catch (error: any) {
    console.error('Error in getAllContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getContentById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const content = await contentService.getContentById(id);
    
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    
    res.json(content);
  } catch (error: any) {
    console.error('Error in getContentById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const content = await contentService.createContent(req.body);
    res.status(201).json(content);
  } catch (error: any) {
    console.error('Error in createContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const content = await contentService.updateContent(id, req.body);
    
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    
    res.json(content);
  } catch (error: any) {
    console.error('Error in updateContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await contentService.deleteContent(id);
    
    if (!success) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    
    res.status(204).end();
  } catch (error: any) {
    console.error('Error in deleteContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const togglePublishContent = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const content = await contentService.togglePublishContent(id);
    
    if (!content) {
      res.status(404).json({ error: 'Content not found' });
      return;
    }
    
    res.json(content);
  } catch (error: any) {
    console.error('Error in togglePublishContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulletins - now filtered by user hierarchy
export const getBulletins = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const bulletins = await HierarchyService.getUserBulletins(userId);
    res.json(bulletins);
  } catch (error: any) {
    console.error('Error in getBulletins controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new bulletin
export const createBulletin = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    upload.single('image')(req as any, res, async (err: any) => {
      if (err) {
        console.error('Error uploading file:', err);
        res.status(400).json({ error: err.message || 'Error uploading file' });
        return;
      }

      const bulletinData = JSON.parse((req as any).body.bulletinData || '{}');
      
      // If image was uploaded, add the path to bulletinData
      if ((req as any).file) {
        const imagePath = `/uploads/bulletins/${(req as any).file.filename}`;
        bulletinData.image = imagePath;
      }
      
      try {
        // Automatically set hierarchy based on logged-in admin's level
        if (req.user) {
          const user = await HierarchyService.getUserWithHierarchy(req.user.id);
          if (user) {
            const autoHierarchy = HierarchyService.determineContentHierarchy(user);
            // Merge auto hierarchy with provided data (provided data takes precedence if explicitly set)
            // Only auto-set if not explicitly provided
            if (!bulletinData.targetRegionId && !bulletinData.targetLocalityId && 
                !bulletinData.targetAdminUnitId && !bulletinData.targetDistrictId &&
                !bulletinData.targetExpatriateRegionId && !bulletinData.targetSectorRegionId) {
              Object.assign(bulletinData, autoHierarchy);
              console.log('Auto-set hierarchy based on admin level:', autoHierarchy);
            } else {
              // If some hierarchy is provided, merge with auto hierarchy for parent levels
              if (autoHierarchy.targetRegionId && !bulletinData.targetRegionId) {
                bulletinData.targetRegionId = autoHierarchy.targetRegionId;
              }
              if (autoHierarchy.targetLocalityId && !bulletinData.targetLocalityId) {
                bulletinData.targetLocalityId = autoHierarchy.targetLocalityId;
              }
              if (autoHierarchy.targetAdminUnitId && !bulletinData.targetAdminUnitId) {
                bulletinData.targetAdminUnitId = autoHierarchy.targetAdminUnitId;
              }
              if (autoHierarchy.targetDistrictId && !bulletinData.targetDistrictId) {
                bulletinData.targetDistrictId = autoHierarchy.targetDistrictId;
              }
            }
          }
        }
        
        // Fallback: Validate that hierarchy targeting is provided
        if (!bulletinData.targetRegionId && !bulletinData.targetExpatriateRegionId && !bulletinData.targetSectorRegionId) {
          console.warn('targetRegionId missing from bulletin data, attempting to fetch default region');
          
          try {
            // Get the first available region as a fallback
            const regions = await prisma.region.findMany({
              where: { active: true },
              take: 1
            });
            
            if (regions && regions.length > 0) {
              console.log(`Using default region ID ${regions[0].id} for bulletin`);
              bulletinData.targetRegionId = regions[0].id;
            } else {
              res.status(400).json({ error: 'targetRegionId is required for creating bulletins and no default region found' });
              return;
            }
          } catch (err: any) {
            console.error('Error finding default region:', err);
            res.status(400).json({ error: 'targetRegionId is required for creating bulletins' });
            return;
          }
        }
        
        // Ensure proper hierarchy targeting - make sure lower levels are only set if higher levels are set
        if (bulletinData.targetDistrictId && (!bulletinData.targetAdminUnitId || !bulletinData.targetLocalityId)) {
          res.status(400).json({ error: 'Cannot target a district without specifying its admin unit and locality' });
          return;
        }
        
        if (bulletinData.targetAdminUnitId && !bulletinData.targetLocalityId) {
          res.status(400).json({ error: 'Cannot target an admin unit without specifying its locality' });
          return;
        }
        
        const bulletin = await contentService.createBulletin(bulletinData);
        res.status(201).json(bulletin);
      } catch (error: any) {
        console.error('Error creating bulletin:', error);
        res.status(500).json({ error: 'Failed to create bulletin' });
      }
    });
  } catch (error: any) {
    console.error('Error in createBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing bulletin
export const updateBulletin = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    
    upload.single('image')(req as any, res, async (err: any) => {
      if (err) {
        console.error('Error uploading file:', err);
        res.status(400).json({ error: err.message || 'Error uploading file' });
        return;
      }

      const bulletinData = JSON.parse((req as any).body.bulletinData || '{}');
      
      // If image was uploaded, add the path to bulletinData
      if ((req as any).file) {
        const imagePath = `/uploads/bulletins/${(req as any).file.filename}`;
        bulletinData.image = imagePath;
      }
      
      try {
        // Automatically set hierarchy based on logged-in admin's level (if not explicitly provided)
        if (req.user) {
          const user = await HierarchyService.getUserWithHierarchy(req.user.id);
          if (user) {
            const autoHierarchy = HierarchyService.determineContentHierarchy(user);
            // Only auto-set if not explicitly provided in update
            if (!bulletinData.targetRegionId && !bulletinData.targetLocalityId && 
                !bulletinData.targetAdminUnitId && !bulletinData.targetDistrictId &&
                !bulletinData.targetExpatriateRegionId && !bulletinData.targetSectorRegionId) {
              Object.assign(bulletinData, autoHierarchy);
              console.log('Auto-set hierarchy for update based on admin level:', autoHierarchy);
            } else {
              // Merge parent levels if not explicitly set
              if (autoHierarchy.targetRegionId && !bulletinData.targetRegionId) {
                bulletinData.targetRegionId = autoHierarchy.targetRegionId;
              }
              if (autoHierarchy.targetLocalityId && !bulletinData.targetLocalityId) {
                bulletinData.targetLocalityId = autoHierarchy.targetLocalityId;
              }
              if (autoHierarchy.targetAdminUnitId && !bulletinData.targetAdminUnitId) {
                bulletinData.targetAdminUnitId = autoHierarchy.targetAdminUnitId;
              }
              if (autoHierarchy.targetDistrictId && !bulletinData.targetDistrictId) {
                bulletinData.targetDistrictId = autoHierarchy.targetDistrictId;
              }
            }
          }
        }
        
        // Fallback: Validate that hierarchy targeting is provided
        if (bulletinData.targetRegionId === undefined || bulletinData.targetRegionId === null) {
          if (!bulletinData.targetExpatriateRegionId && !bulletinData.targetSectorRegionId) {
            console.warn('targetRegionId missing from bulletin update data, attempting to fetch default region');
            
            try {
              // Get the first available region as a fallback
              const regions = await prisma.region.findMany({
                where: { active: true },
                take: 1
              });
              
              if (regions && regions.length > 0) {
                console.log(`Using default region ID ${regions[0].id} for bulletin update`);
                bulletinData.targetRegionId = regions[0].id;
              } else {
                res.status(400).json({ error: 'targetRegionId is required for updating bulletins and no default region found' });
                return;
              }
            } catch (err: any) {
              console.error('Error finding default region for update:', err);
              res.status(400).json({ error: 'targetRegionId is required for updating bulletins' });
              return;
            }
          }
        }
        
        // Ensure proper hierarchy targeting - make sure lower levels are only set if higher levels are set
        if (bulletinData.targetDistrictId && (!bulletinData.targetAdminUnitId || !bulletinData.targetLocalityId)) {
          res.status(400).json({ error: 'Cannot target a district without specifying its admin unit and locality' });
          return;
        }
        
        if (bulletinData.targetAdminUnitId && !bulletinData.targetLocalityId) {
          res.status(400).json({ error: 'Cannot target an admin unit without specifying its locality' });
          return;
        }
        
        const bulletin = await contentService.updateBulletin(id, bulletinData);
        
        if (!bulletin) {
          res.status(404).json({ error: 'Bulletin not found' });
          return;
        }
        
        res.json(bulletin);
      } catch (error: any) {
        console.error('Error updating bulletin:', error);
        res.status(500).json({ error: 'Failed to update bulletin' });
      }
    });
  } catch (error: any) {
    console.error('Error in updateBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a bulletin
export const deleteBulletin = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await contentService.deleteBulletin(id);
    
    if (!success) {
      res.status(404).json({ error: 'Bulletin not found' });
      return;
    }
    
    res.status(204).end();
  } catch (error: any) {
    console.error('Error in deleteBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Archive documents
export const getArchiveDocuments = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { category } = req.query;
    const documents = await contentService.getArchiveDocuments(category as string);
    res.json(documents);
  } catch (error: any) {
    console.error('Error in getArchiveDocuments controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Configure multer storage for archive documents (outside handler for better performance)
const archiveStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    // Use process.cwd() for consistent path resolution in both dev and production
    const uploadDir = path.join(process.cwd(), 'public/uploads/archive');
    
    console.log('Archive upload directory:', uploadDir);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created archive upload directory:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Generate unique filename preserving original extension
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname) || '.pdf';
    const filename = `archive-${uniqueSuffix}${ext}`;
    console.log('Generated archive filename:', filename);
    cb(null, filename);
  }
});

const archiveUpload = multer({ 
  storage: archiveStorage, 
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit for documents
});

// Upload a new archive document
export const uploadArchiveDocument = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  archiveUpload.single('file')(req as any, res, async (err: any) => {
    if (err) {
      console.error('Error uploading archive file:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File size exceeds 50MB limit' });
      } else {
        res.status(400).json({ error: err.message || 'Error uploading file' });
      }
      return;
    }

    try {
      // Extract data directly from req.body
      const title = (req as any).body.title || '';
      const category = (req as any).body.category || 'document';
      
      // Log what we received
      console.log('Archive upload - request body:', (req as any).body);
      console.log('Archive upload - file info:', (req as any).file ? {
        filename: (req as any).file.filename,
        originalname: (req as any).file.originalname,
        size: (req as any).file.size,
        path: (req as any).file.path
      } : 'No file');
      
      // If file was uploaded, create the document
      if ((req as any).file) {
        const filePath = `/uploads/archive/${(req as any).file.filename}`;
        
        const documentData = {
          title: title || (req as any).file.originalname,
          category,
          url: filePath,
          size: `${((req as any).file.size / (1024 * 1024)).toFixed(2)}MB`,
          type: path.extname((req as any).file.originalname).substring(1).toLowerCase() || 'pdf'
        };
        
        console.log('Creating archive document with data:', documentData);
        
        const document = await contentService.createArchiveDocument(documentData);
        console.log('Archive document created successfully:', document.id);
        res.status(201).json(document);
      } else {
        console.error('No file received in archive upload request');
        res.status(400).json({ error: 'No file was uploaded. Please select a file.' });
      }
    } catch (error: any) {
      console.error('Error creating archive document:', error);
      // Clean up uploaded file on error
      if ((req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
          console.log('Cleaned up file after error:', (req as any).file.path);
        } catch (cleanupErr) {
          console.error('Error cleaning up file:', cleanupErr);
        }
      }
      res.status(500).json({ error: 'Failed to create archive document: ' + error.message });
    }
  });
};

// Delete an archive document
export const deleteArchiveDocument = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete document with ID:', id);
    
    const success = await contentService.deleteArchiveDocument(id);
    
    if (!success) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    
    // Return a JSON response instead of empty response
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error: any) {
    console.error('Error in deleteArchiveDocument controller:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

// Surveys
export const getSurveys = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const adminUser = req.user;
    
    if (!userId || !adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    console.log('Getting surveys for user with ID:', adminUser.id);
    
    const surveys = await contentService.getSurveys(userId, adminUser);
    res.json(surveys);
  } catch (error: any) {
    console.error('Error in getSurveys controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get public surveys only - now filtered by hierarchy
export const getPublicSurveys = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    console.log('[getPublicSurveys Controller] Request received:', {
      path: req.path,
      method: req.method,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'no user'
    });
    
    const userId = req.user?.id;
    const adminUser = req.user;
    
    if (!userId || !adminUser) {
      console.error('[getPublicSurveys Controller] Unauthorized - no user');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    console.log('[getPublicSurveys Controller] Getting public surveys for user with ID:', adminUser.id);
    
    const surveys = await contentService.getPublicSurveys(userId, adminUser);
    console.log('[getPublicSurveys Controller] Returning', surveys.length, 'surveys');
    res.json(surveys);
  } catch (error: any) {
    console.error('[getPublicSurveys Controller] Error:', error);
    console.error('[getPublicSurveys Controller] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Get member surveys only
export const getMemberSurveys = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    console.log('[getMemberSurveys Controller] Request received:', {
      path: req.path,
      method: req.method,
      user: req.user ? { id: req.user.id, email: req.user.email } : 'no user'
    });
    
    const userId = req.user?.id;
    const adminUser = req.user;
    
    if (!userId || !adminUser) {
      console.error('[getMemberSurveys Controller] Unauthorized - no user');
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    console.log('[getMemberSurveys Controller] Getting member surveys for user with ID:', adminUser.id);
    
    const surveys = await contentService.getMemberSurveys(userId, adminUser);
    console.log('[getMemberSurveys Controller] Returning', surveys.length, 'surveys');
    res.json(surveys);
  } catch (error: any) {
    console.error('[getMemberSurveys Controller] Error:', error);
    console.error('[getMemberSurveys Controller] Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};

// Get single survey by ID
export const getSurveyById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const survey = await contentService.getSurveyById(surveyId, userId);
    
    if (!survey) {
      res.status(404).json({ error: 'Survey not found' });
      return;
    }
    
    res.json(survey);
  } catch (error: any) {
    console.error('Error in getSurveyById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitSurveyResponse = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { surveyId } = req.params;
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    // Accept both 'answers' and 'responses' for backward compatibility
    const { answers, responses } = req.body;
    const surveyAnswers = answers || responses;
    
    const response = await contentService.submitSurveyResponse(surveyId, userId, surveyAnswers);
    res.status(201).json(response);
  } catch (error: any) {
    console.error('Error in submitSurveyResponse controller:', error);
    
    if (error.message === 'You have already responded to this survey') {
      res.status(409).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Voting - now filtered by hierarchy
export const getVotingItems = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    const adminUser = req.user;
    
    if (!userId || !adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    console.log('Getting voting items for user with ID:', adminUser.id);
    
    // Use the updated getVotingItems function with hierarchical filtering
    const votingItems = await contentService.getVotingItems(userId, adminUser);
    res.json(votingItems);
  } catch (error: any) {
    console.error('Error in getVotingItems controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const submitVote = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const votingId = req.params.id; // Changed from votingId to id to match route parameter
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { optionId } = req.body;
    
    console.log(`Submitting vote: votingId=${votingId}, userId=${userId}, optionId=${optionId}`);
    
    const vote = await contentService.submitVote(votingId, userId, optionId);
    res.status(201).json(vote);
  } catch (error: any) {
    console.error('Error in submitVote controller:', error);
    
    if (error.message === 'You have already voted in this poll' ||
        error.message === 'This voting poll is not available' ||
        error.message === 'Invalid voting option') {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVotingItem = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const votingData = req.body;
    
    // Automatically set hierarchy based on logged-in admin's level
    if (req.user) {
      const user = await HierarchyService.getUserWithHierarchy(userId);
      if (user) {
        const autoHierarchy = HierarchyService.determineContentHierarchy(user);
        // Only auto-set if not explicitly provided
        if (!votingData.targetRegionId && !votingData.targetLocalityId && 
            !votingData.targetAdminUnitId && !votingData.targetDistrictId &&
            !votingData.targetExpatriateRegionId && !votingData.targetSectorRegionId) {
          Object.assign(votingData, autoHierarchy);
          console.log('Auto-set hierarchy for voting item based on admin level:', autoHierarchy);
        } else {
          // Merge parent levels if not explicitly set
          if (autoHierarchy.targetRegionId && !votingData.targetRegionId) {
            votingData.targetRegionId = autoHierarchy.targetRegionId;
          }
          if (autoHierarchy.targetLocalityId && !votingData.targetLocalityId) {
            votingData.targetLocalityId = autoHierarchy.targetLocalityId;
          }
          if (autoHierarchy.targetAdminUnitId && !votingData.targetAdminUnitId) {
            votingData.targetAdminUnitId = autoHierarchy.targetAdminUnitId;
          }
          if (autoHierarchy.targetDistrictId && !votingData.targetDistrictId) {
            votingData.targetDistrictId = autoHierarchy.targetDistrictId;
          }
        }
      }
    }
    
    // Validate that hierarchy targeting is provided (fallback)
    if (!votingData.targetRegionId && !votingData.targetExpatriateRegionId && !votingData.targetSectorRegionId) {
      res.status(400).json({ error: 'targetRegionId is required for creating voting items' });
      return;
    }
    
    const votingItem = await contentService.createVotingItem(userId, votingData);
    res.status(201).json(votingItem);
  } catch (error: any) {
    console.error('Error in createVotingItem controller:', error);
    
    if (error.message === 'Missing required fields' || 
        error.message === 'User not found' || 
        error.message.includes('targetRegionId is required')) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSurvey = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const surveyData = req.body;
    
    // Automatically set hierarchy based on logged-in admin's level
    if (req.user) {
      const user = await HierarchyService.getUserWithHierarchy(userId);
      if (user) {
        const autoHierarchy = HierarchyService.determineContentHierarchy(user);
        // Only auto-set if not explicitly provided
        if (!surveyData.targetRegionId && !surveyData.targetLocalityId && 
            !surveyData.targetAdminUnitId && !surveyData.targetDistrictId &&
            !surveyData.targetExpatriateRegionId && !surveyData.targetSectorRegionId) {
          Object.assign(surveyData, autoHierarchy);
          console.log('Auto-set hierarchy for survey based on admin level:', autoHierarchy);
        } else {
          // Merge parent levels if not explicitly set
          if (autoHierarchy.targetRegionId && !surveyData.targetRegionId) {
            surveyData.targetRegionId = autoHierarchy.targetRegionId;
          }
          if (autoHierarchy.targetLocalityId && !surveyData.targetLocalityId) {
            surveyData.targetLocalityId = autoHierarchy.targetLocalityId;
          }
          if (autoHierarchy.targetAdminUnitId && !surveyData.targetAdminUnitId) {
            surveyData.targetAdminUnitId = autoHierarchy.targetAdminUnitId;
          }
          if (autoHierarchy.targetDistrictId && !surveyData.targetDistrictId) {
            surveyData.targetDistrictId = autoHierarchy.targetDistrictId;
          }
        }
      }
    }
    
    // Validate that hierarchy targeting is provided (fallback)
    if (!surveyData.targetRegionId && !surveyData.targetExpatriateRegionId && !surveyData.targetSectorRegionId) {
      res.status(400).json({ error: 'targetRegionId is required for creating surveys' });
      return;
    }
    
    const survey = await contentService.createSurvey(userId, surveyData);
    res.status(201).json(survey);
  } catch (error: any) {
    console.error('Error in createSurvey controller:', error);
    
    if (error.message === 'Missing required fields' || 
        error.message === 'User not found' || 
        error.message.includes('targetRegionId is required')) {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subscriptions
export const getActiveSubscriptions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const subscriptions = await contentService.getActiveSubscriptions(userId);
    res.json(subscriptions);
  } catch (error: any) {
    console.error('Error in getActiveSubscriptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPreviousSubscriptions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const subscriptions = await contentService.getPreviousSubscriptions(userId);
    res.json(subscriptions);
  } catch (error: any) {
    console.error('Error in getPreviousSubscriptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const subscribe = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const { planId } = req.body;
    
    const subscription = await contentService.subscribe(userId, planId);
    res.status(201).json(subscription);
  } catch (error: any) {
    console.error('Error in subscribe controller:', error);
    
    if (error.message === 'Subscription plan not available') {
      res.status(400).json({ error: error.message });
      return;
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reports
export const submitReport = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Configure multer storage for report attachments
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => {
        // Create a unique directory for each report using temporary ID
        const tempId = uuidv4();
        const uploadDir = path.join(__dirname, '../../public/uploads/reports', tempId);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Store the temp ID in request for later use
        (req as any).reportTempId = tempId;
        
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        // Keep original filename for reports
        cb(null, file.originalname);
      }
    });
    
    const upload = multer({ 
      storage, 
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });
    
    upload.array('attachments', 5)(req as any, res, async (err: any) => {
      if (err) {
        console.error('Error uploading files:', err);
        res.status(400).json({ error: err.message || 'Error uploading files' });
        return;
      }

      try {
        // Parse report data from form data
        const reportData = {
          title: (req as any).body.title,
          type: (req as any).body.type,
          description: (req as any).body.description,
          date: (req as any).body.date || new Date().toISOString(),
          attachmentName: (req as any).files && (req as any).files.length > 0 ? (req as any).files[0].originalname : undefined
        };
        
        // Add hierarchy targeting based on user's position
        const user = await HierarchyService.getUserWithHierarchy(userId);
        if (user) {
          const hierarchyTarget = HierarchyService.determineContentHierarchy(user);
          Object.assign(reportData, hierarchyTarget);
        }
        
        // Create the report
        const report = await contentService.submitReport(userId, reportData);
        
        // If files were uploaded, rename the directory to use the actual report ID
        if ((req as any).files && (req as any).files.length > 0 && (req as any).reportTempId) {
          const oldDir = path.join(__dirname, '../../public/uploads/reports', (req as any).reportTempId);
          const newDir = path.join(__dirname, '../../public/uploads/reports', report.id);
          
          try {
            fs.renameSync(oldDir, newDir);
            console.log(`Renamed report directory from ${(req as any).reportTempId} to ${report.id}`);
          } catch (renameError: any) {
            console.error('Error renaming report directory:', renameError);
          }
        }
        
        res.status(201).json(report);
      } catch (error: any) {
        console.error('Error creating report:', error);
        
        // Clean up uploaded files if report creation failed
        if ((req as any).reportTempId) {
          const uploadDir = path.join(__dirname, '../../public/uploads/reports', (req as any).reportTempId);
          try {
            if (fs.existsSync(uploadDir)) {
              fs.rmSync(uploadDir, { recursive: true, force: true });
            }
          } catch (cleanupError: any) {
            console.error('Error cleaning up failed upload:', cleanupError);
          }
        }
        
        res.status(500).json({ error: 'Failed to create report: ' + error.message });
      }
    });
  } catch (error: any) {
    console.error('Error in submitReport controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserReports = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const reports = await contentService.getUserReports(userId);
    res.json(reports);
  } catch (error: any) {
    console.error('Error in getUserReports controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAllReports = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { status } = req.query;
    const adminUser = req.user;
    
    if (!adminUser) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    console.log('Getting reports for user with ID:', adminUser.id);
    
    // Use our updated contentService getAllReports function with hierarchical filtering
    const reports = await contentService.getAllReports(status as string, adminUser);
    
    res.json(reports);
  } catch (error: any) {
    console.error('Error in getAllReports controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReportById = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const reportId = req.params.id;
    
    try {
      const report = await contentService.getReportById(reportId);
      res.json(report);
    } catch (error: any) {
      if (error.message === 'Report not found') {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in getReportById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update report status
export const updateReportStatus = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const reportId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }
    
    try {
      const report = await contentService.updateReportStatus(reportId, status);
      res.json(report);
    } catch (error: any) {
      if (error.message === 'Report not found') {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      if (error.message.includes('Invalid status')) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in updateReportStatus controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update archive document
export const updateArchiveDocument = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, category } = req.body;
    
    try {
      const document = await contentService.updateArchiveDocument(id, { title, category });
      res.json(document);
    } catch (error: any) {
      if (error.code === 'P2025') {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in updateArchiveDocument controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get report attachment file
export const getReportAttachment = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const reportId = req.params.id;
    const filename = req.params.filename;
    
    // Sanitize the filename to prevent directory traversal
    const sanitizedFilename = path.basename(filename);
    
    // First check if the report exists and the filename matches
    try {
      const report = await contentService.getReportById(reportId);
      
      // Verify that this report has an attachment with this name
      if (!report.attachmentName || report.attachmentName !== sanitizedFilename) {
        console.error(`Attachment ${sanitizedFilename} not found for report ${reportId}`);
        res.status(404).json({ error: 'Attachment not found' });
        return;
      }
      
      // Path to the attachment file
      const attachmentPath = path.join(__dirname, '../../public/uploads/reports', reportId, sanitizedFilename);
      
      // Check if file exists
      if (!fs.existsSync(attachmentPath)) {
        console.error(`File not found at path: ${attachmentPath}`);
        res.status(404).json({ error: 'Attachment file not found' });
        return;
      }
      
      // Determine content type
      const ext = path.extname(sanitizedFilename).toLowerCase();
      const contentType = (() => {
        switch (ext) {
          case '.pdf': return 'application/pdf';
          case '.jpg': case '.jpeg': return 'image/jpeg';
          case '.png': return 'image/png';
          case '.gif': return 'image/gif';
          case '.doc': case '.docx': return 'application/msword';
          case '.xls': case '.xlsx': return 'application/vnd.ms-excel';
          case '.ppt': case '.pptx': return 'application/vnd.ms-powerpoint';
          default: return 'application/octet-stream';
        }
      })();
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${sanitizedFilename}"`);
      
      // Stream the file to the response
      const fileStream = fs.createReadStream(attachmentPath);
      fileStream.pipe(res);
      
    } catch (error: any) {
      if (error.message === 'Report not found') {
        res.status(404).json({ error: 'Report not found' });
        return;
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error in getReportAttachment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchy targeting options for content creation
export const getHierarchyTargetingOptions = async (req: AuthenticatedRequest, res: Response, _next?: NextFunction): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const user = await HierarchyService.getUserWithHierarchy(userId);
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    const options = await HierarchyService.getContentTargetingOptions(user);
    res.json(options);
  } catch (error: any) {
    console.error('Error in getHierarchyTargetingOptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

