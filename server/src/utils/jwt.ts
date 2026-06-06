import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-key';

export const generateToken = (userId: string, role: Role, username: string): string => {
  const payload: JwtPayload = { userId, role, username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
};
