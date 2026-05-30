const prisma = require('../utils/db');

const createAssignment = async (req, res) => {
  try {
    const { title, description, dueDate, classId, sectionId } = req.body;
    const fileUrl = req.file ? req.file.path : null;

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        fileUrl,
        classId,
        sectionId: sectionId || null,
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
    const { classId, sectionId } = req.query;
    
    const whereClause = { schoolId: req.user.schoolId };
    if (classId) whereClause.classId = classId;
    if (sectionId) whereClause.sectionId = sectionId;

    if (req.user.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (profile) {
        whereClause.classId = profile.classId;
        if (profile.sectionId) whereClause.sectionId = profile.sectionId;
      }
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        class: { select: { name: true } },
        section: { select: { name: true } },
        submissions: req.user.role === 'STUDENT' 
          ? { where: { studentId: req.user.userId } } 
          : { include: { student: { select: { name: true, erpId: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
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
