const prisma = require('../utils/db');

const submitBug = async (req, res, next) => {
  try {
    const { title, description } = req.body;

    const screenshots = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        screenshots.push(file.path);
      });
    }

    const bug = await prisma.bugReport.create({
      data: {
        title,
        description,
        screenshots,
        reportedById: req.user.userId,
      }
    });

    res.status(201).json({ message: 'Bug reported successfully', bug });
  } catch (error) {
    next(error);
  }
};

const getAllBugs = async (req, res, next) => {
  try {
    const bugs = await prisma.bugReport.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            role: true,
            school: { select: { name: true } }
          }
        }
      }
    });
    res.status(200).json({ bugs });
  } catch (error) {
    next(error);
  }
};

// Note: Bug status updates are SUPER_ADMIN only — no schoolId scoping needed
const updateBugStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const bug = await prisma.bugReport.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ message: 'Status updated successfully', bug });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitBug,
  getAllBugs,
  updateBugStatus
};
