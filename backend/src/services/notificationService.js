import webpush from 'web-push';
import { config } from '../config/env.js';
import prisma from '../utils/db.js';

/**
 * Push Notification Service
 * 
 * Central service for all push notification operations.
 * No controller should call web-push directly — always use this service.
 * 
 * Notification categories (for user preferences):
 *   - notices
 *   - assignments
 *   - fees
 */

// Default preferences when user has no overrides (all enabled)
const DEFAULT_PREFERENCES = {
  notices: true,
  assignments: true,
  fees: true,
};

/**
 * Initialize web-push with VAPID credentials.
 * Must be called once at server startup.
 */
const initializeWebPush = () => {
  webpush.setVapidDetails(
    config.vapid.subject,
    config.vapid.publicKey,
    config.vapid.privateKey
  );
  console.log('[Push] Web push initialized');
};

// ---------------------------------------------------------------------------
// SUBSCRIPTION MANAGEMENT
// ---------------------------------------------------------------------------

/**
 * Save or update a user's push subscription.
 * Uses upsert on the unique endpoint to prevent duplicates when the same
 * device re-subscribes (e.g., after clearing browser data).
 */
const saveSubscription = async (userId, schoolId, subscriptionPayload) => {
  const { endpoint } = subscriptionPayload;

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    update: {
      userId,
      schoolId,
      subscription: subscriptionPayload,
    },
    create: {
      userId,
      schoolId,
      endpoint,
      subscription: subscriptionPayload,
    },
  });
};

/**
 * Remove a subscription by endpoint.
 * Called when a user explicitly disables notifications from settings.
 */
const removeSubscription = async (userId, endpoint) => {
  await prisma.pushSubscription.deleteMany({
    where: { userId, endpoint },
  });
};

// ---------------------------------------------------------------------------
// NOTIFICATION DELIVERY
// ---------------------------------------------------------------------------

/**
 * Send a push notification to a specific user (all their devices).
 * @param {string} userId
 * @param {Object} payload - { title, body, url, category }
 */
const notifyUser = async (userId, payload) => {
  if (payload.category) {
    const shouldSend = await _checkPreference(userId, payload.category);
    if (!shouldSend) return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const sentCount = await _sendToSubscriptions(subscriptions, payload);
  await _logNotification(null, payload.title, payload.body, 'USER', userId, sentCount, [userId]);
};

/**
 * Send a push notification to all users in a school matching given roles.
 * @param {string} schoolId
 * @param {string[]} roles - Array of UserRole values
 * @param {Object} payload - { title, body, url, category }
 */
const notifySchoolByRoles = async (schoolId, roles, payload) => {
  const users = await prisma.user.findMany({
    where: { schoolId, role: { in: roles }, isActive: true, isArchived: false },
    select: { id: true, notificationPreferences: true },
  });

  // Filter by user preferences
  const eligibleUserIds = users
    .filter(u => _checkPreferenceSync(u.notificationPreferences, payload.category))
    .map(u => u.id);

  if (eligibleUserIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: eligibleUserIds }, schoolId },
  });

  const sentCount = await _sendToSubscriptions(subscriptions, payload);
  await _logNotification(schoolId, payload.title, payload.body, 'ROLE', roles.join(','), sentCount, eligibleUserIds);
};

/**
 * Send a push notification to all students in a specific section.
 * @param {string} sectionId
 * @param {Object} payload - { title, body, url, category }
 */
const notifySection = async (sectionId, payload) => {
  const studentProfiles = await prisma.studentProfile.findMany({
    where: { sectionId },
    select: {
      user: {
        select: { id: true, schoolId: true, notificationPreferences: true }
      }
    },
  });

  const eligibleUserIds = studentProfiles
    .filter(sp => _checkPreferenceSync(sp.user.notificationPreferences, payload.category))
    .map(sp => sp.user.id);

  if (eligibleUserIds.length === 0) return;

  const schoolId = studentProfiles[0]?.user?.schoolId || null;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: eligibleUserIds } },
  });

  const sentCount = await _sendToSubscriptions(subscriptions, payload);
  await _logNotification(schoolId, payload.title, payload.body, 'SECTION', sectionId, sentCount, eligibleUserIds);
};

/**
 * Send a push notification to everyone in a school.
 * @param {string} schoolId
 * @param {Object} payload - { title, body, url, category }
 */
const notifySchool = async (schoolId, payload) => {
  const users = await prisma.user.findMany({
    where: { schoolId, isActive: true, isArchived: false },
    select: { id: true, notificationPreferences: true },
  });

  const eligibleUserIds = users
    .filter(u => _checkPreferenceSync(u.notificationPreferences, payload.category))
    .map(u => u.id);

  if (eligibleUserIds.length === 0) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { schoolId, userId: { in: eligibleUserIds } },
  });

  const sentCount = await _sendToSubscriptions(subscriptions, payload);
  await _logNotification(schoolId, payload.title, payload.body, 'SCHOOL', schoolId, sentCount, eligibleUserIds);
};

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Send push notifications to a list of subscription records.
 * Auto-cleans expired/invalid subscriptions (410 Gone, 404 Not Found).
 * @returns {number} Number of successfully sent notifications
 */
const _sendToSubscriptions = async (subscriptions, payload) => {
  if (subscriptions.length === 0) return 0;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/',
    icon: '/web-app-manifest-192x192.png',
  });

  let sentCount = 0;
  const staleEndpoints = [];

  const results = await Promise.allSettled(
    subscriptions.map(sub =>
      webpush.sendNotification(sub.subscription, notificationPayload)
        .then(() => { sentCount++; })
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            // Subscription expired or invalid — mark for cleanup
            staleEndpoints.push(sub.endpoint);
          } else {
            console.error(`[Push] Failed to send to ${sub.endpoint}:`, err.statusCode || err.message);
          }
        })
    )
  );

  // Auto-clean stale subscriptions
  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
    console.log(`[Push] Cleaned ${staleEndpoints.length} stale subscription(s)`);
  }

  return sentCount;
};

/**
 * Log a sent notification for audit trail and create in-app UserNotifications.
 */
const _logNotification = async (schoolId, title, body, targetType, targetId, sentCount, userIds = []) => {
  try {
    const notificationLog = await prisma.notificationLog.create({
      data: { schoolId, title, body, targetType, targetId, sentCount },
    });

    if (userIds.length > 0) {
      const userNotifs = userIds.map(userId => ({
        userId,
        notificationLogId: notificationLog.id,
      }));

      await prisma.userNotification.createMany({
        data: userNotifs,
      });
    }
  } catch (err) {
    // Logging failure should never crash the app
    console.error('[Push] Failed to log notification:', err.message);
  }
};

/**
 * Check if a user's notification preferences allow a specific category.
 * Async version — fetches preferences from DB by userId.
 */
const _checkPreference = async (userId, category) => {
  if (!category) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  return _checkPreferenceSync(user?.notificationPreferences, category);
};

/**
 * Check preferences synchronously when preferences object is already available.
 * null preferences = all enabled (default).
 */
const _checkPreferenceSync = (preferences, category) => {
  if (!category) return true;
  if (!preferences) return true; // null = all defaults enabled
  return preferences[category] !== false;
};

export {
  initializeWebPush,
  saveSubscription,
  removeSubscription,
  notifyUser,
  notifySchoolByRoles,
  notifySection,
  notifySchool,
};
