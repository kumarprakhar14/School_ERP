import jwt from 'jsonwebtoken';

const generateToken = (userId, schoolId, role) => {
  return jwt.sign(
    { userId, schoolId, role },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'secret');
  } catch (error) {
    return null;
  }
};

export { generateToken,
  verifyToken,
 };
