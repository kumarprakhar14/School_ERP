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

module.exports = {
  getSchools,
  createSchool,
  updateSchool,
  getSchoolSettings,
  updateSchoolSettings
};
