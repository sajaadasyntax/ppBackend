const path = require('path');
const fs = require('fs');
const prisma = require('../utils/prisma');

// Debug controller to help diagnose issues
exports.debugRequest = async (req, res) => {
  try {
    const debugInfo = {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      body: req.body,
      query: req.query,
      params: req.params,
      file: req.file,
      files: req.files,
      timestamp: new Date().toISOString()
    };
    
    // Log debug info
    console.log('=== DEBUG REQUEST START ===');
    console.log(JSON.stringify(debugInfo, null, 2));
    console.log('=== DEBUG REQUEST END ===');
    
    // Return debug info
    res.json({
      success: true,
      message: 'Debug information recorded',
      debugInfo
    });
  } catch (error) {
    console.error('Debug controller error:', error);
    res.status(500).json({ error: 'Debug controller error' });
  }
};

// Get all regions
exports.getRegions = async (req, res) => {
  try {
    const regions = await prisma.region.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        code: true
      },
      orderBy: { name: 'asc' }
    });
    
    res.json(regions);
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
};

// Test bulletin creation
exports.testBulletinCreate = async (req, res) => {
  try {
    console.log('Test bulletin create body:', req.body);
    
    // For form data
    if (req.body.bulletinData) {
      try {
        const parsedData = JSON.parse(req.body.bulletinData);
        console.log('Parsed bulletinData:', parsedData);
      } catch (err) {
        console.error('Error parsing bulletinData:', err);
      }
    }
    
    // Create a test bulletin with default values
    const testBulletin = {
      title: 'Test Bulletin',
      content: 'This is a test bulletin created by debug controller',
      date: new Date(),
      published: true
    };
    
    // Get the first region to use as target
    const regions = await prisma.region.findMany({ 
      where: { active: true },
      take: 1
    });
    
    if (!regions || regions.length === 0) {
      return res.status(400).json({ error: 'No regions found in database' });
    }
    
    // Add region targeting
    testBulletin.targetRegionId = regions[0].id;
    
    // Create bulletin
    const createdBulletin = await prisma.bulletin.create({
      data: testBulletin
    });
    
    res.json({
      success: true,
      message: 'Test bulletin created successfully',
      bulletin: createdBulletin,
      regionUsed: regions[0]
    });
  } catch (error) {
    console.error('Test bulletin create error:', error);
    res.status(500).json({ error: 'Failed to create test bulletin' });
  }
};
