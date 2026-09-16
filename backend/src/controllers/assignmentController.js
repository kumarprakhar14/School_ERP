import prisma from '../utils/db.js';
import { AppError, ForbiddenError } from '../errors/index.js';
import { notifySection } from '../services/notificationService.js';

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

    // Fire-and-forget: Push notification to students in this section
    notifySection(
      sectionId,
      {
        title: '📝 New Assignment',
        body: 'A new assignment has been posted. Tap to view details.',
        category: 'assignments',
      },
      { entityType: 'assignment', entityId: assignment.id }
    ).catch(err => console.error('[Push] Assignment notify failed:', err));
  } catch (error) {
    next(error);
  }
};

const getAssignments = async (req, res, next) => {
  try {
    const { sectionId } = req.query;
    const q = (req.query.q || req.query.search || '').trim();
    const schoolId = req.user.schoolId;
    
    const whereClause = { schoolId };
    if (sectionId) whereClause.sectionId = sectionId;
    if (q) whereClause.title = { contains: q, mode: 'insensitive' };

    if (req.user.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (profile && profile.sectionId) {
        whereClause.sectionId = profile.sectionId;
      } else if (profile && !profile.sectionId) {
        // Student without section => no assignments
        return res.json({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }
    }

    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];

    if (hasPagination) {
      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where: whereClause,
          include: {
            section: { select: { name: true, class: { select: { name: true } } } },
            ...(req.user.role === 'STUDENT'
              ? { submissions: { where: { studentId: req.user.userId } } }
              : { _count: { select: { submissions: true } } })
          },
          orderBy, skip: (page - 1) * limit, take: limit,
        }),
        prisma.assignment.count({ where: whereClause }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: assignments, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const assignments = await prisma.assignment.findMany({
      where: whereClause,
      include: {
        section: { select: { name: true, class: { select: { name: true } } } },
        ...(req.user.role === 'STUDENT'
          ? { submissions: { where: { studentId: req.user.userId } } }
          : { _count: { select: { submissions: true } } })
      },
      orderBy,
    });
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

    const q = (req.query.q || req.query.search || '').trim();
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const where = { assignmentId, ...(q && { student: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { erpId: { contains: q, mode: 'insensitive' } }] } }) };
    const orderBy = [{ submittedAt: 'desc' }, { id: 'asc' }];

    if (hasPagination) {
      const [submissions, total] = await Promise.all([
        prisma.assignmentSubmission.findMany({ where, include: { student: { select: { name: true, erpId: true } } }, orderBy, skip: (page - 1) * limit, take: limit }),
        prisma.assignmentSubmission.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: submissions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { name: true, erpId: true }
        }
      },
      orderBy: [{ submittedAt: 'desc' }, { id: 'asc' }]
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
