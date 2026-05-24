const jwt = require('jsonwebtoken');

const generateToken = (userId, schoolId, role) => {
  return jwt.sign(
    { userId, schoolId, role },
    process.env.JWT_SECRET || 'secret',
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

module.exports = {
  generateToken,
  verifyToken,
};
