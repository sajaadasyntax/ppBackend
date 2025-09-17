const contentService = require('../services/contentService');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../utils/prisma');

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

// Get bulletins with hierarchical access control
exports.getBulletins = async (req, res) => {
  try {
    const adminUser = req.user; // Get the admin user with hierarchy info
    const bulletins = await contentService.getBulletins(adminUser);
    res.json(bulletins);
  } catch (error) {
    console.error('Error in getBulletins controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// FIXED bulletin creation handler
exports.createBulletin = async (req, res) => {
  try {
    console.log('=== BULLETIN CREATE START ===');
    console.log('Request headers:', req.headers);
    console.log('Raw request body:', req.body);
    
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }
      
      console.log('After upload - req.body:', req.body);
      console.log('After upload - req.file:', req.file);
      
      let bulletinData = {};
      
      // Handle different request formats
      if (req.body.bulletinData) {
        try {
          // Try to parse as JSON if it's a string
          if (typeof req.body.bulletinData === 'string') {
            bulletinData = JSON.parse(req.body.bulletinData);
            console.log('Parsed bulletinData from string:', bulletinData);
          } else {
            // It's already an object
            bulletinData = req.body.bulletinData;
            console.log('Using bulletinData object:', bulletinData);
          }
        } catch (parseError) {
          console.error('Error parsing bulletinData:', parseError);
          return res.status(400).json({ error: 'Invalid bulletin data format' });
        }
      } else if (req.body.title && req.body.content) {
        // Direct JSON request - fields are at the top level
        bulletinData = { 
          title: req.body.title,
          content: req.body.content,
          date: req.body.date,
          targetRegionId: req.body.targetRegionId,
          targetLocalityId: req.body.targetLocalityId,
          targetAdminUnitId: req.body.targetAdminUnitId,
          targetDistrictId: req.body.targetDistrictId
        };
        console.log('Using direct request fields:', bulletinData);
      } else {
        console.error('No valid bulletin data found');
        return res.status(400).json({ error: 'Missing bulletin data' });
      }
      
      // If image was uploaded, add the path to bulletinData
      if (req.file) {
        const imagePath = `/uploads/bulletins/${req.file.filename}`;
        bulletinData.image = imagePath;
        console.log('Added image path:', imagePath);
      }
      
      try {
        // Get a default region if targetRegionId is missing
        if (!bulletinData.targetRegionId) {
          console.warn('targetRegionId missing, fetching default region');
          
          try {
            const regions = await prisma.region.findMany({
              where: { active: true },
              take: 1
            });
            
            if (regions && regions.length > 0) {
              bulletinData.targetRegionId = regions[0].id;
              console.log(`Using default region ID: ${bulletinData.targetRegionId}`);
            } else {
              return res.status(400).json({ error: 'No regions found to use as target' });
            }
          } catch (err) {
            console.error('Error finding default region:', err);
            return res.status(400).json({ error: 'Could not find a default region' });
          }
        }
        
        // Check again if we have targetRegionId
        if (!bulletinData.targetRegionId) {
          return res.status(400).json({ error: 'targetRegionId is required for creating bulletins' });
        }
        
        // Create bulletin
        console.log('Creating bulletin with final data:', bulletinData);
        const bulletin = await contentService.createBulletin(bulletinData);
        console.log('Bulletin created successfully:', bulletin.id);
        
        // Return the created bulletin
        res.status(201).json(bulletin);
      } catch (error) {
        console.error('Error in createBulletin service call:', error);
        res.status(500).json({ error: error.message || 'Failed to create bulletin' });
      }
      
      console.log('=== BULLETIN CREATE END ===');
    });
  } catch (error) {
    console.error('Error in createBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// FIXED bulletin update handler
exports.updateBulletin = async (req, res) => {
  try {
    console.log('=== BULLETIN UPDATE START ===');
    console.log('Update request headers:', req.headers);
    console.log('Update raw request body:', req.body);
    
    const { id } = req.params;
    
    upload.single('image')(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ error: err.message || 'Error uploading file' });
      }
      
      console.log('After upload - update req.body:', req.body);
      console.log('After upload - update req.file:', req.file);
      
      let bulletinData = {};
      
      // Handle different request formats
      if (req.body.bulletinData) {
        try {
          // Try to parse as JSON if it's a string
          if (typeof req.body.bulletinData === 'string') {
            bulletinData = JSON.parse(req.body.bulletinData);
            console.log('Parsed update bulletinData from string:', bulletinData);
          } else {
            // It's already an object
            bulletinData = req.body.bulletinData;
            console.log('Using update bulletinData object:', bulletinData);
          }
        } catch (parseError) {
          console.error('Error parsing update bulletinData:', parseError);
          return res.status(400).json({ error: 'Invalid bulletin data format' });
        }
      } else if (req.body.title && req.body.content) {
        // Direct JSON request - fields are at the top level
        bulletinData = { 
          title: req.body.title,
          content: req.body.content,
          date: req.body.date,
          targetRegionId: req.body.targetRegionId,
          targetLocalityId: req.body.targetLocalityId,
          targetAdminUnitId: req.body.targetAdminUnitId,
          targetDistrictId: req.body.targetDistrictId
        };
        console.log('Using direct update request fields:', bulletinData);
      } else {
        console.error('No valid update bulletin data found');
        return res.status(400).json({ error: 'Missing bulletin data' });
      }
      
      // If image was uploaded, add the path to bulletinData
      if (req.file) {
        const imagePath = `/uploads/bulletins/${req.file.filename}`;
        bulletinData.image = imagePath;
        console.log('Added update image path:', imagePath);
      }
      
      try {
        // Get a default region if targetRegionId is missing
        if (!bulletinData.targetRegionId) {
          console.warn('targetRegionId missing for update, fetching default region');
          
          try {
            const regions = await prisma.region.findMany({
              where: { active: true },
              take: 1
            });
            
            if (regions && regions.length > 0) {
              bulletinData.targetRegionId = regions[0].id;
              console.log(`Using default region ID for update: ${bulletinData.targetRegionId}`);
            } else {
              return res.status(400).json({ error: 'No regions found to use as target for update' });
            }
          } catch (err) {
            console.error('Error finding default region for update:', err);
            return res.status(400).json({ error: 'Could not find a default region for update' });
          }
        }
        
        // Check again if we have targetRegionId
        if (!bulletinData.targetRegionId) {
          return res.status(400).json({ error: 'targetRegionId is required for updating bulletins' });
        }
        
        // Update bulletin
        console.log('Updating bulletin with final data:', bulletinData);
        const bulletin = await contentService.updateBulletin(id, bulletinData);
        
        if (!bulletin) {
          return res.status(404).json({ error: 'Bulletin not found' });
        }
        
        console.log('Bulletin updated successfully:', bulletin.id);
        
        // Return the updated bulletin
        res.json(bulletin);
      } catch (error) {
        console.error('Error in updateBulletin service call:', error);
        res.status(500).json({ error: error.message || 'Failed to update bulletin' });
      }
      
      console.log('=== BULLETIN UPDATE END ===');
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
