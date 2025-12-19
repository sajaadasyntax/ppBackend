import express, { Router } from 'express';
import * as chatController from '../controllers/chatController';
import { authenticate, requireAdmin } from '../middlewares/auth';

const router: Router = express.Router();

// Admin routes - create and manage chat rooms
router.post('/admin/chatrooms', authenticate, requireAdmin, chatController.createChatRoom);
router.get('/admin/chatrooms', authenticate, requireAdmin, chatController.getAllChatRooms);
router.delete('/admin/chatrooms/:id', authenticate, requireAdmin, chatController.deleteChatRoom);
router.post('/admin/chatrooms/:id/participants', authenticate, requireAdmin, chatController.addParticipant);
router.delete('/admin/chatrooms/:id/participants/:userId', authenticate, requireAdmin, chatController.removeParticipant);

// User routes - access chat rooms and messages
router.get('/chatrooms', authenticate, chatController.getUserChatRooms);
router.get('/chatrooms/:id/messages', authenticate, chatController.getChatMessages);
router.post('/chatrooms/:id/messages', authenticate, chatController.sendMessage);

// Voice message upload
router.post('/chatrooms/:id/voice', authenticate, chatController.uploadVoiceMessage);

export default router;

