import prisma from '../utils/db.js';
import { AppError, ForbiddenError } from '../errors/index.js';

// Fix 5: Helper to verify a classId belongs to the user's school
const verifyClassBelongsToSchool = async (classId, schoolId) => {
  const cls = await prisma.class.findFirst({
    where: { id: classId, schoolId }
  });
  if (!cls) {
    throw new ForbiddenError('The specified class does not belong to your school');
  }
  return cls;
};

// TEACHER/ADMIN: Mark attendance
const markAttendance = async (req, res, next) => {
  try {
    const { classId, sectionId, date, records } = req.body; 
    const schoolId = req.user.schoolId;

    // Fix 5: Verify classId belongs to this school
    await verifyClassBelongsToSchool(classId, schoolId);

    const existingDate = new Date(date);
    existingDate.setHours(0,0,0,0);
    const nextDate = new Date(existingDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = {
      classId,
      class: { schoolId }, // Fix 5: Enforce schoolId via relation
      date: { gte: existingDate, lt: nextDate }
    };
    if (sectionId) whereClause.sectionId = sectionId;
    else whereClause.sectionId = null;

    // Fix 4: Wrap check-delete-create in a transaction to prevent race conditions
    await prisma.$transaction(async (tx) => {
      const existingRecords = await tx.attendance.findMany({
        where: whereClause
      });

      const isLockedOrSaved = existingRecords.some(r => r.isLocked || r.isSaved);
      if (isLockedOrSaved) {
        throw new AppError('Cannot modify attendance as it is locked or saved.', 400);
      }

      await tx.attendance.deleteMany({
        where: whereClause
      });

      const newRecords = records.map(r => ({
        studentId: r.studentId,
        classId,
        sectionId: sectionId || null,
        date: existingDate,
        status: r.status,
        createdBy: req.user.userId
      }));

      await tx.attendance.createMany({
        data: newRecords
      });
    });

    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
};

// ANY ROLE: Get attendance
const getAttendance = async (req, res, next) => {
  try {
    const { classId, sectionId, date, studentId } = req.query;
    const schoolId = req.user.schoolId;

    // Fix 5: Always scope attendance queries to the user's school
    const whereClause = {
      class: { schoolId } // Enforce school boundary via class relation
    };

    if (classId) whereClause.classId = classId;
    if (sectionId) whereClause.sectionId = sectionId;
    else if (classId) whereClause.sectionId = null;
    
    if (classId && sectionId === '') {
      whereClause.sectionId = null;
    }

    if (date) {
      const targetDate = new Date(date);
      targetDate.setHours(0,0,0,0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);
      whereClause.date = { gte: targetDate, lt: nextDate };
    }

    if (req.user.role === 'STUDENT') {
      whereClause.studentId = req.user.userId;
    } else if (studentId) {
      whereClause.studentId = studentId;
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    let queryOptions = {
      where: whereClause,
      include: {
        student: { select: { name: true, erpId: true } }
      }
    };

    if (page && limit) {
      const totalCount = await prisma.attendance.count({ where: whereClause });
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const records = await prisma.attendance.findMany(queryOptions);
    res.json(records);
  } catch (error) {
    next(error);
  }
};

const updateAttendanceState = async (req, res, next, stateUpdate) => {
  try {
    const { classId, sectionId, date } = req.body;
    const schoolId = req.user.schoolId;

    // Fix 5: Verify classId belongs to this school
    await verifyClassBelongsToSchool(classId, schoolId);

    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = {
      classId,
      class: { schoolId }, // Fix 5: Enforce schoolId
      date: { gte: targetDate, lt: nextDate }
    };
    if (sectionId) whereClause.sectionId = sectionId;
    else whereClause.sectionId = null;

    await prisma.attendance.updateMany({
      where: whereClause,
      data: stateUpdate
    });
    res.json({ message: 'Attendance state updated successfully' });
  } catch (error) {
    next(error);
  }
};

const lockAttendance = (req, res, next) => updateAttendanceState(req, res, next, { isLocked: true, lockedAt: new Date() });
const unlockAttendance = (req, res, next) => updateAttendanceState(req, res, next, { isLocked: false, lockedAt: null });
const saveAttendance = (req, res, next) => updateAttendanceState(req, res, next, { isSaved: true });

export { markAttendance, getAttendance, lockAttendance, unlockAttendance, saveAttendance  };
