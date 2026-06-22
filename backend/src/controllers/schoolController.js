import prisma from '../utils/db.js';
import bcrypt from 'bcryptjs';
import { NotFoundError } from '../errors/index.js';

// SUPER ADMIN: Get all schools
const getSchools = async (req, res, next) => {
  try {
    const includeArchived = req.query.includeArchived === 'true';
    const schools = await prisma.school.findMany({
      where: {
        ...(!includeArchived && { isArchived: false })
      },
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
    next(error);
  }
};

// SUPER ADMIN: Get school by ID
const getSchoolById = async (req, res, next) => {
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
      throw new NotFoundError('School');
    }

    res.json(school);
  } catch (error) {
    next(error);
  }
};

// SUPER ADMIN: Create school
const createSchool = async (req, res, next) => {
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
          schoolId: school.id,
          isPrimary: true
        }
      });
    }

    res.status(201).json(school);
  } catch (error) {
    next(error);
  }
};

// SUPER ADMIN: Update school
const updateSchool = async (req, res, next) => {
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
    next(error);
  }
};

// ADMIN: Get current school settings
const getSchoolSettings = async (req, res, next) => {
  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      include: { settings: true }
    });
    res.json(school);
  } catch (error) {
    next(error);
  }
};

// ADMIN: Update current school settings
const updateSchoolSettings = async (req, res, next) => {
  try {
    const { themeColor, description, logoUrl, merchantName, upiId } = req.body;
    const settings = await prisma.schoolSettings.upsert({
      where: { schoolId: req.user.schoolId },
      update: { themeColor, description, logoUrl, merchantName, upiId },
      create: { schoolId: req.user.schoolId, themeColor, description, logoUrl, merchantName, upiId }
    });
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// SUPER ADMIN: Delete a school
const deleteSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    await prisma.$transaction([
      prisma.paymentTransaction.deleteMany({ where: { paymentOrder: { schoolId: id } } }),
      prisma.paymentOrder.deleteMany({ where: { schoolId: id } }),
      prisma.assignmentSubmission.deleteMany({ where: { assignment: { schoolId: id } } }),
      prisma.attendance.deleteMany({ where: { class: { schoolId: id } } }),
      prisma.payment.deleteMany({ where: { schoolId: id } }),
      prisma.feeInvoice.deleteMany({ where: { schoolId: id } }),
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
    next(error);
  }
};

const disableSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.school.update({ where: { id }, data: { status: 'INACTIVE' } });
    res.json({ message: 'School disabled successfully' });
  } catch (error) {
    next(error);
  }
};

const enableSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.school.update({ where: { id }, data: { status: 'ACTIVE' } });
    res.json({ message: 'School enabled successfully' });
  } catch (error) {
    next(error);
  }
};

const archiveSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.school.update({ where: { id }, data: { isArchived: true } });
    res.json({ message: 'School archived successfully' });
  } catch (error) {
    next(error);
  }
};

const restoreSchool = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.school.update({ where: { id }, data: { isArchived: false } });
    res.json({ message: 'School restored successfully' });
  } catch (error) {
    next(error);
  }
};

export { getSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  disableSchool,
  enableSchool,
  archiveSchool,
  restoreSchool,
  getSchoolSettings,
  updateSchoolSettings
 };
