import { Request, Response, NextFunction } from 'express';
import { 
  createUser, 
  findExistingUser, 
  loginUser,
  createSession,
  findValidSession,
  invalidateSession,
  invalidateAllUserSessions
} from '../services/auth.service';
import { generateAccessToken } from '../utils/jwt.utils';
import prisma from '../config/database.config';
import jwt from 'jsonwebtoken';

/**
 * Handle user signup
 * @route POST /api/auth/signup
 */
export async function signup(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists (email or name)
    const existingUser = await findExistingUser(email, name);

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({
          error: 'An account with this email already exists'
        });
      } else {
        return res.status(409).json({
          error: 'This username is already taken'
        });
      }
    }

    // Create user
    const user = await createUser({ name, email, password });

    return res.status(201).json({
      message: 'User created successfully',
      user
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}

/**
 * Handle user login
 * @route POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Authenticate user
    const user = await loginUser(email, password);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email
    });

    // Create session with refresh token
    const session = await createSession(user.id);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.status(200).json({
      message: 'Login successful',
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Refresh access token using refresh token
 * @route POST /api/auth/refresh
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const session = await findValidSession(refreshToken);

    if (!session) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: session.User.id,
      email: session.User.email
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: session.User.id,
        email: session.User.email,
        name: session.User.name
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle user logout
 * @route POST /api/auth/logout
 */
export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await invalidateSession(refreshToken);
    }

    res.clearCookie('refreshToken');

    return res.status(200).json({ message: 'Logout successful' });

  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Handle logout from all devices
 * @route POST /api/auth/logout-all
 */
export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    // Get user ID from authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    await invalidateAllUserSessions(userId);
    res.clearCookie('refreshToken');

    return res.status(200).json({ message: 'Logged out from all devices' });

  } catch (error) {
    console.error('Logout all error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Get user profile
 * @route GET /api/auth/profile
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    // Get user ID from authenticated request (set by authenticateToken middleware)
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Fetch user from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        lastLogin: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id.toString(),
        email: user.email,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

