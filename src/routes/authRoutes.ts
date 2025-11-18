import express, { Router } from 'express';
import * as authController from '../controllers/authController';

const router: Router = express.Router();

// Auth routes
router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/verify-token', authController.verifyToken);

export default router;

