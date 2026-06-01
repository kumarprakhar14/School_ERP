import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const generateToken = (userId, schoolId, role) => {
  return jwt.sign(
    { userId, schoolId, role },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

export { generateToken,
  verifyToken,
 };
