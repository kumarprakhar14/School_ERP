import prisma from '../utils/db.js';
import { ForbiddenError } from '../errors/index.js';

// Get all classes and sections for the school — intentionally bounded (few classes per school), no pagination
const getClasses = async (req, res, next) => {
  try {
    const schoolId = req.user.schoolId;
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: {
        sections: {
          include: {
            teacherAssignments: { include: { teacher: { include: { user: { select: { id: true, name: true, erpId: true } } } } } },
            _count: { select: { students: true, teacherAssignments: true } }
          }
        }
      },
      orderBy: [{ name: 'asc' }, { id: 'asc' }]
    });
    res.json(classes);
  } catch (error) {
    next(error);
  }
};

// Create a new class
const createClass = async (req, res, next) => {
  try {
    const { name } = req.body;
    const schoolId = req.user.schoolId;

    const newClass = await prisma.class.create({
      data: { name, schoolId },
      include: { sections: true }
    });
    res.status(201).json(newClass);
  } catch (error) {
    next(error);
  }
};

// Create a new section under a class
// Fix 5: Verify classId belongs to user's school
const createSection = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { name } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Ensure the class belongs to the user's school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    });
    if (!cls) {
      throw new ForbiddenError('The specified class does not belong to your school');
    }

    const section = await prisma.section.create({
      data: { name, classId }
    });
    res.status(201).json(section);
  } catch (error) {
    next(error);
  }
};

// Delete a section
// Fix 5: Verify sectionId belongs to user's school
const deleteSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const schoolId = req.user.schoolId;

    // Fix 5: Ensure the section belongs to the user's school
    const section = await prisma.section.findFirst({
      where: { id: sectionId, class: { schoolId } }
    });
    if (!section) {
      throw new ForbiddenError('The specified section does not belong to your school');
    }

    await prisma.section.delete({
      where: { id: sectionId }
    });
    res.json({ message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Update a class
// Fix 5: Enforce schoolId in where clause
const updateClass = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const { name } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Ensure the class belongs to the user's school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    });
    if (!cls) {
      throw new ForbiddenError('The specified class does not belong to your school');
    }

    const updatedClass = await prisma.class.update({
      where: { id: classId },
      data: { name }
    });
    res.json(updatedClass);
  } catch (error) {
    next(error);
  }
};

// Update a section
// Fix 5: Enforce schoolId via class relation
const updateSection = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const { name } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Ensure the section belongs to the user's school
    const section = await prisma.section.findFirst({
      where: { id: sectionId, class: { schoolId } }
    });
    if (!section) {
      throw new ForbiddenError('The specified section does not belong to your school');
    }

    const updatedSection = await prisma.section.update({
      where: { id: sectionId },
      data: { name }
    });
    res.json(updatedSection);
  } catch (error) {
    next(error);
  }
};

const getSectionStudents = async (req, res, next) => {
  try {
    const { sectionId } = req.params;
    const schoolId = req.user.schoolId;
    const q = (req.query.q || req.query.search || '').trim();
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    // Verify the section belongs to the school
    const section = await prisma.section.findFirst({
      where: { id: sectionId, class: { schoolId } }
    });
    if (!section) {
      throw new ForbiddenError('The specified section does not belong to your school');
    }

    const where = { sectionId, ...(q && { user: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { erpId: { contains: q, mode: 'insensitive' } }] } }) };
    const orderBy = { user: { name: 'asc' } };

    if (hasPagination) {
      const [students, total] = await Promise.all([
        prisma.studentProfile.findMany({ where, include: { user: { select: { id: true, name: true, erpId: true } } }, orderBy, skip: (page - 1) * limit, take: limit }),
        prisma.studentProfile.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: students, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const students = await prisma.studentProfile.findMany({
      where: { sectionId },
      include: {
        user: { select: { id: true, name: true, erpId: true } }
      },
      orderBy,
    });

    res.json(students);
  } catch (error) {
    next(error);
  }
};

const getClassStudents = async (req, res, next) => {
  try {
    const { classId } = req.params;
    const schoolId = req.user.schoolId;
    const q = (req.query.q || req.query.search || '').trim();
    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));

    // Verify the class belongs to the school
    const cls = await prisma.class.findFirst({
      where: { id: classId, schoolId }
    });
    if (!cls) {
      throw new ForbiddenError('The specified class does not belong to your school');
    }

    const where = { section: { classId }, ...(q && { user: { OR: [{ name: { contains: q, mode: 'insensitive' } }, { erpId: { contains: q, mode: 'insensitive' } }] } }) };
    const orderBy = { user: { name: 'asc' } };

    if (hasPagination) {
      const [students, total] = await Promise.all([
        prisma.studentProfile.findMany({ where, include: { user: { select: { id: true, name: true, erpId: true } } }, orderBy, skip: (page - 1) * limit, take: limit }),
        prisma.studentProfile.count({ where }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: students, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const students = await prisma.studentProfile.findMany({
      where: { section: { classId } },
      include: {
        user: { select: { id: true, name: true, erpId: true } }
      },
      orderBy,
    });

    res.json(students);
  } catch (error) {
    next(error);
  }
};

export { getClasses, 
  createClass, 
  createSection, 
  deleteSection, 
  updateClass, 
  updateSection,
  getSectionStudents,
  getClassStudents
 };
