const prisma = require('../utils/db');

// TEACHER/ADMIN: Mark attendance
const markAttendance = async (req, res) => {
  try {
    const { classId, sectionId, date, records } = req.body; 
    // records: [{ studentId, status, remarks }]
    const schoolId = req.user.schoolId;

    const existingDate = new Date(date);
    existingDate.setHours(0,0,0,0);
    const nextDate = new Date(existingDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = {
      classId,
      date: { gte: existingDate, lt: nextDate }
    };
    if (sectionId) whereClause.sectionId = sectionId;
    else whereClause.sectionId = null; // Important: if it's class level, ensure we target null section

    const existingRecords = await prisma.attendance.findMany({
      where: whereClause
    });

    const isLockedOrSaved = existingRecords.some(r => r.isLocked || r.isSaved);
    if (isLockedOrSaved) {
      return res.status(400).json({ message: 'Cannot modify attendance as it is locked or saved.' });
    }

    await prisma.attendance.deleteMany({
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

    await prisma.attendance.createMany({
      data: newRecords
    });

    res.status(201).json({ message: 'Attendance marked successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ANY ROLE: Get attendance
const getAttendance = async (req, res) => {
  try {
    const { classId, sectionId, date, studentId } = req.query;
    const whereClause = {};
    if (classId) whereClause.classId = classId;
    if (sectionId) whereClause.sectionId = sectionId;
    else if (classId) whereClause.sectionId = null; // if querying by class and no section, we might want null, BUT actually for reporting we might want all sections. Let's just use what's provided. If sectionId is strictly empty string in frontend, it means no section. Let's assume if it's explicitly 'null' or empty string and classId is there, we filter by null. Wait, frontend will send sectionId as empty string.
    
    // Better logic: if classId is provided, and sectionId is provided, use both.
    // If sectionId is empty string, we want where sectionId is null.
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

    const records = await prisma.attendance.findMany({
      where: whereClause,
      include: {
        student: { select: { name: true, erpId: true } }
      }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

const updateAttendanceState = async (req, res, stateUpdate) => {
  try {
    const { classId, sectionId, date } = req.body;
    const targetDate = new Date(date);
    targetDate.setHours(0,0,0,0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const whereClause = {
      classId,
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
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

const lockAttendance = (req, res) => updateAttendanceState(req, res, { isLocked: true, lockedAt: new Date() });
const unlockAttendance = (req, res) => updateAttendanceState(req, res, { isLocked: false, lockedAt: null });
const saveAttendance = (req, res) => updateAttendanceState(req, res, { isSaved: true });

module.exports = { markAttendance, getAttendance, lockAttendance, unlockAttendance, saveAttendance };
