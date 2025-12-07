import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import * as notificationController from '../controllers/notificationController';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get user's notifications
router.get('/', notificationController.getNotifications);

// Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark a notification as read
router.patch('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.patch('/read-all', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

export default router;

