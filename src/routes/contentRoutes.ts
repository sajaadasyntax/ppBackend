import express, { Router, Request, Response, NextFunction } from 'express';
import * as contentController from '../controllers/contentController';
import * as bulletinController from '../controllers/bulletinController';
import * as contentService from '../services/contentService';
import { authenticate, authorize } from '../middlewares/auth';

const router: Router = express.Router();

// Public routes - for published content only
router.get('/public', (req: Request, _res: Response, next: NextFunction) => {
  req.query.publishedOnly = 'true';
  next();
}, contentController.getAllContent);

router.get('/public/:id', async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
  try {
    const content = await contentService.getContentById(req.params.id);
    if (!content || !content.published) {
      res.status(404).json({ error: 'Content not found' });
      return;
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
router.get('/bulletins/hierarchical', bulletinController.getBulletins); // Added this endpoint for mobile app
router.post('/bulletins', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), bulletinController.createBulletin);
router.put('/bulletins/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), bulletinController.updateBulletin);
router.delete('/bulletins/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), bulletinController.deleteBulletin);

// Archive routes
router.get('/archive', contentController.getArchiveDocuments);
router.post('/archive/upload', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.uploadArchiveDocument);
router.delete('/archive/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.deleteArchiveDocument);

// Surveys routes
router.get('/surveys', contentController.getSurveys);
router.get('/surveys/public', contentController.getPublicSurveys);
router.get('/surveys/public/hierarchical', contentController.getPublicSurveys); // Hierarchical endpoint for mobile
router.get('/surveys/member', contentController.getMemberSurveys);
router.get('/surveys/member/hierarchical', contentController.getMemberSurveys); // Hierarchical endpoint for mobile
router.post('/surveys', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.createSurvey);
router.post('/surveys/:id/respond', contentController.submitSurveyResponse);

// Voting routes
router.get('/voting', contentController.getVotingItems);
router.get('/voting/hierarchical', contentController.getVotingItems); // Hierarchical endpoint for mobile
router.post('/voting', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.createVotingItem);
router.post('/voting/:id/vote', contentController.submitVote);

// Subscriptions routes
router.get('/subscriptions/active', contentController.getActiveSubscriptions);
router.get('/subscriptions/previous', contentController.getPreviousSubscriptions);
router.post('/subscriptions/subscribe', contentController.subscribe);

// Reports routes - users can submit, admins can view all
router.post('/reports', contentController.submitReport);
router.get('/reports/user', contentController.getUserReports);
router.get('/reports', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.getAllReports);
router.get('/reports/:id', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.getReportById);
router.get('/reports/:id/attachments/:filename', authorize(['ADMIN', 'GENERAL_SECRETARIAT', 'REGION', 'LOCALITY', 'ADMIN_UNIT', 'DISTRICT']), contentController.getReportAttachment);

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

export default router;

