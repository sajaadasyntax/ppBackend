import express, { Router } from 'express';
import * as authController from '../controllers/authController';
import { authenticate } from '../middlewares/auth';

const router: Router = express.Router();

// Test route to verify routing is working
router.get('/test', (_req, res) => {
  res.json({ message: 'Auth routes are working', path: '/api/auth/test' });
});

// Auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/verify-token', authController.verifyToken);

export default router;

