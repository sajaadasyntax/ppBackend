const express = require('express');
const contentController = require('../controllers/contentController');
const bulletinController = require('../controllers/bulletinController');
const contentService = require('../services/contentService');
const { authenticate, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes - for published content only
router.get('/public', (req, res, next) => {
  req.query.publishedOnly = 'true';
  next();
}, contentController.getAllContent);

router.get('/public/:id', async (req, res, next) => {
  try {
    const content = await contentService.getContentById(req.params.id);
    if (!content || !content.published) {
      return res.status(404).json({ error: 'Content not found' });
    }
    res.json(content);
  } catch (error) {
    console.error('Get public content by ID error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected routes - requires authentication
router.use(authenticate);

// Bulletins routes - using the fixed bulletin controller
router.get('/bulletins', bulletinController.getBulletins);
router.post('/bulletins', bulletinController.createBulletin);
router.put('/bulletins/:id', bulletinController.updateBulletin);
router.delete('/bulletins/:id', bulletinController.deleteBulletin);

// Archive routes
router.get('/archive', contentController.getArchiveDocuments);
router.post('/archive/upload', contentController.uploadArchiveDocument);
router.delete('/archive/:id', contentController.deleteArchiveDocument);

// Surveys routes
router.get('/surveys', contentController.getSurveys);
router.get('/surveys/public', contentController.getPublicSurveys);
router.get('/surveys/member', contentController.getMemberSurveys);
router.post('/surveys/:id/respond', contentController.submitSurveyResponse);

// Voting routes
router.get('/voting', contentController.getVotingItems);
router.post('/voting', contentController.createVotingItem);
router.post('/voting/:id/vote', contentController.submitVote);

// Subscriptions routes
router.get('/subscriptions/active', contentController.getActiveSubscriptions);
router.get('/subscriptions/previous', contentController.getPreviousSubscriptions);
router.post('/subscriptions/subscribe', contentController.subscribe);

// Reports routes
router.post('/reports', contentController.submitReport);
router.get('/reports/user', contentController.getUserReports);
router.get('/reports', contentController.getAllReports);
router.get('/reports/:id', contentController.getReportById);
router.get('/reports/:id/attachments/:filename', contentController.getReportAttachment);

// Hierarchy routes
router.get('/hierarchy/targeting-options', contentController.getHierarchyTargetingOptions);

// Content routes - admin only
// Note: Generic routes with path parameters (like '/:id') should be at the end
// to avoid catching specific routes
router.get('/', authorize(['ADMIN']), contentController.getAllContent);
router.post('/', authorize(['ADMIN']), contentController.createContent);

// These routes with path parameters should be at the end
router.get('/:id', authorize(['ADMIN']), contentController.getContentById);
router.put('/:id', authorize(['ADMIN']), contentController.updateContent);
router.delete('/:id', authorize(['ADMIN']), contentController.deleteContent);
router.patch('/:id/publish', authorize(['ADMIN']), contentController.togglePublishContent);

module.exports = router;