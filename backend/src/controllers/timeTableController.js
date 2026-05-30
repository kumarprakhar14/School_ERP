const prisma = require('../utils/db');

// --- SUBJECTS ---
const getSubjects = async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { schoolId: req.user.schoolId, isArchived: false },
      orderBy: { name: 'asc' }
    });
    res.json(subjects);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

const createSubject = async (req, res) => {
  try {
    const { name, code } = req.body;
    const subject = await prisma.subject.create({
      data: { name, code, schoolId: req.user.schoolId }
    });
    res.status(201).json(subject);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.subject.update({
      where: { id },
      data: { isArchived: true }
    });
    res.json({ message: 'Subject deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- PERIODS ---
const getPeriods = async (req, res) => {
  try {
    const periods = await prisma.period.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { startTime: 'asc' }
    });
    res.json(periods);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

const createPeriod = async (req, res) => {
  try {
    const { name, startTime, endTime } = req.body;
    const period = await prisma.period.create({
      data: { name, startTime, endTime, schoolId: req.user.schoolId }
    });
    res.status(201).json(period);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updatePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime } = req.body;
    const period = await prisma.period.update({
      where: { id },
      data: { name, startTime, endTime }
    });
    res.json(period);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deletePeriod = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.period.delete({ where: { id } });
    res.json({ message: 'Period deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// --- TIMETABLE ENTRIES ---
const getTimeTable = async (req, res) => {
  try {
    const { classId, sectionId, teacherId } = req.query;
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
        class: { schoolId: req.user.schoolId }
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
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

const createTimeTableEntry = async (req, res) => {
  try {
    const { classId, sectionId, subjectId, teacherId, periodId, dayOfWeek } = req.body;
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
    res.status(400).json({ message: 'Time slot conflict or error creating entry.' });
  }
};

const deleteTimeTableEntry = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.timeTableEntry.delete({ where: { id } });
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getSubjects, createSubject, deleteSubject,
  getPeriods, createPeriod, updatePeriod, deletePeriod,
  getTimeTable, createTimeTableEntry, deleteTimeTableEntry
};
