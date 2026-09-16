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

    let currentYearId = null;
    if (role === 'TEACHER' && profileData?.assignedSectionIds?.length > 0) {
      const year = await prisma.academicYear.findFirst({ where: { schoolId, isCurrent: true } });
      if (year) currentYearId = year.id;
    }

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
              sectionId: profileData.sectionId,
              admissionDate: profileData.admissionDate ? new Date(profileData.admissionDate) : new Date()
            }
          }
        }),
        ...(role === 'TEACHER' && {
          teacherProfile: {
            create: {
              designation: profileData?.designation || 'Teacher',
              ...(currentYearId && profileData.assignedSectionIds ? {
                teacherAssignments: {
                  create: profileData.assignedSectionIds.map(id => ({
                    sectionId: id,
                    academicYearId: currentYearId
                  }))
                }
              } : {})
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
    const q = (req.query.q || req.query.search || '').trim();
    let schoolId = req.user.schoolId;
    
    if (req.user.role === 'SUPER_ADMIN' && querySchoolId) {
      schoolId = querySchoolId;
    }

    const hasPagination = req.query.page !== undefined || req.query.limit !== undefined || q;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const includeArchived = req.query.includeArchived === 'true';

    const whereClause = {
      ...(schoolId !== undefined && { schoolId }),
      ...(role && { role }),
      ...(!includeArchived && { isArchived: false }),
      ...(q && { OR: [{ name: { contains: q, mode: 'insensitive' } }, { erpId: { contains: q, mode: 'insensitive' } }] })
    };

    const orderBy = [{ createdAt: 'desc' }, { id: 'asc' }];

    if (hasPagination) {
      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where: whereClause,
          select: {
            id: true,
            erpId: true,
            name: true,
            role: true,
            isActive: true,
            isArchived: true,
            isPrimary: true,
            profilePicUrl: true,
            contactDetails: true,
            studentProfile: { include: { section: { include: { class: true } } } },
            teacherProfile: { include: { teacherAssignments: { include: { section: { include: { class: true } } } } } }
          },
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where: whereClause }),
      ]);
      res.setHeader('X-Total-Count', String(total));
      res.setHeader('X-Total-Pages', String(Math.ceil(total / limit)));
      res.setHeader('X-Current-Page', String(page));
      res.setHeader('X-Limit', String(limit));
      return res.json({ data: users, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        erpId: true,
        name: true,
        role: true,
        isActive: true,
        isArchived: true,
        isPrimary: true,
        profilePicUrl: true,
        contactDetails: true,
        studentProfile: { include: { section: { include: { class: true } } } },
        teacherProfile: { include: { teacherAssignments: { include: { section: { include: { class: true } } } } } }
      },
      orderBy,
    });
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
            designation: profileData.designation || undefined
          }
        });
        
        if (profileData.assignedSectionIds !== undefined) {
          const year = await prisma.academicYear.findFirst({ where: { schoolId: req.user.schoolId, isCurrent: true } });
          if (year) {
            const tp = await prisma.teacherProfile.findUnique({ where: { userId } });
            if (tp) {
              await prisma.teacherAssignment.deleteMany({
                where: { teacherId: tp.id, academicYearId: year.id }
              });
              if (profileData.assignedSectionIds.length > 0) {
                await prisma.teacherAssignment.createMany({
                  data: profileData.assignedSectionIds.map(secId => ({
                    teacherId: tp.id,
                    sectionId: secId,
                    academicYearId: year.id
                  }))
                });
              }
            }
          }
        }
      } else if (role === 'STUDENT') {
        await prisma.studentProfile.update({
          where: { userId },
          data: {
            sectionId: profileData.sectionId || undefined
          }
        });
      }
    }
    
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const disableUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundError('User');
    if (targetUser.isPrimary) throw new ForbiddenError('Cannot disable primary account');

    await prisma.user.update({
      where: { id: userId, ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId }) },
      data: { isActive: false }
    });
    res.json({ message: 'User disabled successfully' });
  } catch (error) {
    next(error);
  }
};

const enableUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundError('User');

    await prisma.user.update({
      where: { id: userId, ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId }) },
      data: { isActive: true }
    });
    res.json({ message: 'User enabled successfully' });
  } catch (error) {
    next(error);
  }
};

const archiveUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundError('User');
    if (targetUser.isPrimary) throw new ForbiddenError('Cannot archive primary account');

    await prisma.user.update({
      where: { id: userId, ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId }) },
      data: { isArchived: true, isActive: false }
    });
    res.json({ message: 'User archived successfully' });
  } catch (error) {
    next(error);
  }
};

const restoreUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) throw new NotFoundError('User');

    await prisma.user.update({
      where: { id: userId, ...(req.user.role !== 'SUPER_ADMIN' && { schoolId: req.user.schoolId }) },
      data: { isArchived: false, isActive: true }
    });
    res.json({ message: 'User restored successfully' });
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
        teacherProfile: { include: { teacherAssignments: { include: { section: { include: { class: true } } } } } }
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

export { createUser, getUsers, getUser, updateUser, disableUser, enableUser, archiveUser, restoreUser };
