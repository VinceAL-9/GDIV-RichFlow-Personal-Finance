import jwt from 'jsonwebtoken';
import { addDays } from 'date-fns';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const SESSION_DAYS = 7; // Sessions last 7 days

export function generateToken(userId: number): string {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: `${SESSION_DAYS}d`,
  });
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    return decoded;
  } catch (error) {
    return null;
  }
}

export function generateSessionExpiry(): Date {
  return addDays(new Date(), SESSION_DAYS);
}