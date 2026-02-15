/**
 * Notification Service — unified notification delivery
 *
 * Responsibilities:
 *   1. Persist notifications in the DB  (always)
 *   2. Push via WebSocket for real-time delivery  (if user is connected)
 *   3. Queue push notifications via Expo Push API  (if push token is stored)
 *
 * Usage (in any controller):
 *   import { notify } from '../services/notificationService';
 *   await notify.hierarchyChanged(userId, 'ORIGINAL', 'EXPATRIATE');
 *   await notify.registrationApproved(userId);
 */

import prisma from '../utils/prisma';
import {
  HIERARCHY_TYPE_LABELS,
  ADMIN_LEVEL_LABELS,
  STATUS_LABELS,
} from '../constants/terminology';

type NotificationType =
  | 'BULLETIN' | 'SURVEY' | 'VOTING' | 'REPORT_STATUS'
  | 'SUBSCRIPTION' | 'CHAT' | 'SYSTEM';

// ── Socket.IO reference (set once at server startup) ────────────────
let io: any = null;

/** Call once from app.ts after io is created */
export function setSocketIO(socketIO: any) {
  io = socketIO;
}

// ── Core: create + deliver ──────────────────────────────────────────
async function send(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
) {
  // 1. Persist in DB
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    },
  });

  // 2. Push via WebSocket (if the user has an active socket connection)
  if (io) {
    io.to(`user:${userId}`).emit('notification', {
      id: notification.id,
      type,
      title,
      message,
      data,
      createdAt: notification.createdAt,
    });
  }

  // 3. Push notification via Expo (future — requires pushToken in User model)
  // await sendExpoPush(userId, title, message, data);

  return notification;
}

async function sendBulk(
  userIds: string[],
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, any>,
) {
  // Persist in DB
  await prisma.notification.createMany({
    data: userIds.map((uid) => ({
      userId: uid,
      type,
      title,
      message,
      data: data ? JSON.stringify(data) : null,
    })),
  });

  // Push via WebSocket for each connected user
  if (io) {
    for (const uid of userIds) {
      io.to(`user:${uid}`).emit('notification', { type, title, message, data });
    }
  }
}

// ─── Pre-built notification templates ───────────────────────────────

