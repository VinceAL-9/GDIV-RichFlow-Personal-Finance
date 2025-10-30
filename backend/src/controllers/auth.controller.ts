import { Request, Response, NextFunction } from 'express';
import { createUser, findExistingUser, findUserByEmail } from '../services/auth.service';
import { comparePassword } from '../utils/password.utils';
import { generateToken, generateSessionExpiry } from '../utils/jwt.utils';
import prisma from '../config/database.config';
import { User } from '@prisma/client';

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

    // Find user by email
    const foundUser = await findUserByEmail(email);
    if (!foundUser) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Verify password
    const isValidPassword = await comparePassword(password, foundUser.password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    // Generate JWT token and session expiry
    const token = generateToken(foundUser.id);
    const expiresAt = generateSessionExpiry();

    try {
      // Create session record
      await prisma.session.create({
        data: {
          token,
          userId: foundUser.id,
          expiresAt,
          isValid: true
        }
      });

      // Update user's last login
      await prisma.user.update({
        where: { id: foundUser.id },
        data: { lastLogin: new Date() }
      });

      // Return success response with token and user info
      const safeUser = {
        id: foundUser.id,
        email: foundUser.email,
        name: foundUser.name
      };

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        expiresAt,
        user: safeUser
      });
    } catch (sessionError) {
      console.error('Session creation error:', sessionError);
      return res.status(500).json({
        error: 'Failed to complete login process'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
}