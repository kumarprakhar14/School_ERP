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
 *
 * Entity routing:
 *   Controllers pass { entityType, entityId } when triggering a notification.
 *   The service resolves this into a URL for the web push payload, and
 *   persists entityType + entityId in NotificationLog for in-app click routing.
 *
 *   Supported entityType values:
 *     "notice"      → /
 *     "assignment"  → /assignments
 *     "invoice"     → /fees
 *     "payment"     → /fees
 */

// Default preferences when user has no overrides (all enabled)
const DEFAULT_PREFERENCES = {
  notices: true,
  assignments: true,
  fees: true,
};

/**
 * Resolve a frontend route from an entity type and id.
 * This is the single source of truth for entity → URL mapping on the backend.
 * Used exclusively to build the web push click URL.
 *
 * @param {string|undefined} entityType
 * @param {string|undefined} entityId
 * @returns {string} absolute path
 */
const resolveEntityUrl = (entityType, entityId) => {
  switch (entityType) {
    case 'notice':      return '/';
    case 'assignment':  return '/assignments';
    case 'invoice':     return '/fees';
    case 'payment':     return '/fees';
    default:            return '/notifications';
  }
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
 * @param {Object} payload       - { title, body, category }
 * @param {Object} [entity]      - { entityType, entityId }
 */
const notifyUser = async (userId, payload, entity = {}) => {
  if (payload.category) {
    const shouldSend = await _checkPreference(userId, payload.category);
    if (!shouldSend) return;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  const sentCount = await _sendToSubscriptions(subscriptions, payload, entity);
  await _logNotification(null, payload.title, payload.body, 'USER', userId, sentCount, [userId], entity);
};

/**
 * Send a push notification to all users in a school matching given roles.
 * @param {string}   schoolId
 * @param {string[]} roles    - Array of UserRole values
 * @param {Object}   payload  - { title, body, category }
 * @param {Object}   [entity] - { entityType, entityId }
 */
const notifySchoolByRoles = async (schoolId, roles, payload, entity = {}) => {
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

  const sentCount = await _sendToSubscriptions(subscriptions, payload, entity);
  await _logNotification(schoolId, payload.title, payload.body, 'ROLE', roles.join(','), sentCount, eligibleUserIds, entity);
};

/**
 * Send a push notification to all students in a specific section.
 * @param {string} sectionId
 * @param {Object} payload   - { title, body, category }
 * @param {Object} [entity]  - { entityType, entityId }
 */
const notifySection = async (sectionId, payload, entity = {}) => {
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

  const sentCount = await _sendToSubscriptions(subscriptions, payload, entity);
  await _logNotification(schoolId, payload.title, payload.body, 'SECTION', sectionId, sentCount, eligibleUserIds, entity);
};

/**
 * Send a push notification to everyone in a school.
 * @param {string} schoolId
 * @param {Object} payload   - { title, body, category }
 * @param {Object} [entity]  - { entityType, entityId }
 */
const notifySchool = async (schoolId, payload, entity = {}) => {
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

  const sentCount = await _sendToSubscriptions(subscriptions, payload, entity);
  await _logNotification(schoolId, payload.title, payload.body, 'SCHOOL', schoolId, sentCount, eligibleUserIds, entity);
};

// ---------------------------------------------------------------------------
// INTERNAL HELPERS
// ---------------------------------------------------------------------------

/**
 * Send push notifications to a list of subscription records.
 * The click URL is resolved from entityType/entityId — no hardcoded url in payload.
 * Auto-cleans expired/invalid subscriptions (410 Gone, 404 Not Found).
 * @returns {number} Number of successfully sent notifications
 */
const _sendToSubscriptions = async (subscriptions, payload, entity = {}) => {
  if (subscriptions.length === 0) return 0;

  const resolvedUrl = resolveEntityUrl(entity.entityType, entity.entityId);

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: resolvedUrl,
    icon: '/web-app-manifest-192x192.png',
  });

  let sentCount = 0;
  const staleEndpoints = [];

  await Promise.allSettled(
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
 * entityType + entityId are persisted for frontend click-routing.
 */
const _logNotification = async (schoolId, title, body, targetType, targetId, sentCount, userIds = [], entity = {}) => {
  try {
    const notificationLog = await prisma.notificationLog.create({
      data: {
        schoolId,
        title,
        body,
        entityType: entity.entityType ?? null,
        entityId: entity.entityId ?? null,
        targetType,
        targetId,
        sentCount,
      },
    });

    if (userIds.length > 0) {
      await prisma.userNotification.createMany({
        data: userIds.map(userId => ({
          userId,
          notificationLogId: notificationLog.id,
        })),
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
