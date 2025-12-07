import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import prisma from '../utils/prisma';

// Get notifications for the authenticated user
export const getNotifications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page = '1', limit = '20', unreadOnly = 'false' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = { userId };
    
    if (unreadOnly === 'true') {
      whereClause.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.notification.count({ where: whereClause }),
      prisma.notification.count({ where: { userId, read: false } }),
    ]);

    // Parse JSON data field for each notification
    const parsedNotifications = notifications.map(notification => ({
      ...notification,
      data: notification.data ? JSON.parse(notification.data) : null,
    }));

    res.json({
      notifications: parsedNotifications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error in getNotifications controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error('Error in getUnreadCount controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark a notification as read
export const markAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error in markAsRead controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error in markAllAsRead controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Delete a notification
export const deleteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const notification = await prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    await prisma.notification.delete({ where: { id } });

    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error in deleteNotification controller:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Create a notification (internal use)
export const createNotification = async (
  userId: string,
  type: 'BULLETIN' | 'SURVEY' | 'VOTING' | 'REPORT_STATUS' | 'SUBSCRIPTION' | 'CHAT' | 'SYSTEM',
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<any> => {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Create notifications for multiple users (bulk)
export const createBulkNotifications = async (
  userIds: string[],
  type: 'BULLETIN' | 'SURVEY' | 'VOTING' | 'REPORT_STATUS' | 'SUBSCRIPTION' | 'CHAT' | 'SYSTEM',
  title: string,
  message: string,
  data?: Record<string, any>
): Promise<void> => {
  try {
    await prisma.notification.createMany({
      data: userIds.map(userId => ({
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      })),
    });
  } catch (error) {
    console.error('Error creating bulk notifications:', error);
    throw error;
  }
};

