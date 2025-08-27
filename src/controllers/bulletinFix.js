// This patch fixes the JSON parsing issue in createBulletin and updateBulletin

const fixJSONParsing = (req, res, next) => {
  // Save original req.body
  const originalBody = { ...req.body };
  
  console.log('bulletinFix: Original request body:', originalBody);
  
  // Check if we have bulletinData as a string that needs parsing
  if (req.body.bulletinData && typeof req.body.bulletinData === 'string') {
    try {
      // Parse the JSON string into an object
      req.body.parsedBulletinData = JSON.parse(req.body.bulletinData);
      console.log('bulletinFix: Successfully parsed bulletinData:', req.body.parsedBulletinData);
    } catch (err) {
      console.error('bulletinFix: Failed to parse bulletinData JSON:', err);
      // Don't modify the request - let the controller handle it
    }
  }
  
  next();
};

module.exports = fixJSONParsing;
