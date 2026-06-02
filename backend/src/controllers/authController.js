import prisma from '../utils/db.js';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';
import { NotFoundError, UnauthorizedError } from '../errors/index.js';

const USER_SELECT_FIELDS = {
  id: true,
  name: true,
  role: true,
  schoolId: true,
  erpId: true,
  profilePicUrl: true,
  contactDetails: true,
  isPrimary: true,
  school: { select: { settings: true, name: true, code: true, status: true, isArchived: true } },
  studentProfile: { include: { section: { include: { class: true } } } },
  teacherProfile: { include: { teacherAssignments: { include: { section: { include: { class: true } } } } } }
};

const login = async (req, res, next) => {
  try {
    const { erpId, password } = req.body;

    const selectFields = {
      ...USER_SELECT_FIELDS,
      passwordHash: true,
      isActive: true,
      isArchived: true
    };

    let user;
    user = await prisma.user.findFirst({
      where: { erpId },
      select: selectFields
    });

    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }
    
    if (user.isArchived) {
      throw new UnauthorizedError('Account is archived. Please contact administration.');
    }
    
    if (!user.isActive) {
      throw new UnauthorizedError('Account is disabled. Please contact administration.');
    }
    
    if (user.school) {
      if (user.school.isArchived) {
        throw new UnauthorizedError('School account is archived. Please contact administration.');
      }
      if (user.school.status === 'INACTIVE') {
        throw new UnauthorizedError('School account is inactive. Please contact administration.');
      }
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      throw new UnauthorizedError('Invalid credentials');
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
      select: USER_SELECT_FIELDS,
    });

    if (!user) {
      throw new NotFoundError('User');
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

export { login,
  getMe,
 };
