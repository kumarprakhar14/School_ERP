const prisma = require('../utils/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../utils/jwt');

const login = async (req, res, next) => {
  try {
    const { erpId, password, schoolId } = req.body;

    if (!erpId || !password) {
      return res.status(400).json({ message: 'Please provide erpId and password' });
    }

    // SUPER_ADMIN might login without schoolId, others need schoolId or we infer from erpId
    // Let's find user by erpId and optional schoolId
    const selectFields = {
      id: true, name: true, role: true, schoolId: true, erpId: true, profilePicUrl: true, contactDetails: true, passwordHash: true, isActive: true, isArchived: true, isPrimary: true,
      school: { select: { settings: true, name: true, code: true } },
      studentProfile: { include: { section: { include: { class: true } } } },
      teacherProfile: { include: { assignedSections: { include: { class: true } } } }
    };

    let user;
    if (schoolId) {
      user = await prisma.user.findUnique({
        where: { schoolId_erpId: { schoolId, erpId } },
        select: selectFields
      });
    } else {
      user = await prisma.user.findFirst({
        where: { erpId },
        select: selectFields
      });
    }

    if (!user || !user.isActive || user.isArchived) {
      return res.status(401).json({ message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.schoolId, user.role);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        schoolId: user.schoolId,
        erpId: user.erpId,
        profilePicUrl: user.profilePicUrl,
        isPrimary: user.isPrimary,
        schoolSettings: user.school?.settings,
        schoolName: user.school?.name,
        schoolCode: user.school?.code,
        contactDetails: user.contactDetails,
        studentProfile: user.studentProfile,
        teacherProfile: user.teacherProfile
      },
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        role: true,
        schoolId: true,
        erpId: true,
        profilePicUrl: true,
        contactDetails: true,
        isPrimary: true,
        school: { select: { settings: true, name: true, code: true } },
        studentProfile: { include: { section: { include: { class: true } } } },
        teacherProfile: { include: { assignedSections: { include: { class: true } } } }
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const formattedUser = {
      ...user,
      schoolSettings: user.school?.settings,
      schoolName: user.school?.name,
      schoolCode: user.school?.code,
      school: undefined
    };

    res.json({ user: formattedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  getMe,
};
