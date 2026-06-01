const prisma = require('../utils/db');
const { ForbiddenError } = require('../errors');

// --- SUBJECTS ---
const getSubjects = async (req, res, next) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: req.user.schoolId, isArchived: false },
      orderBy: { name: 'asc' }
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

const createSubject = async (req, res, next) => {
  try {
    const { name, code } = req.body;
    const subject = await prisma.subject.create({
      data: { name, code, schoolId: req.user.schoolId }
    });
    res.status(201).json(subject);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Enforce schoolId on deleteSubject
const deleteSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify subject belongs to user's school
    const subject = await prisma.subject.findFirst({ where: { id, schoolId } });
    if (!subject) {
      throw new ForbiddenError('The specified subject does not belong to your school');
    }

    await prisma.subject.update({
      where: { id },
      data: { isArchived: true }
    });
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    next(error);
  }
};

// --- PERIODS ---
const getPeriods = async (req, res, next) => {
  try {
    const periods = await prisma.period.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { startTime: 'asc' }
    });
    res.json(periods);
  } catch (error) {
    next(error);
  }
};

const createPeriod = async (req, res, next) => {
  try {
    const { name, startTime, endTime } = req.body;
    const period = await prisma.period.create({
      data: { name, startTime, endTime, schoolId: req.user.schoolId }
    });
    res.status(201).json(period);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Enforce schoolId on updatePeriod
const updatePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify period belongs to user's school
    const existing = await prisma.period.findFirst({ where: { id, schoolId } });
    if (!existing) {
      throw new ForbiddenError('The specified period does not belong to your school');
    }

    const period = await prisma.period.update({
      where: { id },
      data: { name, startTime, endTime }
    });
    res.json(period);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Enforce schoolId on deletePeriod
const deletePeriod = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify period belongs to user's school
    const existing = await prisma.period.findFirst({ where: { id, schoolId } });
    if (!existing) {
      throw new ForbiddenError('The specified period does not belong to your school');
    }

    await prisma.period.delete({ where: { id } });
    res.json({ message: 'Period deleted' });
  } catch (error) {
    next(error);
  }
};

// --- TIMETABLE ENTRIES ---
const getTimeTable = async (req, res, next) => {
  try {
    const { classId, sectionId, teacherId } = req.query;
    const schoolId = req.user.schoolId;
    const where = {};
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (teacherId) where.teacherId = teacherId;
    // For students, restrict to their own section
    if (req.user.role === 'STUDENT') {
      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile || !profile.classId) return res.json([]);
      where.classId = profile.classId;
      if (profile.sectionId) where.sectionId = profile.sectionId;
    }
    // For teachers, restrict to their own profile if not admin
    if (req.user.role === 'TEACHER' && !teacherId) {
      const profile = await prisma.teacherProfile.findUnique({ where: { userId: req.user.userId } });
      if (!profile) return res.json([]);
      where.teacherId = profile.id;
    }

    const entries = await prisma.timeTableEntry.findMany({
      where: {
        ...where,
        class: { schoolId } // Fix 5: already had this — good
      },
      include: {
        subject: true,
        period: true,
        teacher: { include: { user: { select: { name: true } } } },
        class: true,
        section: true
      }
    });
    res.json(entries);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Verify all referenced IDs belong to user's school
const createTimeTableEntry = async (req, res, next) => {
  try {
    const { classId, sectionId, subjectId, teacherId, periodId, dayOfWeek } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify classId belongs to user's school
    const cls = await prisma.class.findFirst({ where: { id: classId, schoolId } });
    if (!cls) {
      throw new ForbiddenError('The specified class does not belong to your school');
    }

    // Fix 5: Verify subjectId belongs to user's school
    const subject = await prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!subject) {
      throw new ForbiddenError('The specified subject does not belong to your school');
    }

    // Fix 5: Verify periodId belongs to user's school
    const period = await prisma.period.findFirst({ where: { id: periodId, schoolId } });
    if (!period) {
      throw new ForbiddenError('The specified period does not belong to your school');
    }

    // Fix 5: Verify teacherId belongs to user's school
    const teacher = await prisma.teacherProfile.findFirst({
      where: { id: teacherId, user: { schoolId } }
    });
    if (!teacher) {
      throw new ForbiddenError('The specified teacher does not belong to your school');
    }

    const entry = await prisma.timeTableEntry.create({
      data: { classId, sectionId: sectionId || null, subjectId, teacherId, periodId, dayOfWeek },
      include: {
        subject: true,
        period: true,
        teacher: { include: { user: { select: { name: true } } } },
        class: true,
        section: true
      }
    });
    res.status(201).json(entry);
  } catch (error) {
    next(error);
  }
};

// Fix 5: Enforce schoolId on deleteTimeTableEntry
const deleteTimeTableEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify entry belongs to user's school
    const entry = await prisma.timeTableEntry.findFirst({
      where: { id, class: { schoolId } }
    });
    if (!entry) {
      throw new ForbiddenError('The specified timetable entry does not belong to your school');
    }

    await prisma.timeTableEntry.delete({ where: { id } });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSubjects, createSubject, deleteSubject,
  getPeriods, createPeriod, updatePeriod, deletePeriod,
  getTimeTable, createTimeTableEntry, deleteTimeTableEntry
};
