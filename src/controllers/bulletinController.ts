import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types';
import * as contentService from '../services/contentService';
import * as path from 'path';
import * as fs from 'fs';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../utils/prisma';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/bulletins');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Generate unique filename
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname);
    cb(null, `bulletin-${uniqueSuffix}${ext}`);
  }
});

// Filter only images
const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
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

// Get bulletins with hierarchical access control
export const getBulletins = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
export const createBulletin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('=== BULLETIN CREATE START ===');
    console.log('Request headers:', req.headers);
    console.log('Raw request body:', req.body);
    
    upload.single('image')(req, res, async (err: any) => {
      if (err) {
        console.error('Error uploading file:', err);
        res.status(400).json({ error: err.message || 'Error uploading file' });
        return;
      }
      
      console.log('After upload - req.body:', req.body);
      console.log('After upload - req.file:', req.file);
      
      let bulletinData: any = {};
      
      // Handle different request formats
      if ((req.body as any).bulletinData) {
        try {
          // Try to parse as JSON if it's a string
          if (typeof (req.body as any).bulletinData === 'string') {
            bulletinData = JSON.parse((req.body as any).bulletinData);
            console.log('Parsed bulletinData from string:', bulletinData);
          } else {
            // It's already an object
            bulletinData = (req.body as any).bulletinData;
            console.log('Using bulletinData object:', bulletinData);
          }
        } catch (parseError) {
          console.error('Error parsing bulletinData:', parseError);
          res.status(400).json({ error: 'Invalid bulletin data format' });
          return;
        }
      } else if ((req.body as any).title && (req.body as any).content) {
        // Direct JSON request - fields are at the top level
        bulletinData = { 
          title: (req.body as any).title,
          content: (req.body as any).content,
          date: (req.body as any).date,
          targetRegionId: (req.body as any).targetRegionId,
          targetLocalityId: (req.body as any).targetLocalityId,
          targetAdminUnitId: (req.body as any).targetAdminUnitId,
          targetDistrictId: (req.body as any).targetDistrictId
        };
        console.log('Using direct request fields:', bulletinData);
      } else {
        console.error('No valid bulletin data found');
        res.status(400).json({ error: 'Missing bulletin data' });
        return;
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
              res.status(400).json({ error: 'No regions found to use as target' });
              return;
            }
          } catch (err) {
            console.error('Error finding default region:', err);
            res.status(400).json({ error: 'Could not find a default region' });
            return;
          }
        }
        
        // Check again if we have targetRegionId
        if (!bulletinData.targetRegionId) {
          res.status(400).json({ error: 'targetRegionId is required for creating bulletins' });
          return;
        }
        
        // Create bulletin
        console.log('Creating bulletin with final data:', bulletinData);
        const bulletin = await contentService.createBulletin(bulletinData);
        console.log('Bulletin created successfully:', bulletin.id);
        
        // Return the created bulletin
        res.status(201).json(bulletin);
      } catch (error: any) {
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
export const updateBulletin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    console.log('=== BULLETIN UPDATE START ===');
    console.log('Update request headers:', req.headers);
    console.log('Update raw request body:', req.body);
    
    const { id } = req.params;
    
    upload.single('image')(req, res, async (err: any) => {
      if (err) {
        console.error('Error uploading file:', err);
        res.status(400).json({ error: err.message || 'Error uploading file' });
        return;
      }
      
      console.log('After upload - update req.body:', req.body);
      console.log('After upload - update req.file:', req.file);
      
      let bulletinData: any = {};
      
      // Handle different request formats
      if ((req.body as any).bulletinData) {
        try {
          // Try to parse as JSON if it's a string
          if (typeof (req.body as any).bulletinData === 'string') {
            bulletinData = JSON.parse((req.body as any).bulletinData);
            console.log('Parsed update bulletinData from string:', bulletinData);
          } else {
            // It's already an object
            bulletinData = (req.body as any).bulletinData;
            console.log('Using update bulletinData object:', bulletinData);
          }
        } catch (parseError) {
          console.error('Error parsing update bulletinData:', parseError);
          res.status(400).json({ error: 'Invalid bulletin data format' });
          return;
        }
      } else if ((req.body as any).title && (req.body as any).content) {
        // Direct JSON request - fields are at the top level
        bulletinData = { 
          title: (req.body as any).title,
          content: (req.body as any).content,
          date: (req.body as any).date,
          targetRegionId: (req.body as any).targetRegionId,
          targetLocalityId: (req.body as any).targetLocalityId,
          targetAdminUnitId: (req.body as any).targetAdminUnitId,
          targetDistrictId: (req.body as any).targetDistrictId
        };
        console.log('Using direct update request fields:', bulletinData);
      } else {
        console.error('No valid update bulletin data found');
        res.status(400).json({ error: 'Missing bulletin data' });
        return;
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
              res.status(400).json({ error: 'No regions found to use as target for update' });
              return;
            }
          } catch (err) {
            console.error('Error finding default region for update:', err);
            res.status(400).json({ error: 'Could not find a default region for update' });
            return;
          }
        }
        
        // Check again if we have targetRegionId
        if (!bulletinData.targetRegionId) {
          res.status(400).json({ error: 'targetRegionId is required for updating bulletins' });
          return;
        }
        
        // Update bulletin
        console.log('Updating bulletin with final data:', bulletinData);
        const bulletin = await contentService.updateBulletin(id, bulletinData);
        
        if (!bulletin) {
          res.status(404).json({ error: 'Bulletin not found' });
          return;
        }
        
        console.log('Bulletin updated successfully:', bulletin.id);
        
        // Return the updated bulletin
        res.json(bulletin);
      } catch (error: any) {
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
export const deleteBulletin = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const success = await contentService.deleteBulletin(id);
    
    if (!success) {
      res.status(404).json({ error: 'Bulletin not found' });
      return;
    }
    
    res.status(204).end();
  } catch (error) {
    console.error('Error in deleteBulletin controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

