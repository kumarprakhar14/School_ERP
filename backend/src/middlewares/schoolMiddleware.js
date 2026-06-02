import prisma from '../utils/db.js';

const schoolValidityMiddleware = async (req, res, next) => {
  if (req.user.role === 'SUPER_ADMIN') {
    return next();
  }
  
  if (!req.user.schoolId) {
    return res.status(403).json({ message: 'No school associated with user' });
  }

  try {
    const school = await prisma.school.findUnique({
      where: { id: req.user.schoolId },
      select: { validUntil: true }
    });

    if (!school) {
      return res.status(404).json({ message: 'School not found' });
    }

    if (new Date(school.validUntil) < new Date()) {
      if (req.user.role === 'ADMIN') {
        return res.status(403).json({ message: 'School subscription has expired. Please contact administration.', code: 'SCHOOL_EXPIRED_ADMIN' });
      } else {
        return res.status(401).json({ message: 'School subscription has expired. You have been logged out.', code: 'SCHOOL_EXPIRED' });
      }
    }

    next();
  } catch (error) {
    console.error('Validity check error:', error);
    res.status(500).json({ message: 'Server error checking school validity' });
  }
};

export { schoolValidityMiddleware };
