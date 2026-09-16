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
    const q = (req.query.q || req.query.search || '').trim();
    const status = req.query.status || null;
    const where = {
      ...(status && { status }),
      ...(q && { OR: [{ title: { contains: q, mode: 'insensitive' } }, { description: { contains: q, mode: 'insensitive' } }] }),
    };
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q || status;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];

    if (hasPagination) {
      const [bugs, total] = await Promise.all([
        prisma.bugReport.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit, include: { reportedBy: { select: { id: true, name: true, role: true, school: { select: { name: true } } } } } }),
        prisma.bugReport.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      // Preserve legacy {bugs} key + add pagination for compat
      return res.status(200).json({ bugs, data: bugs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const bugs = await prisma.bugReport.findMany({ where: Object.keys(where).length ? where : undefined, orderBy, include: { reportedBy: { select: { id: true, name: true, role: true, school: { select: { name: true } } } } } });
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
