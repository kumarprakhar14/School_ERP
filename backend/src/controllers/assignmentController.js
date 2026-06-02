import prisma from '../utils/db.js';
import { AppError, ForbiddenError } from '../errors/index.js';

const createAssignment = async (req, res, next) => {
  try {
    const { title, description, dueDate, sectionId } = req.body;
    const fileUrl = req.file ? req.file.path : null;
    const schoolId = req.user.schoolId;

    // Verify sectionId belongs to user's school
    const section = await prisma.section.findFirst({ where: { id: sectionId, class: { schoolId } } });
    if (!section) {
      throw new ForbiddenError('The specified section does not belong to your school');
    }

    const assignment = await prisma.assignment.create({
      data: {
        title,
        description,
        dueDate: new Date(dueDate),
        fileUrl,
        sectionId,
        schoolId,
        createdBy: req.user.userId
      }
    });

    res.status(201).json(assignment);
  } catch (error) {
    next(error);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const { sectionId } = req.query;
    const schoolId = req.user.schoolId;
    
    const whereClause = { schoolId }; // Fix 5: Already has schoolId
    if (sectionId) whereClause.sectionId = sectionId;

    if (req.user.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (profile && profile.sectionId) {
        whereClause.sectionId = profile.sectionId;
      }
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let queryOptions = {
      where: whereClause,
      include: {
        section: { select: { name: true, class: { select: { name: true } } } },
        ...(req.user.role === 'STUDENT'
          ? { submissions: { where: { studentId: req.user.userId } } }
          : { _count: { select: { submissions: true } } })
      },
      orderBy: { createdAt: 'desc' }
    };

    if (page && limit) {
      const totalCount = await prisma.assignment.count({ where: whereClause });
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const assignments = await prisma.assignment.findMany(queryOptions);
    res.json(assignments);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Verify assignment belongs to student's school before submission
const submitAssignment = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const schoolId = req.user.schoolId;
    let fileUrl = req.body.fileUrl; 

    if (req.file) {
      fileUrl = req.file.path; 
    }

    if (!fileUrl) {
      throw new AppError('A file or URL is required for submission.', 400);
    }

    // Fix 5: Verify the assignment belongs to the student's school
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId }
    });
    if (!assignment) {
      throw new ForbiddenError('The specified assignment does not belong to your school');
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
    next(error);
  }
};

const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const schoolId = req.user.schoolId;

    // Verify assignment belongs to the user's school
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId }
    });
    if (!assignment) {
      throw new ForbiddenError('The specified assignment does not belong to your school');
    }

    // Only non-students can fetch all submissions for an assignment
    if (req.user.role === 'STUDENT') {
      throw new ForbiddenError('Students are not authorized to view all submissions');
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { name: true, erpId: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(submissions);
  } catch (error) {
    next(error);
  }
};

export { createAssignment, 
  getAssignments, 
  submitAssignment,
  getAssignmentSubmissions
 };
