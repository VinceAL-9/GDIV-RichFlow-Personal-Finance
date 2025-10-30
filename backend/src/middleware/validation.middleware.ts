import { Request, Response, NextFunction } from 'express';
import {
  sanitizeString,
  sanitizeEmail,
  validateName,
  validateEmail,
  validatePassword
} from '../utils/validation.utils';

/**
 * Middleware to validate login request data
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;

    // Validate input presence
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Validation error occurred' });
  }
}

/**
 * Middleware to validate and sanitize signup request data
 */
export function validateSignup(req: Request, res: Response, next: NextFunction) {
  try {
    let { name, email, password } = req.body;

    // Validate input presence
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Name, email, and password are required'
      });
    }

    // Sanitize inputs
    name = sanitizeString(name);
    email = sanitizeEmail(email);

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      return res.status(400).json({ error: emailValidation.error });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ error: passwordValidation.error });
    }

    // Attach sanitized data back to request
    req.body.name = name;
    req.body.email = email;

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Validation error occurred'
    });
  }
}
