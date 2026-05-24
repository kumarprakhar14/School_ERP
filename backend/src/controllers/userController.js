const prisma = require('../utils/db');
const bcrypt = require('bcryptjs');

const createUser = async (req, res) => {
  try {
    const { erpId, password, role, name, profileData } = req.body;
    const schoolId = req.user.schoolId;

    if (!['TEACHER', 'STUDENT', 'ACCOUNTS'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role for admin creation' });
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    const userData = {
      erpId,
      passwordHash,
      role,
      name,
      schoolId
    };

    const user = await prisma.user.create({
      data: {
        ...userData,
        ...(role === 'STUDENT' && profileData && {
          studentProfile: {
            create: {
              sectionId: profileData.sectionId,
              admissionDate: profileData.admissionDate ? new Date(profileData.admissionDate) : new Date()
            }
          }
        }),
        ...(role === 'TEACHER' && {
          teacherProfile: {
            create: {
              designation: profileData?.designation || 'Teacher'
            }
          }
        })
      },
      select: { id: true, erpId: true, name: true, role: true }
    });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'ERP ID must be unique within the school' });
    }
    res.status(400).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const schoolId = req.user.schoolId;

    const users = await prisma.user.findMany({
      where: {
        schoolId,
        ...(role && { role })
      },
      select: {
        id: true,
        erpId: true,
        name: true,
        role: true,
        studentProfile: { include: { section: { include: { class: true } } } },
        teacherProfile: { include: { assignedSections: { include: { class: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createUser, getUsers };
