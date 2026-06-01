const prisma = require('../utils/db');

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

    const notices = await prisma.notice.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { name: true, role: true } }
      }
    });

    res.json(notices);
  } catch (error) {
    next(error);
  }
};

module.exports = { createNotice, getNotices };
