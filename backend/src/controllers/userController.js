import prisma from '../utils/db.js';
import bcrypt from 'bcryptjs';
import { generateNextErpId } from '../services/erpService.js';
import { NotFoundError, ForbiddenError, AppError } from '../errors/index.js';

const createUser = async (req, res, next) => {
  try {
    const { password, role, name, profileData, schoolId: bodySchoolId } = req.body;
    let schoolId = req.user.schoolId;

    if (req.user.role === 'SUPER_ADMIN') {
      if (role !== 'SUPER_ADMIN' && !bodySchoolId) {
        throw new AppError('schoolId is required when SUPER_ADMIN creates a non-super-admin user', 400);
      }
      schoolId = role === 'SUPER_ADMIN' ? null : bodySchoolId;
    }

    // Generate ERP ID
    let erpId;
    if (role === 'SUPER_ADMIN') {
      erpId = await generateNextErpId(prisma, null, null);
    } else {
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      if (!school) {
        throw new NotFoundError('School');
      }
      erpId = await generateNextErpId(prisma, schoolId, school.code);
    }

    const passwordHash = await bcrypt.hash(password || 'password123', 10);

    const userData = {
      erpId,
      passwordHash,
      role,
      name,
      schoolId: role === 'SUPER_ADMIN' ? null : schoolId
    };

    const user = await prisma.user.create({
      data: {
        ...userData,
        ...(role === 'STUDENT' && profileData && {
          studentProfile: {
            create: {
              classId: profileData.classId,
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
    next(error);
  }
};

const getUsers = async (req, res, next) => {
  try {
    const { role, schoolId: querySchoolId } = req.query;
    let schoolId = req.user.schoolId;
    
    if (req.user.role === 'SUPER_ADMIN' && querySchoolId) {
      schoolId = querySchoolId;
    }

    const page = req.query.page ? parseInt(req.query.page) : null;
    const limit = req.query.limit ? parseInt(req.query.limit) : null;

    const whereClause = {
      ...(schoolId !== undefined && { schoolId }),
      ...(role && { role })
    };

    let queryOptions = {
      where: whereClause,
      select: {
        id: true,
        erpId: true,
        name: true,
        role: true,
        isPrimary: true,
        profilePicUrl: true,
        contactDetails: true,
        studentProfile: { include: { section: { include: { class: true } } } },
        teacherProfile: { include: { assignedSections: { include: { class: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (page && limit) {
      const totalCount = await prisma.user.count({ where: whereClause });
      res.setHeader('X-Total-Count', totalCount);
      res.setHeader('X-Total-Pages', Math.ceil(totalCount / limit));
      res.setHeader('X-Current-Page', page);
      res.setHeader('X-Limit', limit);

      queryOptions.skip = (page - 1) * limit;
      queryOptions.take = limit;
    }

    const users = await prisma.user.findMany(queryOptions);
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let { name, erpId, password, role, profileData, contactDetails, isPrimary } = req.body;
    
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
    
    // Handle isPrimary transfer
    if (isPrimary === true && userId !== req.user.userId) {
      if (req.user.role === 'SUPER_ADMIN') {
        const currentPrimary = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (currentPrimary && currentPrimary.isPrimary) {
          await prisma.$transaction([
            prisma.user.updateMany({ where: { role: 'SUPER_ADMIN' }, data: { isPrimary: false } }),
            prisma.user.update({ where: { id: userId }, data: { isPrimary: true } })
          ]);
        } else {
          throw new ForbiddenError('Only the current primary Super Admin can transfer primary status');
        }
      } else if (req.user.role === 'ADMIN') {
        const currentPrimary = await prisma.user.findUnique({ where: { id: req.user.userId } });
        if (currentPrimary && currentPrimary.isPrimary) {
          await prisma.$transaction([
            prisma.user.updateMany({ where: { role: 'ADMIN', schoolId: req.user.schoolId }, data: { isPrimary: false } }),
            prisma.user.update({ where: { id: userId }, data: { isPrimary: true } })
          ]);
        } else {
          throw new ForbiddenError('Only the current primary Admin can transfer primary status');
        }
      }
    }
    
    // Update basic user
    const user = await prisma.user.update({
      where: { 
        id: userId,
        ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId })
      },
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
            classId: profileData.classId || undefined,
            sectionId: profileData.sectionId || null
          }
        });
      }
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundError('User');
    }
    
    if (targetUser.isPrimary) {
      throw new ForbiddenError('The primary Super Admin account cannot be deleted');
    }

    // Use a transaction to clean up profiles first, since they hold strict FKs to User.
    // If the user has other history (attendance, fees), the User delete will still safely throw P2003.
    await prisma.$transaction([
      prisma.studentProfile.deleteMany({ where: { userId } }),
      prisma.teacherProfile.deleteMany({ where: { userId } }),
      prisma.user.delete({
        where: { 
          id: userId,
          ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId })
        }
      })
    ]);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const user = await prisma.user.findUnique({
      where: { 
        id: userId,
        ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId })
      },
      select: {
        id: true, erpId: true, name: true, role: true, profilePicUrl: true, contactDetails: true,
        isActive: true, isArchived: true, isPrimary: true, createdAt: true, updatedAt: true,
        school: { select: { name: true, code: true } },
        studentProfile: { include: { section: { include: { class: true } } } },
        teacherProfile: { include: { assignedSections: { include: { class: true } } } }
      }
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

export { createUser, getUsers, getUser, updateUser, deleteUser  };
