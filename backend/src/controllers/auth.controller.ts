import { Request, Response, NextFunction } from 'express';
import { createUser, findExistingUser } from '../services/auth.service';

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
