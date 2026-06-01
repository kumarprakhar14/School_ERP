import prisma from '../utils/db.js';

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
    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let queryOptions = {
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
    };

    if (page && limit) {
      const totalCount = await prisma.bugReport.count();
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const bugs = await prisma.bugReport.findMany(queryOptions);
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

export { submitBug,
  getAllBugs,
  updateBugStatus
 };
