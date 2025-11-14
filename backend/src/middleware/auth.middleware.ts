import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.utils';
import prisma from '../config/database.config';

// Extend Express Request to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        isAdmin?: boolean;
      };
    }
  }
}

/**
 * Middleware to verify access token from Authorization header
 */
export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];  // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify JWT access token
    const payload = verifyAccessToken(token);
    
    if (!payload) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }

    // Add user data to request object
    req.user = payload;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware to verify user has admin privileges
 * Must be used after authenticateToken middleware
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.userId;
    const isAdmin = req.user?.isAdmin;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user has isAdmin flag in token (from JWT)
    if (isAdmin === true) {
      return next();
    }

    // Fallback: Check database for regular users with admin flag
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    });

    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}