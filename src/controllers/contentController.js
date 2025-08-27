const contentService = require('../services/contentService');
const HierarchyService = require('../services/hierarchyService');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/bulletins');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `bulletin-${uniqueSuffix}${ext}`);
  }
});

// Filter only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Main content management
exports.getAllContent = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const type = req.query.type;
    const publishedOnly = req.query.publishedOnly === 'true';
    
    const result = await contentService.getAllContent({ page, limit, type, publishedOnly });
    res.json(result);
  } catch (error) {
    console.error('Error in getAllContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getContentById = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentService.getContentById(id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error in getContentById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createContent = async (req, res) => {
  try {
    const content = await contentService.createContent(req.body);
    res.status(201).json(content);
  } catch (error) {
    console.error('Error in createContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.updateContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentService.updateContent(id, req.body);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error in updateContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await contentService.deleteContent(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error in deleteContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.togglePublishContent = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await contentService.togglePublishContent(id);
    
    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }
    
    res.json(content);
  } catch (error) {
    console.error('Error in togglePublishContent controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Bulletins - now filtered by user hierarchy
exports.getBulletins = async (req, res) => {
  try {
    const userId = req.user.id;
    const bulletins = await HierarchyService.getUserBulletins(userId);
    res.json(bulletins);
  } catch (error) {
    console.error('Error in getBulletins controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a new bulletin
exports.createBulletin = async (req, res) => {
  try {
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }

      const bulletinData = JSON.parse(req.body.bulletinData || '{}');
      
      // If image was uploaded, add the path to bulletinData
      if (req.file) {
        const imagePath = `/uploads/bulletins/${req.file.filename}`;
        bulletinData.image = imagePath;
      }
      
      try {
        // Validate that hierarchy targeting is provided
        if (!bulletinData.targetRegionId) {
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
              return res.status(400).json({ error: 'targetRegionId is required for creating bulletins and no default region found' });
            }
          } catch (err) {
            console.error('Error finding default region:', err);
            return res.status(400).json({ error: 'targetRegionId is required for creating bulletins' });
          }
        }
        
        // Ensure proper hierarchy targeting - make sure lower levels are only set if higher levels are set
        if (bulletinData.targetDistrictId && (!bulletinData.targetAdminUnitId || !bulletinData.targetLocalityId)) {
          return res.status(400).json({ error: 'Cannot target a district without specifying its admin unit and locality' });
        }
        
        if (bulletinData.targetAdminUnitId && !bulletinData.targetLocalityId) {
          return res.status(400).json({ error: 'Cannot target an admin unit without specifying its locality' });
        }
        
        const bulletin = await contentService.createBulletin(bulletinData);
        res.status(201).json(bulletin);
      } catch (error) {
        console.error('Error creating bulletin:', error);
        res.status(500).json({ error: 'Failed to create bulletin' });
      }
    });
  } catch (error) {
    console.error('Error in createBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update an existing bulletin
exports.updateBulletin = async (req, res) => {
  try {
    const { id } = req.params;
    
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }

      const bulletinData = JSON.parse(req.body.bulletinData || '{}');
      
      // If image was uploaded, add the path to bulletinData
      if (req.file) {
        const imagePath = `/uploads/bulletins/${req.file.filename}`;
        bulletinData.image = imagePath;
      }
      
      try {
        // Validate that hierarchy targeting is provided
        if (bulletinData.targetRegionId === undefined || bulletinData.targetRegionId === null) {
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
              return res.status(400).json({ error: 'targetRegionId is required for updating bulletins and no default region found' });
            }
          } catch (err) {
            console.error('Error finding default region for update:', err);
            return res.status(400).json({ error: 'targetRegionId is required for updating bulletins' });
          }
        }
        
        // Ensure proper hierarchy targeting - make sure lower levels are only set if higher levels are set
        if (bulletinData.targetDistrictId && (!bulletinData.targetAdminUnitId || !bulletinData.targetLocalityId)) {
          return res.status(400).json({ error: 'Cannot target a district without specifying its admin unit and locality' });
        }
        
        if (bulletinData.targetAdminUnitId && !bulletinData.targetLocalityId) {
          return res.status(400).json({ error: 'Cannot target an admin unit without specifying its locality' });
        }
        
        const bulletin = await contentService.updateBulletin(id, bulletinData);
        
        if (!bulletin) {
          return res.status(404).json({ error: 'Bulletin not found' });
        }
        
        res.json(bulletin);
      } catch (error) {
        console.error('Error updating bulletin:', error);
        res.status(500).json({ error: 'Failed to update bulletin' });
      }
    });
  } catch (error) {
    console.error('Error in updateBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a bulletin
exports.deleteBulletin = async (req, res) => {
  try {
    const { id } = req.params;
    const success = await contentService.deleteBulletin(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Bulletin not found' });
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error in deleteBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Archive documents
exports.getArchiveDocuments = async (req, res) => {
  try {
    const { category } = req.query;
    const documents = await contentService.getArchiveDocuments(category);
    res.json(documents);
  } catch (error) {
    console.error('Error in getArchiveDocuments controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Upload a new archive document
exports.uploadArchiveDocument = async (req, res) => {
  try {
    // Configure multer storage for archive documents
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../public/uploads/archive');
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
        const ext = path.extname(file.originalname);
        cb(null, `archive-${uniqueSuffix}${ext}`);
      }
    });
    
    const upload = multer({ 
      storage, 
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });
    
    upload.single('file')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }

      try {
        // Extract data directly from req.body
        const title = req.body.title || '';
        const category = req.body.category || 'document';
        
        // Log what we received
        console.log('Upload request body:', req.body);
        console.log('Upload file:', req.file);
        
        // If file was uploaded, create the document
        if (req.file) {
          const filePath = `/uploads/archive/${req.file.filename}`;
          
          const documentData = {
            title,
            category,
            url: filePath,
            size: `${(req.file.size / (1024 * 1024)).toFixed(2)}MB`,
            type: path.extname(req.file.originalname).substring(1) || 'pdf'
          };
          
          console.log('Creating document with data:', documentData);
          
          const document = await contentService.createArchiveDocument(documentData);
          return res.status(201).json(document);
        } else {
          return res.status(400).json({ error: 'No file was uploaded' });
        }
      } catch (error) {
        console.error('Error creating archive document:', error);
        res.status(500).json({ error: 'Failed to create archive document: ' + error.message });
      }
    });
  } catch (error) {
    console.error('Error in uploadArchiveDocument controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete an archive document
exports.deleteArchiveDocument = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Attempting to delete document with ID:', id);
    
    const success = await contentService.deleteArchiveDocument(id);
    
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Return a JSON response instead of empty response
    res.status(200).json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error in deleteArchiveDocument controller:', error);
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

// Surveys
exports.getSurveys = async (req, res) => {
  try {
    const userId = req.user.id;
    const surveys = await contentService.getSurveys(userId);
    res.json(surveys);
  } catch (error) {
    console.error('Error in getSurveys controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get public surveys only - now filtered by hierarchy
exports.getPublicSurveys = async (req, res) => {
  try {
    const userId = req.user.id;
    const surveys = await HierarchyService.getUserSurveys(userId);
    res.json(surveys);
  } catch (error) {
    console.error('Error in getPublicSurveys controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get member surveys only
exports.getMemberSurveys = async (req, res) => {
  try {
    const userId = req.user.id;
    const surveys = await contentService.getMemberSurveys(userId);
    res.json(surveys);
  } catch (error) {
    console.error('Error in getMemberSurveys controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.submitSurveyResponse = async (req, res) => {
  try {
    const { surveyId } = req.params;
    const userId = req.user.id;
    const { answers } = req.body;
    
    const response = await contentService.submitSurveyResponse(surveyId, userId, answers);
    res.status(201).json(response);
  } catch (error) {
    console.error('Error in submitSurveyResponse controller:', error);
    
    if (error.message === 'You have already responded to this survey') {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Voting - now filtered by hierarchy
exports.getVotingItems = async (req, res) => {
  try {
    const userId = req.user.id;
    const votingItems = await HierarchyService.getUserVotingItems(userId);
    res.json(votingItems);
  } catch (error) {
    console.error('Error in getVotingItems controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.submitVote = async (req, res) => {
  try {
    const votingId = req.params.id; // Changed from votingId to id to match route parameter
    const userId = req.user.id;
    const { optionId } = req.body;
    
    console.log(`Submitting vote: votingId=${votingId}, userId=${userId}, optionId=${optionId}`);
    
    const vote = await contentService.submitVote(votingId, userId, optionId);
    res.status(201).json(vote);
  } catch (error) {
    console.error('Error in submitVote controller:', error);
    
    if (error.message === 'You have already voted in this poll' ||
        error.message === 'This voting poll is not available' ||
        error.message === 'Invalid voting option') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.createVotingItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const votingData = req.body;
    
    // Validate that hierarchy targeting is provided
    if (!votingData.targetRegionId) {
      return res.status(400).json({ error: 'targetRegionId is required for creating voting items' });
    }
    
    const votingItem = await contentService.createVotingItem(userId, votingData);
    res.status(201).json(votingItem);
  } catch (error) {
    console.error('Error in createVotingItem controller:', error);
    
    if (error.message === 'Missing required fields' || 
        error.message === 'User not found' || 
        error.message.includes('targetRegionId is required')) {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Subscriptions
exports.getActiveSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await contentService.getActiveSubscriptions(userId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error in getActiveSubscriptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPreviousSubscriptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = await contentService.getPreviousSubscriptions(userId);
    res.json(subscriptions);
  } catch (error) {
    console.error('Error in getPreviousSubscriptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.subscribe = async (req, res) => {
  try {
    const userId = req.user.id;
    const { planId } = req.body;
    
    const subscription = await contentService.subscribe(userId, planId);
    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error in subscribe controller:', error);
    
    if (error.message === 'Subscription plan not available') {
      return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Reports
exports.submitReport = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Configure multer storage for report attachments
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        // Create a unique directory for each report using temporary ID
        const tempId = uuidv4();
        const uploadDir = path.join(__dirname, '../../public/uploads/reports', tempId);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        // Store the temp ID in request for later use
        req.reportTempId = tempId;
        
        cb(null, uploadDir);
      },
      filename: (req, file, cb) => {
        // Keep original filename for reports
        cb(null, file.originalname);
      }
    });
    
    const upload = multer({ 
      storage, 
      limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
    });
    
    upload.array('attachments', 5)(req, res, async (err) => {
      if (err) {
        console.error('Error uploading files:', err);
        return res.status(400).json({ error: err.message || 'Error uploading files' });
      }

      try {
        // Parse report data from form data
        const reportData = {
          title: req.body.title,
          type: req.body.type,
          description: req.body.description,
          date: req.body.date || new Date().toISOString(),
          attachmentName: req.files && req.files.length > 0 ? req.files[0].originalname : undefined
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
        if (req.files && req.files.length > 0 && req.reportTempId) {
          const oldDir = path.join(__dirname, '../../public/uploads/reports', req.reportTempId);
          const newDir = path.join(__dirname, '../../public/uploads/reports', report.id);
          
          try {
            fs.renameSync(oldDir, newDir);
            console.log(`Renamed report directory from ${req.reportTempId} to ${report.id}`);
          } catch (renameError) {
            console.error('Error renaming report directory:', renameError);
          }
        }
        
        res.status(201).json(report);
      } catch (error) {
        console.error('Error creating report:', error);
        
        // Clean up uploaded files if report creation failed
        if (req.reportTempId) {
          const uploadDir = path.join(__dirname, '../../public/uploads/reports', req.reportTempId);
          try {
            if (fs.existsSync(uploadDir)) {
              fs.rmSync(uploadDir, { recursive: true, force: true });
            }
          } catch (cleanupError) {
            console.error('Error cleaning up failed upload:', cleanupError);
          }
        }
        
        res.status(500).json({ error: 'Failed to create report: ' + error.message });
      }
    });
  } catch (error) {
    console.error('Error in submitReport controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const reports = await contentService.getUserReports(userId);
    res.json(reports);
  } catch (error) {
    console.error('Error in getUserReports controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getAllReports = async (req, res) => {
  try {
    const { status } = req.query;
    const adminId = req.user.id;
    
    // Use hierarchy service to get reports based on admin's managed areas
    const reports = await HierarchyService.getAdminReports(adminId);
    
    // Filter by status if provided
    const filteredReports = status ? 
      reports.filter(report => report.status === status) : 
      reports;
    
    res.json(filteredReports);
  } catch (error) {
    console.error('Error in getAllReports controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getReportById = async (req, res) => {
  try {
    const reportId = req.params.id;
    
    try {
      const report = await contentService.getReportById(reportId);
      res.json(report);
    } catch (error) {
      if (error.message === 'Report not found') {
        return res.status(404).json({ error: 'Report not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in getReportById controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get report attachment file
exports.getReportAttachment = async (req, res) => {
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
        return res.status(404).json({ error: 'Attachment not found' });
      }
      
      // Path to the attachment file
      const attachmentPath = path.join(__dirname, '../../public/uploads/reports', reportId, sanitizedFilename);
      
      // Check if file exists
      if (!fs.existsSync(attachmentPath)) {
        console.error(`File not found at path: ${attachmentPath}`);
        return res.status(404).json({ error: 'Attachment file not found' });
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
      
    } catch (error) {
      if (error.message === 'Report not found') {
        return res.status(404).json({ error: 'Report not found' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Error in getReportAttachment controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get hierarchy targeting options for content creation
exports.getHierarchyTargetingOptions = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await HierarchyService.getUserWithHierarchy(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const options = await HierarchyService.getContentTargetingOptions(user);
    res.json(options);
  } catch (error) {
    console.error('Error in getHierarchyTargetingOptions controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};