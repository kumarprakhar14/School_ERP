const prisma = require('../utils/db');

// ADMIN/TEACHER: Create notice
const createNotice = async (req, res) => {
  try {
    const { title, content, targetRoles } = req.body;
    const schoolId = req.user.schoolId;

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        targetRoles, // Array of roles, e.g. ["STUDENT", "TEACHER"]
        schoolId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(notice);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ANY ROLE: Get notices
const getNotices = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    // Filter notices by school and visibility rules
    const whereClause = {
      schoolId,
      isArchived: false
    };

    // If not admin, they can only see notices targeted at their role (or targeted to everyone/empty array depending on logic. Let's assume targetRoles array must contain the role or be empty for all)
    if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      whereClause.OR = [
        { targetRoles: { has: role } },
        { targetRoles: { isEmpty: true } } // empty means all roles
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
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

module.exports = { createNotice, getNotices };
