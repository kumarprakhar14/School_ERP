const prisma = require('../utils/db');

const submitBug = async (req, res) => {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

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
    console.error('Submit Bug Error:', error);
    res.status(500).json({ message: 'Failed to submit bug report' });
  }
};

const getAllBugs = async (req, res) => {
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
    console.error('Get All Bugs Error:', error);
    res.status(500).json({ message: 'Failed to fetch bug reports' });
  }
};

const updateBugStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['OPEN', 'IN_PROGRESS', 'CLOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const bug = await prisma.bugReport.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({ message: 'Status updated successfully', bug });
  } catch (error) {
    console.error('Update Bug Status Error:', error);
    res.status(500).json({ message: 'Failed to update bug status' });
  }
};

module.exports = {
  submitBug,
  getAllBugs,
  updateBugStatus
};
