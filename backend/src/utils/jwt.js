import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const generateAccessToken = (userId, schoolId, role) => {
  return jwt.sign(
    { userId, schoolId, role },
    config.jwtSecret,
    { expiresIn: '24h' }
  );
};

const generateRefreshToken = (userId, schoolId, role) => {
  return jwt.sign(
    { userId, schoolId, role },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );
};

const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, config.jwtSecret);
  } catch (error) {
    return null;
  }
};

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, config.jwtRefreshSecret);
  } catch (error) {
    return null;
  }
};

export { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
