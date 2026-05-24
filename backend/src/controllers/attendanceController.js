const prisma = require('../utils/db');

// TEACHER/ADMIN: Mark attendance
const markAttendance = async (req, res) => {
  try {
    const { sectionId, date, records } = req.body; 
    // records: [{ studentId, status, remarks }]
    const schoolId = req.user.schoolId;

    const existingDate = new Date(date);
    existingDate.setHours(0,0,0,0);
    const nextDate = new Date(existingDate);
    nextDate.setDate(nextDate.getDate() + 1);

    await prisma.attendance.deleteMany({
      where: {
        sectionId,
        date: {
          gte: existingDate,
          lt: nextDate
        }
      }
    });

    const newRecords = records.map(r => ({
      studentId: r.studentId,
      sectionId,
      date: existingDate,
      status: r.status,
      remarks: r.remarks || '',
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
    const { sectionId, date, studentId } = req.query;
    const whereClause = {};
    if (sectionId) whereClause.sectionId = sectionId;
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
    res.status(500).json({ message: error.message });
  }
};

module.exports = { markAttendance, getAttendance };
