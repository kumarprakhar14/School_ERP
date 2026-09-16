import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../utils/db.js';
import { setContextValue } from '../utils/requestContext.js';

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // Verify user is still active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { isActive: true, isArchived: true, school: { select: { name: true } } }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found', code: 'USER_NOT_FOUND' });
    }
    if (user.isArchived) {
      return res.status(401).json({ message: 'Account is archived', code: 'ACCOUNT_ARCHIVED' });
    }
    if (!user.isActive) {
      return res.status(401).json({ message: 'Your account has been disabled. Please contact administration.', code: 'ACCOUNT_DISABLED' });
    }

    req.user = decoded; // { userId, role, schoolId }

    setContextValue('userId', decoded.userId);
    setContextValue('userRole', decoded.role);
    setContextValue('schoolId', decoded.schoolId);
    if (user.school?.name) {
      setContextValue('schoolName', user.school.name);
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access forbidden: Insufficient permissions' });
    }
    next();
  };
};

export { authMiddleware,
  roleMiddleware,
 };