export const notify = {
  /**
   * Admin changed the user's active hierarchy.
   * Triggered from: userController.updateActiveHierarchy
   */
  hierarchyChanged: (userId: string, fromHierarchy: string, toHierarchy: string) =>
    send(userId, 'SYSTEM', 'تم تغيير التسلسل الهرمي', 
      `تم تبديل تسلسلك الهرمي من "${HIERARCHY_TYPE_LABELS[fromHierarchy] || fromHierarchy}" إلى "${HIERARCHY_TYPE_LABELS[toHierarchy] || toHierarchy}"`,
      { action: 'HIERARCHY_CHANGED', from: fromHierarchy, to: toHierarchy },
    ),

  /**
   * Admin approved the user's pending registration.
   * Triggered from: userController.approveRegistration
   */
  registrationApproved: (userId: string) =>
    send(userId, 'SYSTEM', 'تم تفعيل حسابك',
      'تمت الموافقة على طلب تسجيلك. يمكنك الآن استخدام التطبيق بالكامل.',
      { action: 'REGISTRATION_APPROVED' },
    ),

  /**
   * Admin rejected the user's registration.
   * Triggered from: userController.rejectRegistration
   */
  registrationRejected: (userId: string, reason?: string) =>
    send(userId, 'SYSTEM', 'تم رفض طلب التسجيل',
      reason || 'تم رفض طلب تسجيلك. يرجى التواصل مع المسؤول للمزيد من المعلومات.',
      { action: 'REGISTRATION_REJECTED', reason },
    ),

  /**
   * Admin changed user's status (activate/deactivate/suspend).
   * Triggered from: hierarchicalUserService.updateUserStatus
   */
  statusChanged: (userId: string, newStatus: string) =>
    send(userId, 'SYSTEM', 'تم تحديث حالة حسابك',
      `تم تغيير حالة حسابك إلى "${STATUS_LABELS[newStatus] || newStatus}".`,
      { action: 'STATUS_CHANGED', status: newStatus },
    ),

  /**
   * Admin changed user's admin level / role.
   * Triggered from: userController.updateUser
   */
  roleChanged: (userId: string, newAdminLevel: string) =>
    send(userId, 'SYSTEM', 'تم تحديث صلاحياتك',
      `تم تغيير مستوى صلاحياتك إلى "${ADMIN_LEVEL_LABELS[newAdminLevel] || newAdminLevel}".`,
      { action: 'ROLE_CHANGED', adminLevel: newAdminLevel },
    ),

  /**
   * Report status update (admin reviewed a report).
   * Triggered from: contentController.updateReportStatus
   */
  reportStatusUpdated: (userId: string, reportId: string, newStatus: string) =>
    send(userId, 'REPORT_STATUS', 'تحديث حالة التقرير',
      `تم تحديث حالة تقريرك إلى "${newStatus}".`,
      { action: 'REPORT_STATUS_UPDATED', reportId, status: newStatus },
    ),

  /**
   * New bulletin published (notify hierarchy members).
   * Triggered from: bulletinController.createBulletin
   */
  bulletinPublished: (userIds: string[], bulletinTitle: string, bulletinId: string) =>
    sendBulk(userIds, 'BULLETIN', 'نشرة جديدة',
      `تم نشر نشرة جديدة: "${bulletinTitle}"`,
      { action: 'BULLETIN_PUBLISHED', bulletinId },
    ),

  /**
   * New survey available.
   * Triggered from: contentController.createSurvey
   */
  surveyPublished: (userIds: string[], surveyTitle: string, surveyId: string) =>
    sendBulk(userIds, 'SURVEY', 'استبيان جديد',
      `تم نشر استبيان جديد: "${surveyTitle}"`,
      { action: 'SURVEY_PUBLISHED', surveyId },
    ),

  /**
   * Subscription payment status changed.
   * Triggered from: subscriptionController
   */
  subscriptionUpdated: (userId: string, status: string) =>
    send(userId, 'SUBSCRIPTION', 'تحديث الاشتراك',
      `تم تحديث حالة اشتراكك إلى "${status}".`,
      { action: 'SUBSCRIPTION_UPDATED', status },
    ),

  /**
   * Force-logout a user via WebSocket.
   * Sent when admin suspends/disables an account.
   * Mobile app should listen for 'force_logout' and clear all auth state.
   */
  forceLogout: (userId: string) => {
    if (io) {
      io.to(`user:${userId}`).emit('force_logout', {
        reason: 'تم تعليق حسابك من قبل المسؤول.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }
    // No DB notification needed — the account is being deactivated
    return Promise.resolve();
  },

  /** Generic system message */
  system: (userId: string, title: string, message: string, data?: Record<string, any>) =>
    send(userId, 'SYSTEM', title, message, data),

  /** Generic bulk system message */
  systemBulk: (userIds: string[], title: string, message: string, data?: Record<string, any>) =>
    sendBulk(userIds, 'SYSTEM', title, message, data),
};

// ─── Expo Push Notification (ready for future integration) ──────────
/**
 * To enable:
 * 1. Add `pushToken String?` field to the User model in schema.prisma
 * 2. Create a POST /api/notifications/push-token endpoint to store it
 * 3. Install `expo-server-sdk`:  npm install expo-server-sdk
 * 4. Uncomment the code below
 */
/*
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
const expo = new Expo();

async function sendExpoPush(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { pushToken: true },
  });

  if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) return;

  const message: ExpoPushMessage = {
    to: user.pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    await expo.sendPushNotificationsAsync([message]);
  } catch (error) {
    console.error('Expo push error:', error);
  }
}
*/
