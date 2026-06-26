import prisma from '../utils/db.js';
import { notifySchoolByRoles } from '../services/notificationService.js';

const createNotice = async (req, res, next) => {
  try {
    const { title, content, targetRoles } = req.body;
    const schoolId = req.user.schoolId;

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        targetRoles,
        schoolId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(notice);

    // Fire-and-forget: Push notification to users matching target roles
    const roles = targetRoles.length > 0 ? targetRoles : ['STUDENT', 'TEACHER', 'ADMIN', 'ACCOUNTS'];
    notifySchoolByRoles(
      schoolId,
      roles,
      {
        title: '📢 New Notice Published',
        body: 'A new notice has been published. Tap to read.',
        category: 'notices',
      },
      { entityType: 'notice', entityId: notice.id }
    ).catch(err => console.error('[Push] Notice notify failed:', err));
  } catch (error) {
    next(error);
  }
};

const getNotices = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    const whereClause = {
      schoolId,
      isArchived: false
    };

    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      whereClause.OR = [
        { targetRoles: { has: role } },
        { targetRoles: { isEmpty: true } }
      ];
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let queryOptions = {
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, role: true } }
      }
    };

    if (page && limit) {
      const totalCount = await prisma.notice.count({ where: whereClause });
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const notices = await prisma.notice.findMany(queryOptions);
    res.json(notices);
  } catch (error) {
    next(error);
  }
};

const updateNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, content, targetRoles } = req.body;
    const schoolId = req.user.schoolId;
    const role = req.user.role;
    const userId = req.user.userId;

    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    if (notice.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Forbidden: Notice belongs to another school' });
    }

    if (role !== 'ADMIN' && notice.createdBy !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only edit your own notices' });
    }

    const updatedNotice = await prisma.notice.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(targetRoles && { targetRoles })
      }
    });

    res.json(updatedNotice);
  } catch (error) {
    next(error);
  }
};

const deleteNotice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;
    const role = req.user.role;
    const userId = req.user.userId;

    const notice = await prisma.notice.findUnique({ where: { id } });

    if (!notice) {
      return res.status(404).json({ error: 'Notice not found' });
    }

    if (notice.schoolId !== schoolId) {
      return res.status(403).json({ error: 'Forbidden: Notice belongs to another school' });
    }

    if (role !== 'ADMIN' && notice.createdBy !== userId) {
      return res.status(403).json({ error: 'Forbidden: You can only delete your own notices' });
    }

    await prisma.notice.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export { createNotice, getNotices, updateNotice, deleteNotice };
