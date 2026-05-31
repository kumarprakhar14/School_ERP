const prisma = require('../utils/db');
const bcrypt = require('bcryptjs');

// SUPER ADMIN: Get all schools
const getSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      include: {
        settings: true,
        _count: {
          select: { users: true, classes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(schools);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

// SUPER ADMIN: Get school by ID
const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    const school = await prisma.school.findUnique({
      where: { id },
      include: {
        settings: true,
        _count: {
          select: { users: true, classes: true }
        }
      }
    });

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    res.json(school);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

// SUPER ADMIN: Create school
const createSchool = async (req, res) => {
  try {
    const { name, code, validUntil, themeColor, description, adminName, adminEmail, adminPassword } = req.body;
    
    // Create school
    const school = await prisma.school.create({
      data: {
        name,
        code,
        validUntil: new Date(validUntil),
        settings: {
          create: {
            themeColor: themeColor || '#3b82f6',
            description: description || ''
          }
        }
      },
      include: {
        settings: true
      }
    });

    // Create admin user if details provided
    if (adminName && adminPassword) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      const erpId = `${code}001`; // First admin gets {code}001
      
      await prisma.user.create({
        data: {
          name: adminName,
          erpId, 
          passwordHash,
          role: 'ADMIN',
          schoolId: school.id
        }
      });
    }

    res.status(201).json(school);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// SUPER ADMIN: Update school
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, validUntil, themeColor, description } = req.body;
    
    const school = await prisma.school.update({
      where: { id },
      data: {
        name,
        validUntil: validUntil ? new Date(validUntil) : undefined,
        settings: {
          upsert: {
            create: { themeColor: themeColor || '#3b82f6', description: description || '' },
            update: { themeColor, description }
          }
        }
      },
      include: {
        settings: true
      }
    });
    res.json(school);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ADMIN: Get current school settings
const getSchoolSettings = async (req, res) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      include: { settings: true }
    });
    res.json(school);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An unexpected server error occurred.' });
  }
};

// ADMIN: Update current school settings
const updateSchoolSettings = async (req, res) => {
  try {
    const { themeColor, description, logoUrl } = req.body;
    const settings = await prisma.schoolSettings.upsert({
      where: { schoolId: req.user.schoolId },
      update: { themeColor, description, logoUrl },
      create: { schoolId: req.user.schoolId, themeColor, description, logoUrl }
    });
    res.json(settings);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// SUPER ADMIN: Delete a school
const deleteSchool = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction([
      prisma.assignmentSubmission.deleteMany({ where: { assignment: { schoolId: id } } }),
      prisma.attendance.deleteMany({ where: { class: { schoolId: id } } }),
      prisma.feeRecord.deleteMany({ where: { schoolId: id } }),
      prisma.bugReport.deleteMany({ where: { reportedBy: { schoolId: id } } }),
      prisma.timeTableEntry.deleteMany({ where: { class: { schoolId: id } } }),
      prisma.assignment.deleteMany({ where: { schoolId: id } }),
      prisma.notice.deleteMany({ where: { schoolId: id } }),
      prisma.studentProfile.deleteMany({ where: { user: { schoolId: id } } }),
      prisma.teacherProfile.deleteMany({ where: { user: { schoolId: id } } }),
      prisma.period.deleteMany({ where: { schoolId: id } }),
      prisma.subject.deleteMany({ where: { schoolId: id } }),
      prisma.section.deleteMany({ where: { class: { schoolId: id } } }),
      prisma.class.deleteMany({ where: { schoolId: id } }),
      prisma.user.deleteMany({ where: { schoolId: id } }),
      prisma.schoolSettings.deleteMany({ where: { schoolId: id } }),
      prisma.school.delete({ where: { id } })
    ]);

    res.json({ message: 'School deleted successfully' });
  } catch (error) {
    console.error('Failed to delete school:', error);
    res.status(500).json({ message: 'Failed to delete school' });
  }
};

module.exports = {
  getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  getSchoolSettings,
  updateSchoolSettings
};
