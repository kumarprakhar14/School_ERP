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
              designation: profileData?.designation || 'Teacher',
              assignedSections: profileData?.assignedSectionIds ? {
                connect: profileData.assignedSectionIds.map(id => ({ id }))
              } : undefined
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
        profilePicUrl: true,
        contactDetails: true,
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

const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    let { name, erpId, password, role, profileData, contactDetails } = req.body;
    
    if (typeof profileData === 'string') {
      try {
        profileData = JSON.parse(profileData);
      } catch (e) {}
    }

    let profilePicUrl = req.file ? req.file.path : undefined;
    
    const data = { name, erpId, role };
    if (contactDetails !== undefined) data.contactDetails = contactDetails;
    if (profilePicUrl !== undefined) data.profilePicUrl = profilePicUrl;
    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }
    
    // Update basic user
    const user = await prisma.user.update({
      where: { id: userId, schoolId: req.user.schoolId },
      data,
      select: { id: true, erpId: true, name: true, role: true }
    });

    // Update specific profiles if profileData is provided
    if (profileData) {
      if (role === 'TEACHER') {
        await prisma.teacherProfile.update({
          where: { userId },
          data: {
            designation: profileData.designation || undefined,
            assignedSections: {
              set: profileData.assignedSectionIds ? profileData.assignedSectionIds.map(id => ({ id })) : []
            }
          }
        });
      } else if (role === 'STUDENT') {
        await prisma.studentProfile.update({
          where: { userId },
          data: {
            sectionId: profileData.sectionId || null
          }
        });
      }
    }
    
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    await prisma.user.delete({
      where: { id: userId, schoolId: req.user.schoolId }
    });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({ message: 'Cannot delete user because they have associated records (e.g. attendance, fees).' });
    }
    res.status(400).json({ message: error.message });
  }
};

module.exports = { createUser, getUsers, updateUser, deleteUser };
