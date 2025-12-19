import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// Configure multer storage for voice messages
const voiceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'public/uploads/voice');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, `voice-${uniqueSuffix}${ext}`);
  }
});

// Filter for audio files
const audioFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/mp4',
    'audio/m4a',
    'audio/wav',
    'audio/webm',
    'audio/ogg',
    'audio/aac',
    'audio/x-m4a'
  ];
  
  if (allowedMimeTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|m4a|wav|webm|ogg|aac)$/i)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed'));
  }
};

const voiceUpload = multer({ 
  storage: voiceStorage, 
  fileFilter: audioFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit for voice messages
});

/**
 * Admin: Create a new chat room
 */
export const createChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, participantUserIds } = req.body;
    const createdById = req.user!.id;

    if (!title || !participantUserIds || !Array.isArray(participantUserIds)) {
      res.status(400).json({ error: 'Title and participant user IDs are required' });
      return;
    }

    // Verify all participant users exist
    const users = await prisma.user.findMany({
      where: {
        id: { in: participantUserIds }
      }
    });

    if (users.length !== participantUserIds.length) {
      res.status(400).json({ error: 'Some user IDs are invalid' });
      return;
    }

    // Create chat room with memberships
    const chatRoom = await prisma.chatRoom.create({
      data: {
        title,
        createdById,
        memberships: {
          create: participantUserIds.map((userId: string) => ({
            userId
          }))
        }
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                mobileNumber: true,
                memberDetails: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            email: true
          }
        }
      }
    });

    res.status(201).json(chatRoom);
  } catch (error) {
    console.error('Error creating chat room:', error);
    res.status(500).json({ error: 'Failed to create chat room' });
  }
};

/**
 * Admin: Get all chat rooms
 */
export const getAllChatRooms = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const chatRooms = await prisma.chatRoom.findMany({
      include: {
        createdBy: {
          select: {
            id: true,
            email: true
          }
        },
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                mobileNumber: true,
                memberDetails: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            memberships: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

/**
 * Admin: Delete a chat room
 */
export const deleteChatRoom = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;

    // Check if room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      res.status(404).json({ error: 'Chat room not found' });
      return;
    }

    // Delete the chat room (cascade will delete memberships and messages)
    await prisma.chatRoom.delete({
      where: { id: roomId }
    });

    res.json({ message: 'Chat room deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat room:', error);
    res.status(500).json({ error: 'Failed to delete chat room' });
  }
};

/**
 * Admin: Add participant to chat room
 */
export const addParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    // Check if room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      res.status(404).json({ error: 'Chat room not found' });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Add membership (ignore if already exists)
    const membership = await prisma.chatMembership.upsert({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      },
      create: {
        roomId,
        userId
      },
      update: {},
      include: {
        user: {
          select: {
            id: true,
            email: true,
            mobileNumber: true,
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    res.json(membership);
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
};

/**
 * Admin: Remove participant from chat room
 */
export const removeParticipant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: roomId, userId } = req.params;

    await prisma.chatMembership.delete({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    res.json({ message: 'Participant removed successfully' });
  } catch (error: any) {
    if (error.code === 'P2025') {
      res.status(404).json({ error: 'Membership not found' });
      return;
    }
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
};

/**
 * User: Get user's chat rooms
 */
export const getUserChatRooms = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;

    const chatRooms = await prisma.chatRoom.findMany({
      where: {
        memberships: {
          some: {
            userId
          }
        }
      },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                mobileNumber: true,
                memberDetails: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                memberDetails: {
                  select: {
                    fullName: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    res.json(chatRooms);
  } catch (error) {
    console.error('Error fetching user chat rooms:', error);
    res.status(500).json({ error: 'Failed to fetch chat rooms' });
  }
};

/**
 * User: Get messages in a chat room
 */
export const getChatMessages = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user!.id;
    const { cursor, limit = 50 } = req.query;

    // Verify user is a member of this room
    const membership = await prisma.chatMembership.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this chat room' });
      return;
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor as string)
          }
        })
      },
      take: parseInt(limit as string),
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            id: true,
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    res.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === parseInt(limit as string)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

/**
 * User: Send a message to a chat room (text or with metadata)
 */
export const sendMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user!.id;
    const { text, messageType = 'TEXT', mediaUrl, duration } = req.body;

    // Validate based on message type
    if (messageType === 'TEXT' && (!text || text.trim().length === 0)) {
      res.status(400).json({ error: 'Message text is required for text messages' });
      return;
    }

    if (messageType === 'VOICE' && !mediaUrl) {
      res.status(400).json({ error: 'Media URL is required for voice messages' });
      return;
    }

    // Verify user is a member of this room
    const membership = await prisma.chatMembership.findUnique({
      where: {
        roomId_userId: {
          roomId,
          userId
        }
      }
    });

    if (!membership) {
      res.status(403).json({ error: 'You are not a member of this chat room' });
      return;
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        text: text?.trim() || null,
        messageType: messageType as any,
        mediaUrl: mediaUrl || null,
        duration: duration ? parseInt(duration) : null
      },
      include: {
        sender: {
          select: {
            id: true,
            memberDetails: {
              select: {
                fullName: true
              }
            }
          }
        }
      }
    });

    // Update room's updatedAt
    await prisma.chatRoom.update({
      where: { id: roomId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

/**
 * User: Upload a voice message
 */
export const uploadVoiceMessage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  voiceUpload.single('voice')(req as any, res, async (err: any) => {
    if (err) {
      console.error('Error uploading voice file:', err);
      res.status(400).json({ error: err.message || 'Error uploading voice file' });
      return;
    }

    try {
      const { id: roomId } = req.params;
      const userId = req.user!.id;
      const duration = (req as any).body.duration;

      // Verify user is a member of this room
      const membership = await prisma.chatMembership.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId
          }
        }
      });

      if (!membership) {
        // Clean up uploaded file
        if ((req as any).file) {
          fs.unlinkSync((req as any).file.path);
        }
        res.status(403).json({ error: 'You are not a member of this chat room' });
        return;
      }

      if (!(req as any).file) {
        res.status(400).json({ error: 'No voice file was uploaded' });
        return;
      }

      const voicePath = `/uploads/voice/${(req as any).file.filename}`;

      // Create voice message
      const message = await prisma.chatMessage.create({
        data: {
          roomId,
          senderId: userId,
          text: null,
          messageType: 'VOICE',
          mediaUrl: voicePath,
          duration: duration ? parseInt(duration) : null
        },
        include: {
          sender: {
            select: {
              id: true,
              memberDetails: {
                select: {
                  fullName: true
                }
              }
            }
          }
        }
      });

      // Update room's updatedAt
      await prisma.chatRoom.update({
        where: { id: roomId },
        data: { updatedAt: new Date() }
      });

      // Emit via socket.io if available
      const io = (req as any).app.get('io');
      if (io) {
        io.to(roomId).emit('new_message', message);
      }

      res.status(201).json(message);
    } catch (error) {
      console.error('Error creating voice message:', error);
      // Clean up uploaded file on error
      if ((req as any).file) {
        try {
          fs.unlinkSync((req as any).file.path);
        } catch (e) {
          console.error('Error cleaning up file:', e);
        }
      }
      res.status(500).json({ error: 'Failed to send voice message' });
    }
  });
};

