import prisma from '../utils/db.js';

/**
 * Get paginated notifications for the current user
 * GET /api/notifications?page=1&limit=20
 */
export const getNotifications = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId: req.user.userId },
        include: {
          notificationLog: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.userNotification.count({
        where: { userId: req.user.userId },
      }),
      prisma.userNotification.count({
        where: { userId: req.user.userId, isRead: false },
      }),
    ]);

    res.json({
      notifications: notifications.map(n => ({
        id: n.id,
        title: n.notificationLog.title,
        body: n.notificationLog.body,
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark notifications as read
 * PUT /api/notifications/read
 * Body: { ids: ["id1", "id2"] } (optional, if empty marks all as read)
 */
export const markAsRead = async (req, res, next) => {
  try {
    const ids = req.body?.ids;

    const whereClause = {
      userId: req.user.userId,
      isRead: false,
    };

    if (ids && Array.isArray(ids) && ids.length > 0) {
      whereClause.id = { in: ids };
    }

    const updated = await prisma.userNotification.updateMany({
      where: whereClause,
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({ message: 'Notifications marked as read', count: updated.count });
  } catch (error) {
    next(error);
  }
};
