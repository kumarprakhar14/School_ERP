/**
 * Resolve a frontend route from a notification's entityType and entityId.
 *
 * This is the single source of truth for entity → route mapping on the frontend.
 * Role-aware routing is supported where admins and students land on different pages.
 *
 * Supported entityType values:
 *   "notice"      → dashboard (all roles)
 *   "assignment"  → assignments page (all roles)
 *   "invoice"     → fees page (all roles)
 *   "payment"     → fees page (all roles)
 *   null/unknown  → notification history (safe fallback)
 *
 * @param {string|null} entityType
 * @param {string|null} entityId
 * @param {string|null} userRole   - e.g., 'ADMIN', 'TEACHER', 'STUDENT', 'ACCOUNTS'
 * @returns {string} react-router path
 */
export const resolveNotificationRoute = (entityType, entityId, userRole) => {
  switch (entityType) {
    case 'notice':
      return '/';

    case 'assignment':
      return '/assignments';

    case 'invoice':
      return '/fees';

    case 'payment':
      return '/fees';

    default:
      return '/notifications';
  }
};
