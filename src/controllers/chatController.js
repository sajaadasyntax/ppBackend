const prisma = require('../utils/prisma');

/**
 * Admin: Create a new chat room
 */
async function createChatRoom(req, res) {
  try {
    const { title, participantUserIds } = req.body;
    const createdById = req.user.id;

    if (!title || !participantUserIds || !Array.isArray(participantUserIds)) {
      return res.status(400).json({ error: 'Title and participant user IDs are required' });
    }

    // Verify all participant users exist
    const users = await prisma.user.findMany({
      where: {
        id: { in: participantUserIds }
      }
    });

    if (users.length !== participantUserIds.length) {
      return res.status(400).json({ error: 'Some user IDs are invalid' });
    }

    // Create chat room with memberships
    const chatRoom = await prisma.chatRoom.create({
      data: {
        title,
        createdById,
        memberships: {
          create: participantUserIds.map(userId => ({
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
}

/**
 * Admin: Get all chat rooms
 */
async function getAllChatRooms(req, res) {
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
}

/**
 * Admin: Delete a chat room
 */
async function deleteChatRoom(req, res) {
  try {
    const { id: roomId } = req.params;

    // Check if room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
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
}

/**
 * Admin: Add participant to chat room
 */
async function addParticipant(req, res) {
  try {
    const { id: roomId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if room exists
    const room = await prisma.chatRoom.findUnique({
      where: { id: roomId }
    });

    if (!room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
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
}

/**
 * Admin: Remove participant from chat room
 */
async function removeParticipant(req, res) {
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
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Membership not found' });
    }
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
}

/**
 * User: Get user's chat rooms
 */
async function getUserChatRooms(req, res) {
  try {
    const userId = req.user.id;

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
}

/**
 * User: Get messages in a chat room
 */
async function getChatMessages(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;
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
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId,
        ...(cursor && {
          createdAt: {
            lt: new Date(cursor)
          }
        })
      },
      take: parseInt(limit),
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
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

/**
 * User: Send a message to a chat room
 */
async function sendMessage(req, res) {
  try {
    const { id: roomId } = req.params;
    const userId = req.user.id;
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Message text is required' });
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
      return res.status(403).json({ error: 'You are not a member of this chat room' });
    }

    // Create message
    const message = await prisma.chatMessage.create({
      data: {
        roomId,
        senderId: userId,
        text: text.trim()
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
}

module.exports = {
  createChatRoom,
  getAllChatRooms,
  deleteChatRoom,
  addParticipant,
  removeParticipant,
  getUserChatRooms,
  getChatMessages,
  sendMessage
};

