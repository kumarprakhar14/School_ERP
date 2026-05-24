const prisma = require('../utils/db');

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
      return res.status(403).json({ message: 'School subscription has expired. Please contact administration.' });
    }

    next();
  } catch (error) {
    console.error('Validity check error:', error);
    res.status(500).json({ message: 'Server error checking school validity' });
  }
};

module.exports = {
  schoolValidityMiddleware
};
