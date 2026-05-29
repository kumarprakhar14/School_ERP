const prisma = require('../utils/db');

const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, sectionId } = req.body;
    const fileUrl = req.file ? req.file.path : null;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        fileUrl,
        sectionId,
        schoolId: req.user.schoolId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getAssignments = async (req, res) => {
  try {
    const { sectionId } = req.query;
    
    const whereClause = {};
    if (sectionId) whereClause.sectionId = sectionId;

    if (req.user.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (profile) whereClause.sectionId = profile.sectionId;
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        section: { select: { name: true, class: { select: { name: true } } } },
        submissions: req.user.role === 'STUDENT' 
          ? { where: { studentId: req.user.userId } } 
          : { include: { student: { select: { name: true, erpId: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    let fileUrl = req.body.fileUrl; 

    if (req.file) {
      fileUrl = req.file.path; 
    }

    if (!fileUrl) {
      return res.status(400).json({ message: 'A file or URL is required for submission.' });
    }

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        studentId: req.user.userId,
        fileUrl
      }
    });

    res.status(201).json(submission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createAssignment, getAssignments, submitAssignment };
