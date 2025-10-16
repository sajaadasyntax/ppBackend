const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate, requireAdmin } = require('../middlewares/auth');

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

module.exports = router;

