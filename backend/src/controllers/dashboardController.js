const prisma = require('../utils/db');

const getDashboardStats = async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const role = req.user.role;

    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
      const studentCount = await prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true, isArchived: false } });
      const teacherCount = await prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true, isArchived: false } });
      const classCount = await prisma.class.count({ where: { schoolId } });
      
      return res.json({ studentCount, teacherCount, classCount });
    }

    if (role === 'STUDENT') {
      const today = new Date();
      today.setHours(0,0,0,0);
      const nextDate = new Date(today);
      nextDate.setDate(nextDate.getDate() + 1);

      const attendance = await prisma.attendance.findFirst({
        where: {
          studentId: req.user.userId,
          date: { gte: today, lt: nextDate }
        }
      });

      const profile = await prisma.studentProfile.findUnique({ where: { userId: req.user.userId } });
      let pendingAssignments = 0;
      if (profile) {
        pendingAssignments = await prisma.assignment.count({
          where: {
            sectionId: profile.sectionId,
            dueDate: { gte: new Date() },
            submissions: { none: { studentId: req.user.userId } }
          }
        });
      }

      return res.json({ 
        attendanceStatus: attendance ? attendance.status : 'NOT_MARKED',
        pendingAssignments 
      });
    }

    res.json({});
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

module.exports = { getDashboardStats };
